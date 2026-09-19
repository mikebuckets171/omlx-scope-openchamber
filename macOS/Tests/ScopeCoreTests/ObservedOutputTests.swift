import Foundation
import XCTest
@testable import ScopeCore

final class ObservedOutputTests: XCTestCase {
    private func reading(_ count: Double, epoch: Int = 1) -> RuntimeReading {
        var value = RuntimeReading(); value.phase = .decode; value.output = count
        value.active = 1; value.epoch = epoch; value.elapsed = 30
        return value
    }
    func testCountsAcceptedOutputOverTimeWithoutRequestElapsed() {
        var meter = ObservedOutput()
        XCTAssertNil(meter.observe(reading(64), at: 10))
        XCTAssertNil(meter.observe(reading(96), at: 11))
        XCTAssertEqual(meter.observe(reading(128), at: 12), 32)
        XCTAssertEqual(meter.observe(reading(160), at: 13), 32)
    }
    func testDuplicateTimesDoNotChangeTheRecordedRate() {
        var meter = ObservedOutput()
        _ = meter.observe(reading(64), at: 10)
        _ = meter.observe(reading(96), at: 11)
        XCTAssertEqual(meter.observe(reading(128), at: 12), 32)
        XCTAssertEqual(meter.observe(reading(192), at: 12), 32)
        XCTAssertEqual(meter.observe(reading(160), at: 13), 32)
    }
    func testGapsEpochChangesCountersAndUnavailableStatesReset() {
        var meter = ObservedOutput()
        for time in 0...3 { _ = meter.observe(reading(Double(time * 32 + 1)), at: Double(time)) }
        XCTAssertNil(meter.observe(reading(10), at: 4))
        XCTAssertNil(meter.observe(reading(42, epoch: 2), at: 5))
        XCTAssertNil(meter.observe(reading(64, epoch: 2), at: 20))
        var stalled = reading(96, epoch: 2); stalled.phase = .processing
        XCTAssertNil(meter.observe(stalled, at: 21))
        XCTAssertNil(meter.observe(reading(128, epoch: 2), at: 22))
        meter.clear()
        XCTAssertNil(meter.observe(reading(160, epoch: 2), at: 23))
    }
    func testNeverOverridesReportedRateOrCombinesConcurrentWork() {
        var meter = ObservedOutput(), reported = reading(64)
        reported.rate = 25
        XCTAssertNil(meter.observe(reported, at: 10))
        var concurrent = reading(96); concurrent.active = 2
        XCTAssertNil(meter.observe(concurrent, at: 11))
        XCTAssertNil(meter.observe(reading(.infinity), at: 12))
        XCTAssertNil(meter.observe(reading(12.5), at: 13))
    }
    func testDFlashActivityAndFallbackUseDifferentContinuity() throws {
        func data(_ key: String, flight: [String: Any]) throws -> Data {
            try JSONSerialization.data(withJSONObject: ["active_models": ["models": [["id":"fixture", key:[flight]]]]])
        }
        let first = Normalizer.continuity(try data("activities", flight:["kind":"generate","request_id":"a"])).0
        XCTAssertFalse(first.isEmpty)
        XCTAssertNotEqual(first, Normalizer.continuity(try data("activities", flight:["kind":"generate","request_id":"b"])).0)
        XCTAssertNotEqual(first, Normalizer.continuity(try data("generating", flight:["request_id":"a"])).0)
        XCTAssertEqual(Normalizer.continuity(try data("activities", flight:["kind":"embedding","request_id":"a"])).0, "")
        XCTAssertEqual(Normalizer.continuity(try data("activities", flight:["kind":"generate"])).0, "")
    }
}
