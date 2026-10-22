import ExpoModulesCore

public final class SpendLensOpenAIModule: Module {
  @MainActor private var engine: OpenAIClient?
  @MainActor private var coordinator: AuthenticationCoordinator?
  @MainActor private var authTask: Task<Void, Never>?
  @MainActor private func client() throws -> OpenAIClient {
    if let engine { return engine }
    let client = try OpenAIClient(); engine = client; return client
  }
  public func definition() -> ModuleDefinition {
    Name("SpendLensOpenAI")
    AsyncFunction("getSession") { () async throws -> String? in
      let client = try await self.client(); return try await client.publicSession()
    }
    AsyncFunction("signIn") { (newAccount: Bool, promise: Promise) in
      Task { @MainActor in
        guard self.authTask == nil else { promise.reject("E_OPENAI_BUSY", "Eine ChatGPT-Anmeldung läuft bereits."); return }
        self.authTask = Task { @MainActor in
          defer { self.authTask = nil }
          do {
            let client = try self.client()
            if self.coordinator == nil { self.coordinator = AuthenticationCoordinator() }
            promise.resolve(try await self.coordinator!.signIn(client: client, newAccount: newAccount))
          } catch is CancellationError { promise.resolve(nil) }
          catch { promise.reject("E_OPENAI_SIGN_IN", self.message(error)) }
        }
      }
    }.runOnQueue(.main)
    AsyncFunction("signOut") { () async throws in
      let client = try await MainActor.run {
        self.authTask?.cancel(); self.coordinator?.cancel()
        return try self.client()
      }
      try await client.logout()
    }
    AsyncFunction("analyzeReceipt") { (image: String, schema: String, expectedUserID: String) async throws -> String in
      let client = try await self.client(); return try await client.analyze(image: image, schema: schema, expectedUserID: expectedUserID)
    }
    AsyncFunction("cancelSignIn") {
      Task { @MainActor in self.authTask?.cancel(); self.coordinator?.cancel() }
    }.runOnQueue(.main)
    OnDestroy { Task { @MainActor in self.authTask?.cancel(); self.coordinator?.cancel() } }
  }
  private func message(_ error: Error) -> String {
    if let failure = error as? AuthFailure { return failure.message }
    if error is URLError { return "OpenAI ist nicht erreichbar. Bitte Internetverbindung prüfen und erneut versuchen." }
    return "Die ChatGPT-Anfrage konnte nicht abgeschlossen werden. Bitte erneut versuchen."
  }
}
