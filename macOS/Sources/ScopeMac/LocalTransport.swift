import Foundation
import ScopeCore

/// Reject redirects and bound response bytes before decoding. No cookie/disk cache.
final class RejectRedirects: NSObject, URLSessionTaskDelegate, @unchecked Sendable {
    func urlSession(_ session: URLSession, task: URLSessionTask,
                    willPerformHTTPRedirection response: HTTPURLResponse,
                    newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) {
        completionHandler(nil)
    }
}

final class LocalTransport: @unchecked Sendable {
    private let delegate = RejectRedirects()
    private let session: URLSession
    init() {
        let config = URLSessionConfiguration.ephemeral
        config.httpShouldSetCookies = false
        config.httpCookieStorage = nil
        config.urlCache = nil
        config.requestCachePolicy = .reloadIgnoringLocalCacheData
        config.timeoutIntervalForRequest = 3
        config.timeoutIntervalForResource = 4
        config.httpMaximumConnectionsPerHost = 2
        session = URLSession(configuration: config, delegate: delegate, delegateQueue: nil)
    }
    deinit { session.invalidateAndCancel() }
    func send(_ request: URLRequest) async throws -> HTTPResult {
        guard let url = request.url, url.scheme == "http", url.host == "127.0.0.1" else { throw ConnectionError.invalidEndpoint }
        let (bytes, response) = try await session.bytes(for: request)
        defer { bytes.task.cancel() }
        guard let http = response as? HTTPURLResponse, http.url == url else { throw ConnectionError.unsafeResponse }
        guard response.expectedContentLength <= 2_000_000 else { throw ConnectionError.oversized }
        var data = Data(); data.reserveCapacity(16_384)
        for try await byte in bytes {
            guard data.count < 2_000_000 else { throw ConnectionError.oversized }
            data.append(byte)
        }
        let header = http.value(forHTTPHeaderField: "Set-Cookie") ?? ""
        let regex = try NSRegularExpression(pattern: "(?:^|,\\s*)omlx_admin_session=([^;,]+)", options: .caseInsensitive)
        let match = regex.firstMatch(in: header, range: NSRange(header.startIndex..., in: header))
        let cookie = match.flatMap { Range($0.range(at: 1), in: header) }.map { String(header[$0]) }
        return HTTPResult(data: data, status: http.statusCode, url: url, sessionCookie: cookie)
    }
}
