import XCTest
import ScopeCore
@testable import ScopeMac

private actor ReleaseFixture {
    var calls = 0
    func fetch() async throws -> MacRelease {
        calls += 1
        try await Task.sleep(for: .milliseconds(50))
        let json = #"[{"tag_name":"v0.5.7","draft":false,"prerelease":false,"assets":[{"name":"OMLX-Scope-macOS-0.5.7.zip","size":420000,"state":"uploaded","browser_download_url":"https://github.com/mikebuckets171/omlx-scope-openchamber/releases/download/v0.5.7/OMLX-Scope-macOS-0.5.7.zip"}]}]"#
        return try ReleaseCatalog.newestMacRelease(in: Data(json.utf8))
    }
}
final class UpdateTests: XCTestCase {
    @MainActor func testCheckCoalescesAndFindsNativeReleaseWithoutInstalling() async throws {
        let fixture = ReleaseFixture()
        let updates = UpdateController(version: "0.5.6", defaults: UserDefaults(suiteName: UUID().uuidString)!, fetch: { try await fixture.fetch() })
        defer { updates.stop() }
        XCTAssertFalse(updates.automaticallyChecks); XCTAssertFalse(updates.secureInstallation)
        updates.automaticallyInstalls = true
        XCTAssertFalse(updates.automaticallyInstalls)
        updates.check(); updates.check(); updates.check()
        XCTAssertEqual(updates.state, .checking)
        try await Task.sleep(for: .milliseconds(200))
        let calls = await fixture.calls; XCTAssertEqual(calls, 1)
        XCTAssertTrue(updates.status.contains("0.5.7")); XCTAssertNotNil(updates.lastChecked)
        XCTAssertTrue(updates.canCheck)
    }
    @MainActor func testFailureNeverReportsUpToDateOrLeaksArbitraryErrors() async throws {
        let updates = UpdateController(version: "0.5.6", defaults: UserDefaults(suiteName: UUID().uuidString)!) {
            throw NSError(domain: "private-key-must-not-appear", code: 1)
        }
        defer { updates.stop() }; updates.check()
        try await Task.sleep(for: .milliseconds(100))
        XCTAssertEqual(updates.state, .failed(ReleaseError.unreachable.localizedDescription))
        XCTAssertNil(updates.lastChecked)
        XCTAssertFalse(updates.status.contains("private-key"))
    }
    @MainActor func testStartupDoesNotContactGitHubWithoutOptIn() async throws {
        let fixture = ReleaseFixture()
        let updates = UpdateController(version: "0.5.6", defaults: UserDefaults(suiteName: UUID().uuidString)!, fetch: { try await fixture.fetch() })
        defer { updates.stop() }; updates.start()
        try await Task.sleep(for: .milliseconds(100))
        let calls = await fixture.calls; XCTAssertEqual(calls, 0)
    }
    @MainActor func testAutomaticChecksRespectOptInAndDailyInterval() async throws {
        let fixture = ReleaseFixture()
        let defaults = UserDefaults(suiteName: UUID().uuidString)!
        let updates = UpdateController(version: "0.5.6", defaults: defaults, fetch: { try await fixture.fetch() })
        defer { updates.stop() }
        updates.start()
        updates.automaticallyChecks = true
        try await Task.sleep(for: .milliseconds(200))
        let first = await fixture.calls
        XCTAssertEqual(first, 1)
        XCTAssertTrue(defaults.bool(forKey: "updates.checkAutomatically"))
        updates.automaticallyChecks = false
        updates.automaticallyChecks = true
        try await Task.sleep(for: .milliseconds(200))
        let repeated = await fixture.calls
        XCTAssertEqual(repeated, 1)
        updates.automaticallyChecks = false
        XCTAssertFalse(defaults.bool(forKey: "updates.checkAutomatically"))
        XCTAssertFalse(updates.automaticallyInstalls)
    }
    @MainActor func testUnsignedTestBundleCannotEnableSparkleInstallation() {
        XCTAssertFalse(UpdateController.isSignedUpdateBuild(Bundle.main))
    }
}
