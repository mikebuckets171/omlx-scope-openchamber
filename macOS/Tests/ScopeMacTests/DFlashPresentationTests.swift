import XCTest
import ScopeCore
@testable import ScopeMac

@MainActor final class DFlashPresentationTests: XCTestCase {
    func testActivityReadoutUsesObservedRateAndKeepsPreparationHonest() {
        let model = MonitorModel(preview: true)
        model.menuReadout = .speed
        var reading = RuntimeReading(); reading.phase = .processing; reading.active = 1
        model.runtime = reading
        XCTAssertEqual(model.menuText, "Working")
        XCTAssertNil(model.displayRate)
        reading.phase = .decode; reading.output = 256; reading.observedRate = 32
        model.runtime = reading
        XCTAssertEqual(model.menuText, "32.0 t/s")
        XCTAssertEqual(model.displayRate, 32)
        XCTAssertTrue(model.rateCaption.contains("Recent output"))
        XCTAssertNil(model.runtime.progress)
        reading.rate = 25; model.runtime = reading
        XCTAssertEqual(model.displayRate, 25, "Reported rate takes priority")
        XCTAssertFalse(model.rateCaption.contains("Recent output"))
        model.togglePause()
        XCTAssertEqual(model.menuText, "Paused")
    }
}
