import Foundation

public struct Endpoint: Equatable, Sendable {
    public let url: URL
    public init(_ text: String) throws {
        let input = text.trimmingCharacters(in: .whitespacesAndNewlines)
        // Validate spelling before URL normalisation; no shorthand IPs, DNS, or redirects.
        guard input.range(of: #"^http://127\.0\.0\.1:[0-9]{1,5}(/v1/?)?/?$"#, options: .regularExpression) != nil,
              let parsed = URLComponents(string: input), let port = parsed.port,
              (1...65_535).contains(port), let origin = URL(string: "http://127.0.0.1:\(port)") else {
            throw ConnectionError.invalidEndpoint
        }
        url = origin
    }
    public func path(_ path: String) -> URL { URL(string: path, relativeTo: url)!.absoluteURL }
}

public enum ConnectionError: Error, LocalizedError, Sendable, Equatable {
    case invalidEndpoint, credentialRequired, unauthorized, unsafeResponse, oversized, malformed, unreachable
    public var errorDescription: String? {
        switch self {
        case .invalidEndpoint: "Use http://127.0.0.1:8000 or your local oMLX port."
        case .credentialRequired: "Add your oMLX API key in Connection settings."
        case .unauthorized: "oMLX requires a valid API key or rejected the supplied key. Check Connection settings."
        case .unsafeResponse: "The local server returned an unexpected response. Check the oMLX port."
        case .oversized: "The local response exceeded the monitoring size limit."
        case .malformed: "The server's monitoring format was not recognised. Check oMLX compatibility."
        case .unreachable: "oMLX is not responding. Host resources are still available."
        }
    }
}
