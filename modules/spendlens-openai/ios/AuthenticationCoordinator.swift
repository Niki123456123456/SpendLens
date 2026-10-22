import Foundation
import AuthenticationServices
import UIKit

@MainActor
final class AuthenticationCoordinator: NSObject, ASWebAuthenticationPresentationContextProviding {
  private var browser: ASWebAuthenticationSession?
  private var listener: LoopbackCallback?
  private var pending: CheckedContinuation<URL?, Error>?
  private var timeout: Task<Void, Never>?
  private var active = false
  private var anchor: ASPresentationAnchor?

  func signIn(client: OpenAIClient, newAccount: Bool) async throws -> String? {
    try require(!active, "Eine ChatGPT-Anmeldung läuft bereits.")
    guard let window = UIApplication.shared.connectedScenes.compactMap({ $0 as? UIWindowScene }).filter({ $0.activationState == .foregroundActive }).flatMap({ $0.windows }).first(where: { $0.isKeyWindow }) else { throw AuthFailure("SpendLens muss zum Anmelden im Vordergrund sein.") }
    active = true; anchor = window
    defer { active = false; anchor = nil; timeout?.cancel(); timeout = nil; listener?.stop(); listener = nil; browser = nil }
    var attempt = try await client.prepare(newAccount: newAccount)
    try Task.checkCancellation()
    let callback = LoopbackCallback(state: attempt.state, completion: attempt.completion)
    listener = callback
    let port = try await callback.start()
    try Task.checkCancellation()
    attempt.redirectURI = "http://127.0.0.1:\(port)/auth/callback"
    let url = try attempt.authorizationURL()
    let returned = try await withTaskCancellationHandler {
      try await withCheckedThrowingContinuation { continuation in
        pending = continuation
        let session = ASWebAuthenticationSession(url: url, callbackURLScheme: "spendlens") { [weak self] callbackURL, error in
          Task { @MainActor in
            guard let self else { return }
            self.timeout?.cancel()
            if let error {
              let ns = error as NSError
              if ns.domain == ASWebAuthenticationSessionError.errorDomain && ns.code == ASWebAuthenticationSessionError.canceledLogin.rawValue { self.complete(nil) }
              else { self.complete(error: AuthFailure("Das Anmeldefenster konnte nicht abgeschlossen werden. Bitte erneut versuchen.")) }
            } else { self.complete(callbackURL) }
          }
        }
        session.presentationContextProvider = self
        session.prefersEphemeralWebBrowserSession = false
        browser = session
        if !session.start() { complete(error: AuthFailure("Das sichere Anmeldefenster konnte nicht gestartet werden.")); return }
        timeout = Task { [weak self] in
          do { try await Task.sleep(nanoseconds: 600_000_000_000) } catch { return }
          guard let self else { return }
          self.browser?.cancel(); self.complete(error: AuthFailure("Die Anmeldung ist abgelaufen. Bitte erneut versuchen."))
        }
      }
    } onCancel: { Task { @MainActor [weak self] in self?.cancel() } }
    guard let returned else { return nil }
    guard let components = URLComponents(url: returned, resolvingAgainstBaseURL: false), components.scheme == "spendlens", components.host == "auth-return", components.path.isEmpty,
      components.queryItems?.count == 1, let value = components.queryItems?.first(where: { $0.name == "completion" })?.value, constantEqual(value, attempt.completion) else { throw AuthFailure("Der Anmelde-Rücksprung konnte nicht verifiziert werden.") }
    let values = try await callback.callback()
    callback.stop(); listener = nil
    try Task.checkCancellation()
    return try await client.finish(attempt, callback: values)
  }
  func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor { anchor ?? ASPresentationAnchor() }
  private func complete(_ result: URL?) { let continuation = pending; pending = nil; continuation?.resume(returning: result) }
  private func complete(error: Error) { let continuation = pending; pending = nil; continuation?.resume(throwing: error) }
  func cancel() { browser?.cancel(); listener?.stop(); timeout?.cancel(); complete(nil) }
}
