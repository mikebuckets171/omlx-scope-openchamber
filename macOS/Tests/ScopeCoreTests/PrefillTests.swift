import XCTest
@testable import ScopeCore

final class PrefillTests: XCTestCase {
    func reading(_ done: Double = 5824, _ total: Double = 9100) -> RuntimeReading {
        var r = RuntimeReading(); r.phase = .prefill; r.prefillProcessed = done; r.prefillTotal = total
        r.rate = 200; r.prefillETA = 16.38; return r
    }
    func testRemainingCompletedAndETA() throws {
        let p = try XCTUnwrap(PrefillReading(reading()))
        XCTAssertEqual(p.remaining, "36%"); XCTAssertEqual(p.completed, "64%")
        XCTAssertEqual(p.menuText(.remaining), "36% left")
        XCTAssertEqual(p.menuText(.completed), "64% done")
        XCTAssertEqual(p.estimate, "~20s"); XCTAssertTrue(p.counts?.contains("3,276") == true)
    }
    func testNoFalseZeroAndWholeTokenBoundaries() throws {
        for done in 0...100 {
            let p = try XCTUnwrap(PrefillReading(reading(Double(done),100)))
            XCTAssertEqual(p.completed,"\(done)%"); XCTAssertEqual(p.remaining,"\(100-done)%")
        }
        let almost = try XCTUnwrap(PrefillReading(reading(9999,10000)))
        XCTAssertEqual(almost.remaining,"<1%"); XCTAssertEqual(almost.completed,"99%")
    }
    func testInvalidCountersAndOtherPhasesNeverInventProgress() {
        for (done,total) in [(101.0,100.0),(-1,100),(1,0),(1.5,100),(.nan,100),(1,.infinity)] {
            XCTAssertNil(PrefillReading(reading(done,total)))
        }
        var r = reading(); r.phase = .decode; XCTAssertNil(PrefillReading(r))
    }
    func testStaleProgressIsMarkedAndDoesNotCountDown() throws {
        var r = reading(); r.progressStale = true
        let p = try XCTUnwrap(PrefillReading(r))
        XCTAssertEqual(p.menuText(.remaining),"36% left*"); XCTAssertNil(p.estimate)
        r = reading(9100,9100); XCTAssertNil(PrefillReading(r)?.estimate)
    }
    func testRawInvalidCountersAndStaleProgress() throws {
        func parse(_ done: Any, stale: Bool = false) throws -> RuntimeReading {
            let data = try JSONSerialization.data(withJSONObject:["active_models":["models":[["id":"m","active_requests":1,"prefilling":[["processed":done,"total":100,"speed":200,"eta":3,"progress_stale":stale]]]]]])
            return try Normalizer.reading(activity:data,stats:nil)
        }
        XCTAssertNil(try parse(101).progress)
        XCTAssertNil(try parse(1.5).progress)
        XCTAssertNil(try parse(true).progress)
        let stale = try parse(40,stale:true)
        XCTAssertEqual(stale.progress,0.4); XCTAssertNil(stale.rate); XCTAssertNil(stale.prefillETA); XCTAssertTrue(stale.progressStale)
    }
    func testBackgroundActiveReadoutUsesBoundedCadence() {
        XCTAssertEqual(SamplingPolicy.interval(visible:false,active:true,lowPower:false,efficient:false,failures:0),2)
        XCTAssertEqual(SamplingPolicy.interval(visible:false,active:false,lowPower:false,efficient:false,failures:0),5)
        XCTAssertEqual(SamplingPolicy.interval(visible:false,active:true,lowPower:true,efficient:false,failures:0),10)
    }
}
