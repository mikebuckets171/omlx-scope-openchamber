import XCTest
@testable import ScopeCore
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

final class ScopeCoreTests: XCTestCase {
    func data(_ value: Any) throws -> Data { try JSONSerialization.data(withJSONObject: value) }
    func activity(_ models: [[String: Any]], active: Any? = nil) throws -> Data {
        var object: [String: Any] = ["models": models]
        if let active { object["total_active_requests"] = active }
        return try data(["active_models": object])
    }
    func testOnlyCanonicalLoopbackIsAccepted() throws {
        XCTAssertEqual(try Endpoint("http://127.0.0.1:8000/v1").url.absoluteString, "http://127.0.0.1:8000")
        for invalid in ["https://127.0.0.1:8000", "http://localhost:8000", "http://127.1:8000", "http://127.0.0.1:0", "http://127.0.0.1:65536", "http://127.0.0.1:8000/admin", "http://127.0.0.1:8000?secret=1", "http://user:pass@127.0.0.1:8000", "http://2130706433:8000", "http://127.0.0.1:8000#foo"] {
            XCTAssertThrowsError(try Endpoint(invalid), invalid)
        }
    }
    func testUnknownNeverBecomesIdleOrZero() throws {
        let reading = try Normalizer.reading(activity: activity([["id": "model"]]), stats: nil)
        XCTAssertEqual(reading.phase, .unknown); XCTAssertNil(reading.active); XCTAssertNil(reading.queued)
        let empty = try Normalizer.reading(activity: activity([]), stats: nil)
        XCTAssertEqual(empty.phase, .noModel); XCTAssertEqual(empty.active, 0)
    }
    func testDecodeAndStaleOutput() throws {
        let flight: [String: Any] = ["generated_tokens": 240, "elapsed_seconds": 10, "last_activity_age_seconds": 0.3, "tokens_per_second": 24, "request_id": "private-request", "prompt": "private prompt"]
        let read = try Normalizer.reading(activity: activity([["id": "model", "active_requests": 1, "generating": [flight]]]), stats: nil)
        XCTAssertEqual(read.phase, .decode); XCTAssertEqual(read.rate, 24)
        XCTAssertFalse(String(describing: read).contains("private-request")); XCTAssertFalse(String(describing: read).contains("private prompt"))
        var stale = flight; stale["last_activity_age_seconds"] = 6
        let other = try Normalizer.reading(activity: activity([["id": "model", "active_requests": 1, "generating": [stale]]]), stats: nil)
        XCTAssertEqual(other.phase, .processing); XCTAssertNil(other.rate)
    }
    func testConcurrentModelsDoNotCombineSpeed() throws {
        let model: [String: Any] = ["id": "m", "active_requests": 1, "generating": [["generated_tokens": 200, "elapsed_seconds": 10, "last_activity_age_seconds": 0, "tokens_per_second": 20]]]
        let result = try Normalizer.reading(activity: activity([model, model]), stats: nil)
        XCTAssertEqual(result.active, 2); XCTAssertEqual(result.phase, .processing); XCTAssertNil(result.rate)
    }
    func testPrefillCacheAndInvalidNumbers() throws {
        let result = try Normalizer.reading(activity: activity([["id": "m", "prefilling": [["total": 100, "processed": 65, "speed": 240, "prompt_tokens": 100, "cached_tokens": 200]]]]), stats: nil)
        XCTAssertEqual(result.phase, .prefill); XCTAssertEqual(result.progress, 0.65); XCTAssertNil(result.reused)
        XCTAssertNil(nonnegative(true)); XCTAssertNil(nonnegative(-1)); XCTAssertNil(nonnegative(Double.nan))
        XCTAssertNil(nonnegative("12")); XCTAssertEqual(nonnegative(0), 0)
    }
    func testQueueOverlapMustBeProven() throws {
        let model: [String: Any] = ["id": "m", "active_requests": 1, "waiting_requests": 2,
            "waiting": [["request_id": "a"], ["request_id": "b"]],
            "prefilling": [["request_id": "a", "total": 100, "processed": 0]]]
        let result = try Normalizer.reading(activity: activity([model]), stats: nil)
        XCTAssertEqual(result.queued, 1)
    }
    func testStatsAndMemoryAreNotInvented() throws {
        let stats = try data(["engines": [:], "active_models": ["models": []], "avg_generation_tps": 21.5, "cache_efficiency": 120, "runtime_cache": ["hot_cache_size_bytes": 1024]])
        let result = try Normalizer.reading(activity: activity([]), stats: stats)
        XCTAssertEqual(result.decodeAverage, 21.5); XCTAssertNil(result.cacheEfficiency); XCTAssertNil(result.processBytes)
        XCTAssertEqual(result.ramCacheBytes, 1024); XCTAssertTrue(result.statsFresh)
        XCTAssertThrowsError(try Normalizer.reading(activity: data(["wrong": true]), stats: nil))
    }
    func testHistoryBoundsAndGaps() {
        var history = History(); let origin = Date(timeIntervalSince1970: 10_000)
        for i in 0..<1000 { history.append(time: origin.addingTimeInterval(Double(i) * 0.2), value: 10) }
        XCTAssertLessThanOrEqual(history.points.count, 180)
        let count = history.points.count
        history.append(time: history.points.last!.time, value: 90)
        XCTAssertEqual(history.points.count, count)
        history.append(time: origin.addingTimeInterval(201), value: nil)
        XCTAssertNil(history.points.last?.value)
        history.append(time: origin.addingTimeInterval(310), value: Double.infinity)
        XCTAssertEqual(history.points.count, 1); XCTAssertNil(history.points.last?.value)
    }
    func testCPUAndSamplingPolicy() {
        XCTAssertNil(SamplingPolicy.cpuPercent(previous: nil, current: [100, 30, 1000, 0]))
        XCTAssertEqual(SamplingPolicy.cpuPercent(previous: [10, 0, 90, 0], current: [20, 0, 180, 0]), 10)
        XCTAssertNil(SamplingPolicy.cpuPercent(previous: [20, 0, 180, 0], current: [10, 0, 90, 0]))
        XCTAssertEqual(SamplingPolicy.interval(visible: true, active: true, lowPower: false, efficient: false, failures: 0), 1)
        XCTAssertEqual(SamplingPolicy.interval(visible: false, active: true, lowPower: false, efficient: false, failures: 0), 2)
        XCTAssertEqual(SamplingPolicy.interval(visible: false, active: true, lowPower: true, efficient: false, failures: 0), 10)
        XCTAssertEqual(SamplingPolicy.interval(visible: true, active: false, lowPower: false, efficient: false, failures: 500), 30)
    }
    func testMemoryUnitsAndMissingValues() {
        XCTAssertEqual(DisplayFormat.bytes(1_073_741_824), "1.0 GiB")
        XCTAssertEqual(DisplayFormat.percent(nil), "—"); XCTAssertEqual(DisplayFormat.number(.nan), "—")
        var host = HostReading(); host.totalBytes = 100; host.nonFreeBytes = 150
        XCTAssertNil(host.memoryPercent)
        host.nonFreeBytes = 50; XCTAssertEqual(host.memoryPercent, 50)
    }
}

