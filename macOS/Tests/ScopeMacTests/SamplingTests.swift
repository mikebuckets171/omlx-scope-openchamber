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

    @MainActor func testMenuReadoutHasBoundedWidthForLargePrefillRate() {
        let model = MonitorModel(preview: true)
        var runtime = RuntimeReading(); runtime.phase = .prefill; runtime.rate = 12_400
        model.setPreview(runtime: runtime, host: HostReading(), rates: [])
        model.menuReadout = .speed
        XCTAssertLessThanOrEqual(model.menuText.count, 11)
        XCTAssertTrue(model.menuText.contains("t/s"))
    }
}
