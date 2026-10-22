import Foundation
import CryptoKit
import Security

struct VerifiedIdentity { let subject: String; let name: String; let email: String? }
enum Identity {
  static func verify(_ jwt: String, jwks: [String: Any], clientID: String, nonce: String, expectedSubject: String?, now: Double = Date().timeIntervalSince1970) throws -> VerifiedIdentity {
    let parts = jwt.split(separator: ".", omittingEmptySubsequences: false).map(String.init)
    try require(parts.count == 3 && jwt.count < 65536, "Ungültiges OpenAI-ID-Token.")
    let header = try jsonObject(unbase64url(parts[0])), claims = try jsonObject(unbase64url(parts[1]))
    guard let alg = header["alg"] as? String, ["RS256", "ES256"].contains(alg), let kid = header["kid"] as? String, !kid.isEmpty else { throw AuthFailure("Das OpenAI-ID-Token verwendet keine unterstützte Signatur.") }
    try require(header["crit"] == nil && header["b64"] == nil, "Nicht unterstütztes ID-Token-Format.")
    let keys = (jwks["keys"] as? [[String: Any]] ?? []).filter { $0["kid"] as? String == kid && ($0["alg"] == nil || $0["alg"] as? String == alg) && ($0["use"] == nil || $0["use"] as? String == "sig") && ($0["key_ops"] == nil || ($0["key_ops"] as? [String])?.contains("verify") == true) }
    try require(keys.count == 1, "OpenAI-Signaturschlüssel fehlt oder ist nicht eindeutig. Bitte erneut anmelden.")
    let key = keys[0], signature = try unbase64url(parts[2]), message = Data("\(parts[0]).\(parts[1])".utf8)
    if alg == "ES256" {
      guard key["kty"] as? String == "EC", key["crv"] as? String == "P-256", let x = key["x"] as? String, let y = key["y"] as? String else { throw AuthFailure("Ungültiger OpenAI-Signaturschlüssel.") }
      let xData = try unbase64url(x), yData = try unbase64url(y)
      try require(xData.count == 32 && yData.count == 32, "Ungültiger OpenAI-Signaturschlüssel.")
      let publicKey = try P256.Signing.PublicKey(x963Representation: Data([4]) + xData + yData)
      let sig = try P256.Signing.ECDSASignature(rawRepresentation: signature)
      try require(publicKey.isValidSignature(sig, for: message), "Die OpenAI-Signatur ist ungültig.")
    } else {
      guard key["kty"] as? String == "RSA", let n = key["n"] as? String, let e = key["e"] as? String else { throw AuthFailure("Ungültiger OpenAI-Signaturschlüssel.") }
      let modulus = try unbase64url(n), exponent = try unbase64url(e)
      try require(modulus.count >= 256 && modulus.count <= 1024 && exponent.count <= 8, "Unsicherer OpenAI-Signaturschlüssel.")
      let der = sequence(integer(modulus) + integer(exponent))
      var error: Unmanaged<CFError>?
      guard let publicKey = SecKeyCreateWithData(der as CFData, [kSecAttrKeyType: kSecAttrKeyTypeRSA, kSecAttrKeyClass: kSecAttrKeyClassPublic] as CFDictionary, &error) else { throw AuthFailure("OpenAI-Signaturschlüssel konnte nicht geladen werden.") }
      try require(SecKeyVerifySignature(publicKey, .rsaSignatureMessagePKCS1v15SHA256, message as CFData, signature as CFData, &error), "Die OpenAI-Signatur ist ungültig.")
    }
    try require(claims["iss"] as? String == "https://auth.openai.com", "Unerwarteter OpenAI-Aussteller.")
    let audience = (claims["aud"] as? String).map { [$0] } ?? claims["aud"] as? [String] ?? []
    try require(audience.contains(clientID) && (audience.count == 1 || claims["azp"] as? String == clientID), "Das ID-Token gehört nicht zu SpendLens.")
    if let azp = claims["azp"] { try require(azp as? String == clientID, "Unerwarteter OAuth-Client.") }
    guard let exp = numeric(claims["exp"]), let iat = numeric(claims["iat"]) else { throw AuthFailure("Zeitangaben im ID-Token fehlen.") }
    try require(exp > now - 30 && iat <= now + 60 && exp > iat, "Das ID-Token ist abgelaufen oder noch nicht gültig.")
    if claims["nbf"] != nil { guard let nbf = numeric(claims["nbf"]) else { throw AuthFailure("Ungültige Token-Zeitangabe.") }; try require(nbf <= now + 60, "Das ID-Token ist noch nicht gültig.") }
    try require(constantEqual(claims["nonce"] as? String ?? "", nonce), "Die Anmeldung gehört nicht zu diesem Anmeldeversuch.")
    guard let sub = claims["sub"] as? String, !sub.isEmpty, sub.count <= 512 else { throw AuthFailure("Die OpenAI-Identität fehlt.") }
    if let expectedSubject { try require(constantEqual(sub, expectedSubject), "Das gewählte Konto stimmt nicht mit der gespeicherten Registrierung überein. Bitte ‚Anderes Konto‘ verwenden.") }
    let name = (claims["name"] as? String).map { String($0.prefix(200)) } ?? "Dein ChatGPT-Konto"
    let email = (claims["email"] as? String).map { String($0.prefix(320)) }
    return VerifiedIdentity(subject: sub, name: name, email: email)
  }
  private static func length(_ n: Int) -> Data {
    if n < 128 { return Data([UInt8(n)]) }
    var bytes: [UInt8] = []; var remaining = n
    while remaining > 0 { bytes.insert(UInt8(remaining & 255), at: 0); remaining >>= 8 }
    return Data([0x80 | UInt8(bytes.count)] + bytes)
  }
  private static func integer(_ data: Data) -> Data {
    var bytes = data
    while bytes.count > 1 && bytes.first == 0 { bytes.removeFirst() }
    if (bytes.first ?? 0) & 0x80 != 0 { bytes.insert(0, at: 0) }
    return Data([2]) + length(bytes.count) + bytes
  }
  private static func sequence(_ data: Data) -> Data { Data([0x30]) + length(data.count) + data }
}
