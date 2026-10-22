import XCTest
import CryptoKit
import Security
@testable import SpendLensAuthCore

final class MemoryVault: VaultStorage {
  var data: Data?
  func read() throws -> Data? { data }
  func write(_ data: Data) throws { self.data = data }
}
final class FakeHTTP: OpenAITransport {
  var handler: (URLRequest) throws -> [String: Any] = { _ in [:] }
  var completionHandler: (URLRequest) throws -> String = { _ in "{}" }
  func json(_ request: URLRequest) async throws -> [String: Any] { try handler(request) }
  func completion(_ request: URLRequest) async throws -> String { try completionHandler(request) }
}
final class AuthCoreTests: XCTestCase {
  let key = P256.Signing.PrivateKey()
  let clientID = "oaiapp_spendlens_test"
  let discovery: [String: Any] = ["issuer": "https://auth.openai.com", "authorization_endpoint": "https://auth.openai.com/api/accounts/authorize", "token_endpoint": "https://auth.openai.com/api/accounts/oauth/token", "jwks_uri": "https://auth.openai.com/.well-known/jwks.json"]
  func keys() -> [String: Any] {
    let bytes = key.publicKey.x963Representation
    return ["keys": [["kid": "test", "kty": "EC", "crv": "P-256", "alg": "ES256", "use": "sig", "x": base64url(bytes.subdata(in: 1..<33)), "y": base64url(bytes.subdata(in: 33..<65))]]]
  }
  func claims(nonce: String = "nonce") -> [String: Any] {
    let now = Date().timeIntervalSince1970
    return ["iss": "https://auth.openai.com", "aud": clientID, "sub": "user-one", "name": "Test User", "nonce": nonce, "exp": now + 3600, "iat": now - 10]
  }
  func token(_ claims: [String: Any], alg: String = "ES256") throws -> String {
    let header = base64url(try JSONSerialization.data(withJSONObject: ["alg": alg, "kid": "test"]))
    let payload = base64url(try JSONSerialization.data(withJSONObject: claims)), message = "\(header).\(payload)"
    return message + "." + base64url(try key.signature(for: Data(message.utf8)).rawRepresentation)
  }
  func testPKCEUsesRFC7636Vector() throws {
    XCTAssertEqual(challenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"), "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM")
    XCTAssertTrue(constantEqual("same", "same")); XCTAssertFalse(constantEqual("same", "samex")); XCTAssertFalse(constantEqual("same", "samb"))
  }
  func testIdentityChecksSignatureNonceIssuerAudienceExpiryAndSubject() throws {
    let good = claims(), jwt = try token(good)
    XCTAssertEqual(try Identity.verify(jwt, jwks: keys(), clientID: clientID, nonce: "nonce", expectedSubject: nil).subject, "user-one")
    XCTAssertThrowsError(try Identity.verify(jwt, jwks: keys(), clientID: clientID, nonce: "wrong", expectedSubject: nil))
    XCTAssertThrowsError(try Identity.verify(jwt, jwks: keys(), clientID: clientID, nonce: "nonce", expectedSubject: "other-user"))
    for (field, value) in [("iss", "https://attacker.example" as Any), ("aud", "another-client" as Any), ("exp", 1 as Any), ("iat", Date().timeIntervalSince1970 + 10000 as Any), ("nbf", Date().timeIntervalSince1970 + 10000 as Any), ("exp", true as Any)] {
      var bad = good; bad[field] = value
      XCTAssertThrowsError(try Identity.verify(token(bad), jwks: keys(), clientID: clientID, nonce: "nonce", expectedSubject: nil))
    }
    var multi = good; multi["aud"] = [clientID, "another-client"]
    XCTAssertThrowsError(try Identity.verify(token(multi), jwks: keys(), clientID: clientID, nonce: "nonce", expectedSubject: nil))
    multi["azp"] = clientID
    XCTAssertNoThrow(try Identity.verify(token(multi), jwks: keys(), clientID: clientID, nonce: "nonce", expectedSubject: nil))
    XCTAssertThrowsError(try Identity.verify(token(good, alg: "none"), jwks: keys(), clientID: clientID, nonce: "nonce", expectedSubject: nil))
    let other = AuthCoreTests()
    XCTAssertThrowsError(try Identity.verify(jwt, jwks: other.keys(), clientID: clientID, nonce: "nonce", expectedSubject: nil))
  }
  func testDiscoveryRejectsRemoteKeysAndWrongIssuer() throws {
    XCTAssertNoThrow(try Discovery(discovery))
    for field in ["issuer", "authorization_endpoint", "token_endpoint", "jwks_uri"] {
      var malicious = discovery; malicious[field] = "https://attacker.example/path"
      XCTAssertThrowsError(try Discovery(malicious))
    }
  }
  func testCallbackRejectsForgeryDuplicateStateHostAndUnexpectedMethods() throws {
    let valid = "GET /auth/callback?code=code&state=expected&client_id=issued HTTP/1.1\r\nHost: 127.0.0.1:4567"
    XCTAssertEqual(try CallbackValidator.parse(valid, state: "expected", port: 4567)["code"], "code")
    for bad in [valid.replacingOccurrences(of: "expected", with: "wrong"), valid.replacingOccurrences(of: "&state=expected", with: "&state=expected&state=expected"), valid.replacingOccurrences(of: "Host: 127.0.0.1", with: "Host: attacker.example"), valid.replacingOccurrences(of: "GET ", with: "POST "), valid.replacingOccurrences(of: "/auth/callback?", with: "/wrong?")] {
      XCTAssertThrowsError(try CallbackValidator.parse(bad, state: "expected", port: 4567))
    }
  }
  func testSSEOnlyReturnsCompletedResultsAndHandlesUTF8AndCRLF() throws {
    let delta = "data: {\"type\":\"response.output_text.delta\",\"delta\":\"Äpfel\"}\r\n\r\n"
    var parser = SSECompletion()
    for byte in (delta + "data: {\"type\":\"response.completed\"}\r\n\r\n").utf8 { try parser.push(byte) }
    XCTAssertEqual(try parser.finish(), "Äpfel")
    var incomplete = SSECompletion(); for byte in delta.utf8 { try incomplete.push(byte) }
    XCTAssertThrowsError(try incomplete.finish())
    var failed = SSECompletion()
    XCTAssertThrowsError(try (delta + "data: {\"type\":\"response.failed\"}\n\n").utf8.forEach { try failed.push($0) })
  }
  func testDirectLoginStoresIssuedClientBeforeExchangeAndNeverExposesTokens() async throws {
    let storage = MemoryVault(), http = FakeHTTP(), engine = try OpenAIClient(storage: storage, http: http)
    http.handler = { _ in self.discovery }
    var attempt = try await engine.prepare(newAccount: false)
    attempt.redirectURI = "http://127.0.0.1:4567/auth/callback"
    let url = try attempt.authorizationURL(), query = URLComponents(url: url, resolvingAgainstBaseURL: false)!.queryItems!
    XCTAssertTrue(query.contains { $0.name == "client_id" && $0.value == "dynamic_agent_client" })
    XCTAssertTrue(query.contains { $0.name == "code_challenge" && $0.value == challenge(attempt.verifier) })
    let idToken = try token(claims(nonce: attempt.nonce))
    http.handler = { request in
      if request.url!.path.contains("oauth/token") {
        let vault = try JSONDecoder().decode(Vault.self, from: storage.data!)
        XCTAssertEqual(vault.pendingClientID, self.clientID); XCTAssertNil(vault.credentials)
        let body = String(decoding: request.httpBody!, as: UTF8.self)
        XCTAssertTrue(body.contains("code_verifier=")); XCTAssertTrue(body.contains("resource=https%3A%2F%2Fapi.openai.com%2Fv1")); XCTAssertFalse(body.contains("client_secret"))
        return ["access_token": "private-access", "refresh_token": "private-refresh", "id_token": idToken, "expires_in": 3600, "scope": "openid chatgpt.tokens.use.direct", "token_type": "Bearer"]
      }
      return self.keys()
    }
    let session = try await engine.finish(attempt, callback: ["code": "one-time-code", "state": attempt.state, "client_id": clientID])
    XCTAssertTrue(session.contains("ios-direct")); XCTAssertFalse(session.contains("private-access")); XCTAssertFalse(session.contains("private-refresh")); XCTAssertFalse(session.contains(idToken))
    XCTAssertTrue(try jsonObject(Data(session.utf8))["planEnabled"] as? Bool == true)
    let before = try JSONDecoder().decode(Vault.self, from: storage.data!)
    try await engine.logout()
    let signedOut = try await engine.publicSession(); XCTAssertNil(signedOut)
    let after = try JSONDecoder().decode(Vault.self, from: storage.data!)
    XCTAssertEqual(before.hostID, after.hostID); XCTAssertEqual(after.selectedClientID, clientID); XCTAssertNil(after.credentials)
    let returning = try await engine.prepare(newAccount: false)
    XCTAssertEqual(returning.clientID, clientID); XCTAssertEqual(returning.expectedSubject, "user-one")
    let adding = try await engine.prepare(newAccount: true); XCTAssertEqual(adding.clientID, "dynamic_agent_client")
  }
  func testFailedOrForgedLoginDoesNotReplaceExistingAccount() async throws {
    let storage = MemoryVault(), http = FakeHTTP()
    var vault = Vault(); vault.credentials = Credentials(clientID: clientID, subject: "original", name: "Original", idToken: "original-id", accessToken: "original-access", expiresAt: Date().timeIntervalSince1970 + 3000, scopes: [])
    try storage.write(JSONEncoder().encode(vault))
    let engine = try OpenAIClient(storage: storage, http: http); http.handler = { _ in self.discovery }
    var attempt = try await engine.prepare(newAccount: true); attempt.redirectURI = "http://127.0.0.1:4567/auth/callback"
    do { _ = try await engine.finish(attempt, callback: ["state": "wrong", "code": "code", "client_id": clientID]); XCTFail("forged state accepted") } catch {}
    XCTAssertEqual(try JSONDecoder().decode(Vault.self, from: storage.data!).credentials?.subject, "original")
  }
  func testLogoutInvalidatesAnAlreadyOpenedLoginBeforeTokenExchange() async throws {
    let storage = MemoryVault(), http = FakeHTTP(), engine = try OpenAIClient(storage: storage, http: http)
    http.handler = { _ in self.discovery }
    let attempt = try await engine.prepare(newAccount: false)
    try await engine.logout()
    http.handler = { _ in XCTFail("Cancelled login contacted OpenAI"); return [:] }
    do {
      _ = try await engine.finish(attempt, callback: ["state": attempt.state, "code": "code", "client_id": clientID])
      XCTFail("Cancelled login restored credentials")
    } catch {}
    let session = try await engine.publicSession(); XCTAssertNil(session)
    XCTAssertNil(try JSONDecoder().decode(Vault.self, from: storage.data!).pendingClientID)
  }
  func testLoopbackRedirectUsesOnlyCompletionMarkerAndRejectsReplay() async throws {
    let listener = LoopbackCallback(state: "expected", completion: "marker"), port = try await listener.start()
    defer { listener.stop() }
    let session = URLSession(configuration: .ephemeral, delegate: NoRedirect(), delegateQueue: nil)
    defer { session.invalidateAndCancel() }
    let url = URL(string: "http://127.0.0.1:\(port)/auth/callback?state=expected&code=private-code&client_id=issued")!
    let (_, response) = try await session.data(from: url)
    let http = response as! HTTPURLResponse
    XCTAssertEqual(http.statusCode, 302)
    XCTAssertEqual(http.value(forHTTPHeaderField: "Location"), "spendlens://auth-return?completion=marker")
    let received = try await listener.callback(); XCTAssertEqual(received["code"], "private-code")
    let (_, replay) = try await session.data(from: url); XCTAssertEqual((replay as! HTTPURLResponse).statusCode, 400)
  }
  func testRealRSAJWKAndSignatureVerification() throws {
    var error: Unmanaged<CFError>?
    let privateKey = try XCTUnwrap(SecKeyCreateRandomKey([kSecAttrKeyType: kSecAttrKeyTypeRSA, kSecAttrKeySizeInBits: 2048] as CFDictionary, &error))
    let publicKey = try XCTUnwrap(SecKeyCopyPublicKey(privateKey))
    let external = try XCTUnwrap(SecKeyCopyExternalRepresentation(publicKey, &error)) as Data
    let bytes = Array(external); var index = 0
    func readLength() -> Int {
      let first = Int(bytes[index]); index += 1
      if first < 128 { return first }
      var result = 0
      for _ in 0..<(first & 127) { result = result * 256 + Int(bytes[index]); index += 1 }
      return result
    }
    func integer() -> Data {
      XCTAssertEqual(bytes[index], 2); index += 1
      let count = readLength(); var value = Data(bytes[index..<(index + count)]); index += count
      while value.count > 1 && value.first == 0 { value.removeFirst() }
      return value
    }
    XCTAssertEqual(bytes[index], 0x30); index += 1; _ = readLength()
    let n = integer(), e = integer()
    let header = base64url(try JSONSerialization.data(withJSONObject: ["alg": "RS256", "kid": "rsa-key"]))
    let payload = base64url(try JSONSerialization.data(withJSONObject: claims()))
    let message = Data("\(header).\(payload)".utf8)
    let signature = try XCTUnwrap(SecKeyCreateSignature(privateKey, .rsaSignatureMessagePKCS1v15SHA256, message as CFData, &error)) as Data
    let jwt = "\(header).\(payload).\(base64url(signature))"
    let jwks: [String: Any] = ["keys": [["kid": "rsa-key", "alg": "RS256", "kty": "RSA", "n": base64url(n), "e": base64url(e)]]]
    XCTAssertEqual(try Identity.verify(jwt, jwks: jwks, clientID: clientID, nonce: "nonce", expectedSubject: nil).subject, "user-one")
    var wrong = signature; wrong[0] ^= 1
    XCTAssertThrowsError(try Identity.verify("\(header).\(payload).\(base64url(wrong))", jwks: jwks, clientID: clientID, nonce: "nonce", expectedSubject: nil))
  }
  func testRefreshRotatesTokensAtomicallyAndInferenceGoesDirectlyToOpenAI() async throws {
    let storage = MemoryVault(), http = FakeHTTP()
    var vault = Vault()
    vault.credentials = Credentials(clientID: clientID, subject: "user", name: "User", idToken: "id", accessToken: "old-access", refreshToken: "old-refresh", expiresAt: 1, scopes: ["chatgpt.tokens.use.direct"])
    try storage.write(JSONEncoder().encode(vault))
    let engine = try OpenAIClient(storage: storage, http: http)
    var refreshes = 0
    http.handler = { request in
      XCTAssertTrue(["auth.openai.com", "api.openai.com"].contains(request.url!.host!))
      if request.url!.path == "/.well-known/openid-configuration" { return self.discovery }
      if request.url!.path.hasSuffix("oauth/token") {
        refreshes += 1
        XCTAssertTrue(String(decoding: request.httpBody!, as: UTF8.self).contains("refresh_token=old-refresh"))
        return ["access_token": "new-access", "refresh_token": "new-refresh", "expires_in": 3600]
      }
      XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), "Bearer new-access")
      return ["models": [["slug": "vision-model", "visibility": "list", "input_modalities": ["text", "image"]]]]
    }
    http.completionHandler = { request in
      XCTAssertEqual(request.url!.absoluteString, "https://api.openai.com/v1/responses")
      XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), "Bearer new-access")
      let body = try jsonObject(request.httpBody!)
      XCTAssertEqual(body["store"] as? Bool, false); XCTAssertEqual(body["stream"] as? Bool, true)
      XCTAssertEqual(body["model"] as? String, "vision-model")
      return "{}"
    }
    let expected = vault.credentials!.userID
    _ = try await engine.analyze(image: "data:image/jpeg;base64,AA==", schema: "{}", expectedUserID: expected)
    _ = try await engine.analyze(image: "data:image/jpeg;base64,AA==", schema: "{}", expectedUserID: expected)
    XCTAssertEqual(refreshes, 1)
    let saved = try JSONDecoder().decode(Vault.self, from: storage.data!).credentials!
    XCTAssertEqual(saved.accessToken, "new-access"); XCTAssertEqual(saved.refreshToken, "new-refresh")
    XCTAssertEqual(saved.scopes, ["chatgpt.tokens.use.direct"])
    do { _ = try await engine.analyze(image: "data:image/jpeg;base64,AA==", schema: "{}", expectedUserID: "wrong-account"); XCTFail("account mismatch accepted") } catch {}
  }
  func testMissingPlanPermissionDoesNotSendAnImage() async throws {
    let storage = MemoryVault(), http = FakeHTTP()
    var vault = Vault(); vault.credentials = Credentials(clientID: clientID, subject: "user", name: "User", idToken: "id", accessToken: "access", expiresAt: Date().timeIntervalSince1970 + 3000, scopes: ["openid"])
    try storage.write(JSONEncoder().encode(vault))
    let engine = try OpenAIClient(storage: storage, http: http)
    http.handler = { _ in XCTFail("permission denied but request sent"); return [:] }
    http.completionHandler = { _ in XCTFail("permission denied but image sent"); return "{}" }
    do { _ = try await engine.analyze(image: "data:image/jpeg;base64,AA==", schema: "{}"); XCTFail("missing permission accepted") } catch {}
  }

}
