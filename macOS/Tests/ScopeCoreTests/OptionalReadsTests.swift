import Foundation
import XCTest
@testable import ScopeCore
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

private actor UnavailableActivityServer {
    private var contextReads = 0
    func count() -> Int { contextReads }
    func respond(_ request: URLRequest) async throws -> HTTPResult {
        let url = request.url!
        switch url.path {
        case "/health":
            return HTTPResult(data: Data(#"{"status":"healthy","engine_pool":{"model_count":1}}"#.utf8), status: 200, url: url)
        case "/v1/models/status":
            contextReads += 1
            return HTTPResult(data: Data(#"{"models":[{"id":"fixture","max_context_window":32768}]}"#.utf8), status: 200, url: url)
        default:
            if url.path == "/admin/api/activity" { try await Task.sleep(for: .milliseconds(20)) }
            throw ConnectionError.unreachable
        }
    }
}

final class OptionalReadsTests: XCTestCase {
    func testActivityFailureDoesNotRepeatOptionalContextReadsWithinTheMinute() async throws {
        let server = UnavailableActivityServer()
        let client = OmlxClient(transport: { try await server.respond($0) }, clock: { 100 })
        let connection = Connection(endpoint: try Endpoint("http://127.0.0.1:8000"), apiKey: "")
        let first = await client.snapshot(connection: connection)
        let second = await client.snapshot(connection: connection)
        XCTAssertEqual(first.phase, .offline)
        XCTAssertEqual(second.phase, .offline)
        let count = await server.count()
        XCTAssertEqual(count, 1)
        _ = await client.snapshot(connection: Connection(endpoint: try Endpoint("http://127.0.0.1:8123"), apiKey: ""))
        let changed = await server.count()
        XCTAssertEqual(changed, 2, "A different server must have an independent context lookup")
    }
}
