import Foundation
import Network

struct CallbackValidator {
  static func parse(_ header: String, state: String, port: UInt16) throws -> [String: String] {
    let lines = header.components(separatedBy: "\r\n")
    let request = (lines.first ?? "").split(separator: " ").map(String.init)
    try require(request.count == 3 && request[0] == "GET" && request[1].hasPrefix("/auth/callback?") && ["HTTP/1.0", "HTTP/1.1"].contains(request[2]), "Ungültiger lokaler Callback.")
    let hosts = lines.dropFirst().filter { $0.lowercased().hasPrefix("host:") }
    try require(hosts.count == 1 && hosts[0].dropFirst(5).trimmingCharacters(in: .whitespaces) == "127.0.0.1:\(port)", "Unerwarteter lokaler Host.")
    guard let url = URLComponents(string: "http://127.0.0.1:\(port)\(request[1])"), url.path == "/auth/callback", url.fragment == nil else { throw AuthFailure("Ungültiger lokaler Callback.") }
    var values: [String: String] = [:]
    for item in url.queryItems ?? [] {
      try require(values[item.name] == nil && item.value != nil, "Doppelte oder unvollständige OAuth-Parameter.")
      values[item.name] = item.value
    }
    try require(constantEqual(values["state"] ?? "", state), "Unerwarteter Anmeldeversuch.")
    try require(values["error"] != nil || !(values["code"] ?? "").isEmpty, "Der Anmeldecode fehlt.")
    return values
  }
}
// All mutable state is confined to the private serial queue.
final class LoopbackCallback: @unchecked Sendable {
  private let queue = DispatchQueue(label: "app.spendlens.oauth.loopback")
  private let expectedState: String, completion: String
  private var listener: NWListener?
  private var connections: [UUID: NWConnection] = [:]
  private var received: [String: String]?
  private var starting: CheckedContinuation<UInt16, Error>?
  private var port: UInt16 = 0
  init(state: String, completion: String) { expectedState = state; self.completion = completion }
  func start() async throws -> UInt16 {
    try await withCheckedThrowingContinuation { continuation in
      queue.async {
        do {
          let parameters = NWParameters.tcp
          parameters.requiredLocalEndpoint = .hostPort(host: .ipv4(.loopback), port: .any)
          parameters.allowLocalEndpointReuse = false
          let listener = try NWListener(using: parameters)
          self.listener = listener; self.starting = continuation
          listener.newConnectionHandler = { [weak self] connection in self?.accept(connection) }
          listener.stateUpdateHandler = { [weak self] state in
            guard let self else { return }
            switch state {
            case .ready:
              guard let selected = listener.port?.rawValue else { self.failStart(); return }
              self.port = selected; self.starting?.resume(returning: selected); self.starting = nil
            case .failed, .cancelled: self.failStart()
            default: break
            }
          }
          listener.start(queue: self.queue)
          self.queue.asyncAfter(deadline: .now() + 5) {
            if self.starting != nil { self.failStart(); self.listener?.cancel() }
          }
        } catch { continuation.resume(throwing: AuthFailure("Der lokale Anmelde-Listener konnte nicht gestartet werden.")) }
      }
    }
  }
  private func failStart() {
    starting?.resume(throwing: AuthFailure("Der lokale Anmelde-Listener konnte nicht gestartet werden.")); starting = nil
  }
  private func accept(_ connection: NWConnection) {
    guard connections.count < 16 else { connection.cancel(); return }
    let id = UUID(); connections[id] = connection; connection.start(queue: queue)
    queue.asyncAfter(deadline: .now() + 5) { [weak self, weak connection] in connection?.cancel(); self?.connections.removeValue(forKey: id) }
    read(connection, id: id, accumulated: Data())
  }
  private func read(_ connection: NWConnection, id: UUID, accumulated: Data) {
    connection.receive(minimumIncompleteLength: 1, maximumLength: 4096) { [weak self] data, _, done, error in
      guard let self else { connection.cancel(); return }
      let buffer = accumulated + (data ?? Data())
      if buffer.count > 8192 || error != nil { self.respond(connection, id: id, status: "400 Bad Request"); return }
      if let boundary = buffer.range(of: Data("\r\n\r\n".utf8)), let header = String(data: buffer[..<boundary.lowerBound], encoding: .utf8) {
        do {
          try require(self.received == nil, "Dieser Anmeldeversuch wurde bereits verwendet.")
          let values = try CallbackValidator.parse(header, state: self.expectedState, port: self.port)
          self.received = values
          var back = URLComponents(); back.scheme = "spendlens"; back.host = "auth-return"
          back.queryItems = [URLQueryItem(name: "completion", value: self.completion)]
          self.respond(connection, id: id, status: "302 Found", location: back.url!.absoluteString)
        } catch { self.respond(connection, id: id, status: "400 Bad Request") }
      } else if done { self.respond(connection, id: id, status: "400 Bad Request") }
      else { self.read(connection, id: id, accumulated: buffer) }
    }
  }
  private func respond(_ connection: NWConnection, id: UUID, status: String, location: String? = nil) {
    var headers = "HTTP/1.1 \(status)\r\nCache-Control: no-store\r\nReferrer-Policy: no-referrer\r\nContent-Length: 0\r\nConnection: close\r\n"
    if let location { headers += "Location: \(location)\r\n" }
    connection.send(content: Data((headers + "\r\n").utf8), completion: .contentProcessed { [weak self] _ in connection.cancel(); self?.connections.removeValue(forKey: id) })
  }
  func callback() async throws -> [String: String] {
    try await withCheckedThrowingContinuation { continuation in
      queue.async {
        if let received = self.received { continuation.resume(returning: received) }
        else { continuation.resume(throwing: AuthFailure("Der lokale OpenAI-Callback wurde nicht empfangen.")) }
      }
    }
  }
  func stop() {
    queue.async {
      self.listener?.stateUpdateHandler = nil; self.listener?.cancel(); self.listener = nil
      self.failStart(); self.connections.values.forEach { $0.cancel() }; self.connections.removeAll(); self.received = nil
    }
  }
}
