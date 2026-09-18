import XCTest
import ScopeCore
@testable import ScopeMac

final class SamplingTests: XCTestCase {
    @MainActor func testHostReadingsContinueThroughRuntimeBackoff() async throws {
        let client = OmlxClient { _ in throw ConnectionError.unreachable }
        let model = MonitorModel(client: client, sampler: {
            var value = HostReading(); value.cpu = 12; value.totalBytes = 100; value.nonFreeBytes = 40; return value
        }, defaults: UserDefaults(suiteName: UUID().uuidString)!)
        let id = UUID(); model.setVisible(id, true); model.start()
        defer { model.stop() }
        try await Task.sleep(for: .milliseconds(150))
        XCTAssertEqual(model.runtime.phase, .offline)
        XCTAssertEqual(model.samples, 1)
        model.refresh()
        try await Task.sleep(for: .milliseconds(150))
        let before = model.samples
        try await Task.sleep(for: .milliseconds(3_200))
        XCTAssertGreaterThan(model.samples, before)
        XCTAssertEqual(model.host.cpu, 12)
    }

    @MainActor func testMenuReadoutPrioritizesPrefillAndBoundsLargeGenerationRate() {
        let model = MonitorModel(preview: true)
        var runtime = RuntimeReading(); runtime.phase = .prefill; runtime.rate = 12_400
        model.setPreview(runtime: runtime, host: HostReading(), rates: [])
        model.menuReadout = .speed
        XCTAssertEqual(model.menuText, "Prefill") // No counters: do not invent a percentage.
        runtime.phase = .decode; model.runtime = runtime
        XCTAssertLessThanOrEqual(model.menuText.count, 11)
        XCTAssertTrue(model.menuText.contains("t/s"))
    }
}

extension SamplingTests {
    @MainActor func testActivityMenuSwitchesPrefillToDecodeAndRetainsChoice() {
        let model = MonitorModel(preview:true)
        var r = RuntimeReading(); r.phase = .prefill; r.prefillProcessed = 5824; r.prefillTotal = 9100; r.rate = 180
        model.setPreview(runtime:r,host:HostReading(),rates:[]); model.menuReadout = .speed
        XCTAssertEqual(model.menuText,"36% left")
        model.progressDisplay = .completed; XCTAssertEqual(model.menuText,"64% done")
        r.phase = .decode; r.rate = 24.8; model.runtime = r; XCTAssertEqual(model.menuText,"24.8 t/s")
        model.togglePause(); XCTAssertEqual(model.menuText,"Paused")
    }
    @MainActor func testHiddenResourceReadoutAvoidsRuntimeRequests() async throws {
        let client = OmlxClient { _ in XCTFail("Resource-only hidden mode must not request oMLX"); throw ConnectionError.unreachable }
        let model = MonitorModel(client:client,sampler:{HostReading()},defaults:UserDefaults(suiteName:UUID().uuidString)!)
        model.menuReadout = .cpu; model.start(); defer { model.stop() }
        try await Task.sleep(for:.milliseconds(150))
        XCTAssertEqual(model.samples,1); XCTAssertEqual(model.runtime.phase,.connecting)
    }
    @MainActor func testHiddenResourceOnlyModeDoesNotInheritActiveModelCadence() {
        let model = MonitorModel(preview: true)
        var runtime = RuntimeReading(); runtime.phase = .prefill
        model.setPreview(runtime: runtime, host: HostReading(), rates: [])
        model.menuReadout = .speed
        XCTAssertEqual(model.samplingInterval, 2)
        model.menuReadout = .cpu
        XCTAssertEqual(model.samplingInterval, 5)
        let id = UUID(); model.setVisible(id, true)
        XCTAssertEqual(model.samplingInterval, 1)
        model.efficient = true
        XCTAssertEqual(model.samplingInterval, 3)
    }
}