actor MockServer {
    var paths: [String] = []
    var state = "good"
    func setState(_ value: String) { state = value }
    func send(_ request: URLRequest) async throws -> HTTPResult {
        paths.append(request.url!.path)
        let url = request.url!
        if state == "redirect" { return HTTPResult(data: Data(), status: 302, url: url) }
        let body: [String: Any]
        var cookie: String?
        switch url.path {
        case "/health": body = ["status": "healthy", "engine_pool": ["model_count": 0]]
        case "/admin/api/login":
            if state == "auth" { return HTTPResult(data: Data(), status: 401, url: url) }
            body = [:]; cookie = "fixture-cookie"
        case "/admin/api/stats":
            if state == "stats" { throw ConnectionError.unreachable }
            body = ["engines": [:], "active_models": ["models": []], "avg_generation_tps": 22]
        case "/admin/api/activity": body = ["active_models": ["models": []]]
        default: throw ConnectionError.unreachable
        }
        return HTTPResult(data: try JSONSerialization.data(withJSONObject: body), status: 200, url: url, sessionCookie: cookie)
    }
}
final class ClientTests: XCTestCase {
    func testReadOnlyLoginAndSharedSnapshot() async throws {
        let server = MockServer(), endpoint = try Endpoint("http://127.0.0.1:8000")
        let client = OmlxClient { try await server.send($0) }
        let config = Connection(endpoint: endpoint, apiKey: "private-key")
        async let a = client.snapshot(connection: config)
        async let b = client.snapshot(connection: config)
        let (first, second) = await (a, b)
        XCTAssertEqual(first.phase, .noModel); XCTAssertEqual(second.phase, .noModel)
        let paths = await server.paths
        XCTAssertEqual(paths.filter { $0 == "/admin/api/activity" }.count, 1)
        XCTAssertTrue(Set(paths).isSubset(of: ["/health", "/admin/api/login", "/admin/api/activity", "/admin/api/stats"]))
    }
    func testBadIdentityNeverReceivesCredential() async throws {
        let server = MockServer(); await server.setState("redirect")
        let client = OmlxClient { try await server.send($0) }
        let result = await client.snapshot(connection: Connection(endpoint: try Endpoint("http://127.0.0.1:8000"), apiKey: "private-key"))
        XCTAssertEqual(result.phase, .offline)
        let paths = await server.paths; XCTAssertEqual(paths, ["/health"])
        XCTAssertFalse(result.message.contains("private-key"))
    }
    func testStatsFailureDoesNotLoseActivity() async throws {
        let server = MockServer(); await server.setState("stats")
        let client = OmlxClient { try await server.send($0) }
        let result = await client.snapshot(connection: Connection(endpoint: try Endpoint("http://127.0.0.1:8000"), apiKey: "key"))
        XCTAssertEqual(result.phase, .noModel); XCTAssertFalse(result.statsFresh)
    }
    func testMissingKeyMakesNoRequests() async throws {
        let server = MockServer(), client = OmlxClient { try await server.send($0) }
        let result = await client.snapshot(connection: Connection(endpoint: try Endpoint("http://127.0.0.1:8000"), apiKey: ""))
        XCTAssertEqual(result.phase, .offline)
        let paths = await server.paths; XCTAssertTrue(paths.isEmpty)
    }
    func testAuthenticationRejected() async throws {
        let server = MockServer(); await server.setState("auth")
        let client = OmlxClient { try await server.send($0) }
        let result = await client.snapshot(connection: Connection(endpoint: try Endpoint("http://127.0.0.1:8000"), apiKey: "bad"))
        XCTAssertEqual(result.phase, .offline); XCTAssertTrue(result.message.contains("rejected"))
    }
}
