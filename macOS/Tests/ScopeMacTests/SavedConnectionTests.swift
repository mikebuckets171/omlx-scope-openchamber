import Darwin
import Foundation
import XCTest
@testable import ScopeMac

final class SavedConnectionTests: XCTestCase {
    private func inHome(_ body: (URL) throws -> Void) throws {
        let home = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: home, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: home) }
        try body(home)
    }
    private func write(_ home: URL, _ path: String, _ text: String) throws {
        let url = home.appendingPathComponent(path)
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try Data(text.utf8).write(to: url)
    }
    func testJSONCMergesProviderOptionsAndExplicitPathWins() throws {
        try inHome { home in
            try write(home, "config/opencode/opencode.json", #"{"provider":{"omlx":{"options":{"baseURL":"http://127.0.0.1:8123/v1"}}},"model":"omlx/local"}"#)
            try write(home, "config/opencode/opencode.jsonc", "// local override\n{\"provider\":{\"omlx\":{\"options\":{\"timeout\":20,},},},}")
            try write(home, "data/opencode/auth.json", #"{"omlx":{"type":"api","key":"fixture"},"cloud":{"key":"never-use"}}"#)
            var env = ["XDG_CONFIG_HOME":home.path + "/config", "XDG_DATA_HOME":home.path + "/data"]
            let saved = SavedConnection.discover(home: home, environment: env)
            XCTAssertNil(saved.problem); XCTAssertEqual(saved.endpoint, "http://127.0.0.1:8123")
            XCTAssertEqual(saved.key, "fixture"); XCTAssertEqual(saved.model, "local")
            try write(home, "custom.jsonc", #"{"provider":{"omlx":{"options":{"baseURL":"http://127.0.0.1:9000"}}}}"#)
            env["OPENCODE_CONFIG"] = home.path + "/custom.jsonc"
            XCTAssertEqual(SavedConnection.discover(home: home, environment: env).endpoint, "http://127.0.0.1:9000")
        }
    }
    func testBadConfigurationDoesNotSilentlyFallBackOrReadAnAuthFileWhenNotRequested() throws {
        try inHome { home in
            try write(home, ".omlx/settings.json", #"{"server":{"port":8000}}"#)
            try write(home, ".config/opencode/opencode.jsonc", "{broken")
            let bad = SavedConnection.discover(home: home, environment: [:]); XCTAssertNotNil(bad.problem); XCTAssertNil(bad.endpoint)
            try write(home, ".config/opencode/opencode.jsonc", "{}")
            try write(home, ".local/share/opencode/auth.json", "private-broken-data")
            let skipped = SavedConnection.discover(home: home, environment: [:], includeCredential: false)
            XCTAssertNil(skipped.problem); XCTAssertNil(skipped.key); XCTAssertEqual(skipped.endpoint, "http://127.0.0.1:8000")
            XCTAssertNotNil(SavedConnection.discover(home: home, environment: ["OPENCODE_CONFIG":"relative"]).problem)
        }
    }
    func testOversizedDirectoriesAndPipesAreRejectedWithoutBlocking() throws {
        try inHome { home in
            let relative = ".config/opencode/opencode.json"
            try write(home, relative, String(repeating:" ",count:1_000_001))
            XCTAssertNotNil(SavedConnection.discover(home:home,environment:[:]).problem)
            let path = home.appendingPathComponent(relative)
            try FileManager.default.removeItem(at:path)
            try FileManager.default.createDirectory(at:path,withIntermediateDirectories:true)
            XCTAssertNotNil(SavedConnection.discover(home:home,environment:[:]).problem)
            try FileManager.default.removeItem(at:path)
            XCTAssertEqual(mkfifo(path.path, 0o600), 0)
            let began = ProcessInfo.processInfo.systemUptime
            XCTAssertNotNil(SavedConnection.discover(home:home,environment:[:]).problem)
            XCTAssertLessThan(ProcessInfo.processInfo.systemUptime - began, 1)
        }
    }
}
