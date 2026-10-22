import Foundation
import CryptoKit
import Security

struct AuthFailure: LocalizedError {
  let message: String
  var errorDescription: String? { message }
  init(_ message: String) { self.message = message }
}
func require(_ condition: @autoclosure () -> Bool, _ message: String) throws {
  if !condition() { throw AuthFailure(message) }
}
func base64url(_ data: Data) -> String {
  data.base64EncodedString().replacingOccurrences(of: "+", with: "-").replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "=", with: "")
}
func unbase64url(_ text: String) throws -> Data {
  try require(!text.isEmpty && text.count < 131072 && text.allSatisfy { $0.isASCII && ($0.isLetter || $0.isNumber || $0 == "-" || $0 == "_") }, "Ungültige OAuth-Daten.")
  let b64 = text.replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
  guard let data = Data(base64Encoded: b64 + String(repeating: "=", count: (4 - b64.count % 4) % 4)) else { throw AuthFailure("Ungültige OAuth-Daten.") }
  return data
}
func randomValue() throws -> String {
  var bytes = [UInt8](repeating: 0, count: 32)
  try require(SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes) == errSecSuccess, "Sichere Zufallswerte konnten nicht erstellt werden.")
  return base64url(Data(bytes))
}
func hashHex(_ text: String) -> String { SHA256.hash(data: Data(text.utf8)).map { String(format: "%02x", $0) }.joined() }
func challenge(_ verifier: String) -> String { base64url(Data(SHA256.hash(data: Data(verifier.utf8)))) }
func constantEqual(_ a: String, _ b: String) -> Bool {
  let x = Array(a.utf8), y = Array(b.utf8)
  guard x.count == y.count else { return false }
  return zip(x, y).reduce(UInt8(0)) { $0 | ($1.0 ^ $1.1) } == 0
}
func jsonObject(_ data: Data) throws -> [String: Any] {
  guard let object = try JSONSerialization.jsonObject(with: data) as? [String: Any] else { throw AuthFailure("Ungültige Antwort von OpenAI.") }
  return object
}
func jsonString(_ value: Any) throws -> String {
  String(decoding: try JSONSerialization.data(withJSONObject: value, options: [.sortedKeys]), as: UTF8.self)
}
func numeric(_ value: Any?) -> Double? {
  guard let value = value as? NSNumber, CFGetTypeID(value) != CFBooleanGetTypeID() else { return nil }
  let number = value.doubleValue
  return number.isFinite ? number : nil
}

protocol VaultStorage { func read() throws -> Data?; func write(_ data: Data) throws }
struct KeychainStorage: VaultStorage {
  private let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: "app.spendlens.openai", kSecAttrAccount as String: "direct-oauth-v1"]
  func read() throws -> Data? {
    var request = query; request[kSecReturnData as String] = true; request[kSecMatchLimit as String] = kSecMatchLimitOne
    var result: CFTypeRef?
    let status = SecItemCopyMatching(request as CFDictionary, &result)
    if status == errSecItemNotFound { return nil }
    try require(status == errSecSuccess, "Der iPhone-Schlüsselbund ist gerade nicht verfügbar. Bitte Gerät entsperren.")
    return result as? Data
  }
  func write(_ data: Data) throws {
    let fields: [String: Any] = [kSecValueData as String: data, kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly]
    let status = SecItemUpdate(query as CFDictionary, fields as CFDictionary)
    if status == errSecItemNotFound {
      try require(SecItemAdd(query.merging(fields) { _, new in new } as CFDictionary, nil) == errSecSuccess, "Die ChatGPT-Verbindung konnte nicht sicher gespeichert werden.")
    } else { try require(status == errSecSuccess, "Die ChatGPT-Verbindung konnte nicht sicher gespeichert werden.") }
  }
}
struct Registration: Codable { var clientID: String; var subject: String? }
struct Credentials: Codable {
  var clientID: String; var subject: String; var name: String; var email: String?
  var idToken: String; var accessToken: String; var refreshToken: String?
  var expiresAt: Double; var earliestRefreshAt: Double?; var scopes: [String]; var model: String?
  var userID: String { hashHex("https://auth.openai.com|\(clientID)|\(subject)") }
  func publicSession() -> [String: Any] {
    var user: [String: Any] = ["id": userID, "name": name]
    if let email { user["email"] = email }
    var result: [String: Any] = ["transport": "ios-direct", "token": "", "user": user, "planEnabled": scopes.contains("chatgpt.tokens.use.direct")]
    if let model { result["model"] = model }
    return result
  }
}
struct Vault: Codable {
  var hostID = "urn:uuid:\(UUID().uuidString.lowercased())"
  var registrations: [Registration] = []
  var selectedClientID: String?
  var pendingClientID: String?
  var credentials: Credentials?
}
struct Discovery {
  let issuer: String; let authorization: URL; let token: URL; let jwks: URL
  init(_ data: [String: Any]) throws {
    try require(data["issuer"] as? String == "https://auth.openai.com", "Unerwarteter OpenAI-Aussteller.")
    func endpoint(_ key: String) throws -> URL {
      guard let string = data[key] as? String, let url = URL(string: string), url.scheme == "https", url.host == "auth.openai.com", url.port == nil, url.user == nil, url.password == nil, url.fragment == nil else { throw AuthFailure("Ungültige OpenAI-Anmeldekonfiguration.") }
      return url
    }
    issuer = "https://auth.openai.com"; authorization = try endpoint("authorization_endpoint"); token = try endpoint("token_endpoint"); jwks = try endpoint("jwks_uri")
  }
}
struct AuthAttempt {
  let generation: Int
  let state: String; let nonce: String; let verifier: String; let completion: String
  let clientID: String; let expectedSubject: String?; let hostID: String; let createdAt: Date
  let discovery: Discovery; var redirectURI = ""
  func authorizationURL() throws -> URL {
    guard let redirect = URLComponents(string: redirectURI), redirect.scheme == "http", redirect.host == "127.0.0.1", redirect.port != nil, redirect.path == "/auth/callback" else { throw AuthFailure("Ungültiger lokaler Rücksprung.") }
    var url = URLComponents(url: discovery.authorization, resolvingAgainstBaseURL: false)!
    var params = ["client_id": clientID, "response_type": "code", "redirect_uri": redirectURI,
      "scope": "openid profile email offline_access resource.invoke chatgpt.tokens.use.direct",
      "resource": "https://api.openai.com/v1", "ext_agent_host_id": hostID,
      "state": state, "nonce": nonce, "code_challenge": challenge(verifier), "code_challenge_method": "S256"]
    if clientID == "dynamic_agent_client" { params["agent_name_hint"] = "SpendLens" }
    url.queryItems = params.sorted { $0.key < $1.key }.map { URLQueryItem(name: $0.key, value: $0.value) }
    return url.url!
  }
}
