import Foundation
import XCTest
@testable import ScopeCore
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

private final class TestClock: @unchecked Sendable {
    private let lock = NSLock()
    private var value: TimeInterval = 10
    func now() -> TimeInterval { lock.lock(); defer { lock.unlock() }; return value }
    func set(_ next: TimeInterval) { lock.lock(); defer { lock.unlock() }; value = next }
}

private actor DFlashServer {
    var count = 64
    var id = "private-a"
    var age = 0.1
    var fallback = false
    func advance(count: Int, id: String = "private-a", age: Double = 0.1, fallback: Bool = false) {
        self.count = count; self.id = id; self.age = age; self.fallback = fallback
    }
    func send(_ request: URLRequest) throws -> HTTPResult {
        let url = request.url!
        let body: [String: Any]
        switch url.path {
        case "/health": body = ["status":"healthy", "engine_pool":["model_count":1]]
        case "/v1/models/status": body = ["models":[]]
        case "/admin/api/activity", "/admin/api/stats":
            let model: [String: Any] = ["id":"fixture", "active_requests":1,
                "activities": fallback ? [] : [["kind":"generate", "request_id":id, "token_count":count, "elapsed_seconds":30, "last_activity_age_seconds":age]],
                "prefilling": fallback ? [["request_id":"fallback", "processed":25, "total":100, "speed":100, "eta":0.75]] : []]
            body = ["engines":[:], "active_models":["models":[model]]]
        default: throw ConnectionError.unsafeResponse
        }
        return HTTPResult(data: try JSONSerialization.data(withJSONObject: body), status: 200, url: url)
    }
}

final class DFlashClientTests: XCTestCase {
    func testPrimaryOutputAndFallbackAcrossTheSharedClient() async throws {
        let server = DFlashServer(), clock = TestClock()
        let client = OmlxClient(transport: { try await server.send($0) }, clock: { clock.now() })
        let connection = Connection(endpoint: try Endpoint("http://127.0.0.1:8000"), apiKey: "")
        var result = await client.snapshot(connection: connection)
        XCTAssertEqual(result.phase, .decode); XCTAssertEqual(result.output, 64)
        XCTAssertNil(result.rate); XCTAssertNil(result.observedRate); XCTAssertNil(result.progress)
        let epoch = result.epoch
        for step in 1...2 {
            clock.set(Double(10 + step)); await server.advance(count: 64 + step * 32)
            result = await client.snapshot(connection: connection)
        }
        XCTAssertEqual(result.epoch, epoch); XCTAssertEqual(result.observedRate, 32)
        XCTAssertNil(result.rate); XCTAssertFalse(String(describing: result).contains("private-a"))
        clock.set(13); await server.advance(count: 128, age: 6)
        result = await client.snapshot(connection: connection)
        XCTAssertEqual(result.phase, .processing); XCTAssertNil(result.observedRate)
        clock.set(14); await server.advance(count: 16, id: "private-b")
        result = await client.snapshot(connection: connection)
        XCTAssertNotEqual(result.epoch, epoch); XCTAssertNil(result.observedRate)
        clock.set(15); await server.advance(count: 0, fallback: true)
        result = await client.snapshot(connection: connection)
        XCTAssertEqual(result.phase, .prefill); XCTAssertEqual(result.progress, 0.25)
        XCTAssertEqual(result.rate, 100); XCTAssertNil(result.observedRate)
        await client.resetOutputObservation()
        clock.set(16); await server.advance(count: 256)
        result = await client.snapshot(connection: connection)
        XCTAssertNil(result.observedRate)
    }
}
