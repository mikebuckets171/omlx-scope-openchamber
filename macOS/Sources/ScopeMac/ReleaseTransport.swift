import Foundation
import ScopeCore

/// Public release metadata only. Separate from the credentialed oMLX connection.
final class ReleaseTransport: @unchecked Sendable {
    private let delegate = RejectRedirects()
    private let session: URLSession
    init() {
        let config = URLSessionConfiguration.ephemeral
        config.httpShouldSetCookies = false
        config.httpCookieStorage = nil
        config.urlCache = nil
        config.timeoutIntervalForRequest = 8
        config.timeoutIntervalForResource = 12
        config.httpMaximumConnectionsPerHost = 1
        session = URLSession(configuration: config, delegate: delegate, delegateQueue: nil)
    }
    deinit { session.invalidateAndCancel() }
    func latest() async throws -> MacRelease {
        var request = URLRequest(url: ReleaseCatalog.apiURL)
        request.setValue("application/vnd.github+json", forHTTPHeaderField: "Accept")
        request.setValue("2022-11-28", forHTTPHeaderField: "X-GitHub-Api-Version")
        request.setValue("OMLX-Scope-Update-Check", forHTTPHeaderField: "User-Agent")
        do {
            let (bytes, response) = try await session.bytes(for: request)
            defer { bytes.task.cancel() }
            guard let http = response as? HTTPURLResponse, http.url == ReleaseCatalog.apiURL else { throw ReleaseError.invalidResponse }
            if http.statusCode == 403 || http.statusCode == 429 { throw ReleaseError.rateLimited }
            guard http.statusCode == 200, response.expectedContentLength <= ReleaseCatalog.maximumResponseBytes else {
                throw ReleaseError.invalidResponse
            }
            var data = Data()
            for try await byte in bytes {
                guard data.count < ReleaseCatalog.maximumResponseBytes else { throw ReleaseError.invalidResponse }
                data.append(byte)
            }
            return try ReleaseCatalog.newestMacRelease(in: data)
        } catch is CancellationError { throw CancellationError() }
        catch let error as ReleaseError { throw error }
        catch { throw ReleaseError.unreachable }
    }
}
