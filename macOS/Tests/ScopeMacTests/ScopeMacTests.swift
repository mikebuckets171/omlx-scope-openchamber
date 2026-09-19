import XCTest
import ScopeCore
@testable import ScopeMac

final class ScopeMacTests: XCTestCase {
    func testRealHostAPIs() async throws {
        let sampler = HostSampler()
        let first = await sampler.sample()
        XCTAssertNotNil(first.totalBytes); XCTAssertGreaterThan(first.totalBytes ?? 0, 0)
        XCTAssertNotNil(first.nonFreeBytes); XCTAssertNotNil(first.wiredBytes); XCTAssertNotNil(first.compressedBytes)
        XCTAssertNotNil(first.swapBytes); XCTAssertNotNil(first.thermal)
        XCTAssertNil(first.cpu)
        try await Task.sleep(for: .milliseconds(100))
        let second = await sampler.sample()
        XCTAssertNotNil(second.cpu); XCTAssertTrue((0...100).contains(second.cpu ?? -1))
    }
    func testSavedConnectionUsesOnlyBoundedKnownFiles() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        for path in [".omlx", ".local/share/opencode"] { try FileManager.default.createDirectory(at: root.appendingPathComponent(path), withIntermediateDirectories: true) }
        try Data(#"{"server":{"port":8001}}"#.utf8).write(to: root.appendingPathComponent(".omlx/settings.json"))
        try Data(#"{"omlx":{"type":"api","key":"fixture"},"cloud":{"key":"never-use"}}"#.utf8).write(to: root.appendingPathComponent(".local/share/opencode/auth.json"))
        let saved = SavedConnection.discover(home: root, environment: [:])
        XCTAssertEqual(saved.endpoint, "http://127.0.0.1:8001"); XCTAssertEqual(saved.key, "fixture")
    }
    @MainActor func testPauseAndMenuPresentation() {
        let model = MonitorModel(preview: true)
        var runtime = RuntimeReading(); runtime.phase = .decode; runtime.rate = 25
        var host = HostReading(); host.cpu = 20; host.totalBytes = 100; host.nonFreeBytes = 60
        model.setPreview(runtime: runtime, host: host, rates: [23, nil, 25])
        model.menuReadout = .speed; XCTAssertEqual(model.menuText, "25.0 t/s")
        model.togglePause(); XCTAssertEqual(model.menuText, "Paused"); XCTAssertEqual(model.statusText, "Monitoring paused")
        model.togglePause(); model.menuReadout = .memory; XCTAssertEqual(model.menuText, "60%")
        model.menuReadout = .icon; XCTAssertEqual(model.menuText, "")
    }
    @MainActor func testIconOnlyHasNoHiddenSamplingAndPauseStops() async throws {
        let defaults = UserDefaults(suiteName: UUID().uuidString)!
        let client = OmlxClient { _ in throw ConnectionError.unreachable }
        let model = MonitorModel(client: client, sampler: { HostReading() }, defaults: defaults)
        model.menuReadout = .icon; model.start()
        defer { model.stop() }
        try await Task.sleep(for: .milliseconds(150))
        XCTAssertEqual(model.samples, 0)
        let id = UUID(); model.setVisible(id, true)
        try await Task.sleep(for: .milliseconds(150))
        XCTAssertEqual(model.samples, 1)
        model.togglePause()
        try await Task.sleep(for: .milliseconds(150))
        XCTAssertEqual(model.samples, 1)
        model.setVisible(id, false)
        model.togglePause()
        try await Task.sleep(for: .milliseconds(150))
        XCTAssertEqual(model.samples, 1)
    }
}

final class NativeTransportTests: XCTestCase {
    func testRealLoopbackHTTPBoundaries() async throws {
        let server = Process(), output = Pipe()
        server.executableURL = URL(fileURLWithPath: "/usr/bin/env")
        server.arguments = ["node", "--input-type=module", "-e", """
        import http from 'node:http';
        const server=http.createServer((req,res)=>{
          if(req.url==='/redirect'){res.writeHead(302,{Location:'http://127.0.0.1:1/no'});res.end();return;}
          if(req.url==='/large'){res.writeHead(200);res.end('x'.repeat(2100000));return;}
          res.writeHead(200,{'Content-Type':'application/json','Set-Cookie':'omlx_admin_session=fixture; HttpOnly'});
          res.end('{"status":"healthy"}');
        });
        server.listen(0,'127.0.0.1',()=>console.log(server.address().port));
        """]
        server.standardOutput = output; server.standardError = FileHandle.standardError
        try server.run()
        defer { if server.isRunning { server.terminate(); server.waitUntilExit() } }
        let raw = output.fileHandleForReading.availableData
        let port = try XCTUnwrap(Int(String(decoding: raw, as: UTF8.self).trimmingCharacters(in: .whitespacesAndNewlines)))
        let transport = LocalTransport()
        let base = "http://127.0.0.1:\(port)"
        let normal = try await transport.send(URLRequest(url: URL(string: base + "/health")!))
        XCTAssertEqual(normal.status, 200); XCTAssertEqual(normal.sessionCookie, "fixture")
        let redirect = try await transport.send(URLRequest(url: URL(string: base + "/redirect")!))
        XCTAssertEqual(redirect.status, 302); XCTAssertEqual(redirect.url.absoluteString, base + "/redirect")
        do {
            _ = try await transport.send(URLRequest(url: URL(string: base + "/large")!))
            XCTFail("Oversized payload should be rejected")
        } catch { XCTAssertEqual(error as? ConnectionError, .oversized) }
    }
}
