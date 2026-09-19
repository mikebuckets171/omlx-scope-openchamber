import Foundation
import XCTest
import ScopeCore
@testable import ScopeMac

private actor ConnectionRequests {
    var count = 0
    func record() { count += 1 }
    func total() -> Int { count }
}

@MainActor final class ConnectionRecoveryTests: XCTestCase {
    func testInvalidDiscoveryBlocksNetworkUntilExplicitConnectionChoice() async throws {
        let name = UUID().uuidString, defaults = UserDefaults(suiteName: name)!
        defer { defaults.removePersistentDomain(forName: name) }
        let requests = ConnectionRequests()
        let problem = "The saved OpenCode configuration could not be read."
        let monitor = MonitorModel(client: OmlxClient { _ in
            await requests.record(); throw ConnectionError.unreachable
        }, sampler: { HostReading() }, defaults: defaults, loadSaved: true,
        savedConnection: SavedConnection(problem: problem))
        monitor.start(); defer { monitor.stop() }
        for _ in 0..<100 {
            if monitor.runtime.message == problem { break }
            try await Task.sleep(for: .milliseconds(10))
        }
        XCTAssertEqual(monitor.runtime.message, problem)
        XCTAssertGreaterThan(monitor.samples, 0, "Host sampling must remain available")
        let before = await requests.total(); XCTAssertEqual(before, 0)
        let accepted = await monitor.saveConnection(endpoint: "http://127.0.0.1:8123", newKey: "")
        XCTAssertTrue(accepted)
        for _ in 0..<100 {
            if await requests.total() > 0 { break }
            try await Task.sleep(for: .milliseconds(20))
        }
        let after = await requests.total(); XCTAssertGreaterThan(after, 0)
    }

    func testExplicitEndpointDoesNotDependOnUnrelatedDiscoveryFiles() async throws {
        let name = UUID().uuidString, defaults = UserDefaults(suiteName: name)!
        defer { defaults.removePersistentDomain(forName: name) }
        defaults.set("http://127.0.0.1:8123", forKey: "endpoint")
        defaults.set("session", forKey: "credentialPreference")
        let requests = ConnectionRequests()
        let monitor = MonitorModel(client: OmlxClient { request in
            XCTAssertEqual(request.url?.port, 8123)
            XCTAssertNil(request.value(forHTTPHeaderField: "Authorization"))
            await requests.record(); throw ConnectionError.unreachable
        }, sampler: { HostReading() }, defaults: defaults, loadSaved: true,
        savedConnection: SavedConnection(problem: "Unrelated OpenCode configuration error"))
        monitor.start(); defer { monitor.stop() }
        for _ in 0..<100 {
            if await requests.total() > 0 { break }
            try await Task.sleep(for: .milliseconds(20))
        }
        let count = await requests.total(); XCTAssertGreaterThan(count, 0)
        XCTAssertEqual(monitor.endpoint, "http://127.0.0.1:8123")
    }

    func testManualKeyFreeConnectionSurvivesRelaunchAfterDiscoveryFailure() async throws {
        let name = UUID().uuidString, defaults = UserDefaults(suiteName: name)!
        defer { defaults.removePersistentDomain(forName: name) }
        let problem = SavedConnection(problem: "Saved OpenCode settings are unreadable.")
        let first = MonitorModel(client: OmlxClient { _ in throw ConnectionError.unreachable },
                                 sampler: { HostReading() }, defaults: defaults,
                                 loadSaved: true, savedConnection: problem)
        let accepted = await first.saveConnection(endpoint: "http://127.0.0.1:8123", newKey: "")
        XCTAssertTrue(accepted)
        XCTAssertEqual(defaults.string(forKey: "credentialPreference"), "none")
        let requests = ConnectionRequests()
        let second = MonitorModel(client: OmlxClient { request in
            XCTAssertEqual(request.url?.port, 8123)
            await requests.record(); throw ConnectionError.unreachable
        }, sampler: { HostReading() }, defaults: defaults, loadSaved: true, savedConnection: problem)
        second.start(); defer { second.stop() }
        for _ in 0..<100 {
            if await requests.total() > 0 { break }
            try await Task.sleep(for: .milliseconds(20))
        }
        let count = await requests.total(); XCTAssertGreaterThan(count, 0)
        XCTAssertFalse(second.needsKeychainAccess)
    }
}
