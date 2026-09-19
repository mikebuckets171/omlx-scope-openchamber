import Foundation
import XCTest
import ScopeCore
@testable import ScopeMac

private actor CountingCredentials: CredentialStore {
    var reads = 0, saves = 0, removals = 0
    var failure = false
    var stored: String? = "stored-fixture"
    func fail(_ value: Bool) { failure = value }
    func read() throws -> String? { reads += 1; if failure { throw Credentials.Failure.cancelled }; return stored }
    func save(_ key: String) throws { saves += 1; if failure { throw Credentials.Failure.cancelled }; stored = key }
    func remove() throws { removals += 1; if failure { throw Credentials.Failure.cancelled }; stored = nil }
    func counts() -> [Int] { [reads, saves, removals] }
}

@MainActor final class CredentialChoiceTests: XCTestCase {
    private func model(_ credentials: CountingCredentials, _ defaults: UserDefaults, load: Bool = false) -> MonitorModel {
        MonitorModel(client: OmlxClient { _ in throw ConnectionError.unreachable }, sampler: { HostReading() },
                     defaults: defaults, credentials: credentials, loadSaved: load,
                     savedConnection: SavedConnection(endpoint: "http://127.0.0.1:8000", key: "opencode-fixture"))
    }
    func testStartupAndMonitoringNeverTouchKeychain() async throws {
        for preference in [nil, "keychain", "opencode", "none", "session"] as [String?] {
            let name = UUID().uuidString, defaults = UserDefaults(suiteName: name)!
            defer { defaults.removePersistentDomain(forName: name) }
            if let preference { defaults.set(preference, forKey: "credentialPreference") }
            let store = CountingCredentials(), monitor = model(store, defaults, load: true)
            XCTAssertEqual(monitor.needsKeychainAccess, preference == "keychain")
            monitor.start()
            try await Task.sleep(for: .milliseconds(40))
            monitor.refresh(); monitor.togglePause(); monitor.togglePause()
            try await Task.sleep(for: .milliseconds(40))
            monitor.stop()
            let calls = await store.counts(); XCTAssertEqual(calls, [0,0,0], preference ?? "unset")
            XCTAssertFalse(String(describing: defaults.dictionaryRepresentation()).contains("opencode-fixture"))
        }
    }
    func testNewKeyIsTransientUnlessExplicitlySaved() async throws {
        let name = UUID().uuidString, defaults = UserDefaults(suiteName: name)!
        defer { defaults.removePersistentDomain(forName: name) }
        let store = CountingCredentials(), monitor = model(store, defaults)
        let accepted = await monitor.saveConnection(endpoint: "http://127.0.0.1:8123", newKey: "transient-fixture")
        XCTAssertTrue(accepted); XCTAssertEqual(monitor.credentialSource, "This launch only")
        XCTAssertEqual(defaults.string(forKey: "credentialPreference"), "session")
        let calls = await store.counts(); XCTAssertEqual(calls, [0,0,0])
        XCTAssertFalse(String(describing: defaults.dictionaryRepresentation()).contains("transient-fixture"))
        let restarted = model(store, defaults, load: true)
        XCTAssertTrue(restarted.credentialSource.contains("key needed"))
        let saved = await monitor.saveConnection(endpoint: "http://127.0.0.1:8123", newKey: "saved-fixture", rememberInKeychain: true)
        XCTAssertTrue(saved)
        let afterSave = await store.counts(); XCTAssertEqual(afterSave, [0,1,0])
        await monitor.useKeychainKey()
        let afterRead = await store.counts(); XCTAssertEqual(afterRead, [1,1,0])
        await monitor.forgetKey()
        let afterForget = await store.counts(); XCTAssertEqual(afterForget, [1,1,1])
        XCTAssertEqual(defaults.string(forKey: "credentialPreference"), "none")
    }
    func testCanceledKeychainActionAndInvalidEndpointPreserveConnection() async throws {
        let name = UUID().uuidString, defaults = UserDefaults(suiteName: name)!
        defer { defaults.removePersistentDomain(forName: name) }
        let store = CountingCredentials(), monitor = model(store, defaults)
        _ = await monitor.saveConnection(endpoint: "http://127.0.0.1:8123", newKey: "original-fixture")
        let badEndpoint = await monitor.saveConnection(endpoint: "https://example.com", newKey: "secret-fixture", rememberInKeychain: true)
        XCTAssertFalse(badEndpoint)
        let before = await store.counts(); XCTAssertEqual(before, [0,0,0])
        await store.fail(true)
        let canceled = await monitor.saveConnection(endpoint: "http://127.0.0.1:9000", newKey: "secret-fixture", rememberInKeychain: true)
        XCTAssertFalse(canceled); XCTAssertEqual(monitor.endpoint, "http://127.0.0.1:8123")
        XCTAssertEqual(monitor.credentialSource, "This launch only"); XCTAssertFalse(monitor.connectionBusy)
        XCTAssertTrue(monitor.settingsMessage?.contains("canceled") == true)
        XCTAssertFalse(monitor.settingsMessage?.contains("secret-fixture") == true)
        await monitor.useKeychainKey(); await monitor.forgetKey()
        XCTAssertEqual(monitor.credentialSource, "This launch only")
        XCTAssertEqual(defaults.string(forKey: "credentialPreference"), "session")
    }
}
