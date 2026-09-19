import Foundation
import XCTest
@testable import ScopeCore

final class ParityTests: XCTestCase {
    private func fixture(_ name: String) throws -> Any {
        var root = URL(fileURLWithPath: #filePath)
        for _ in 0..<4 { root.deleteLastPathComponent() }
        return try JSONSerialization.jsonObject(with: Data(contentsOf: root.appendingPathComponent("tests/fixtures/" + name)))
    }
    func testSharedOMLXContract() throws {
        let corpus = try XCTUnwrap(try fixture("omlx-monitoring.json") as? [String: Any])
        for item in try XCTUnwrap(corpus["cases"] as? [[String: Any]]) {
            let name = item["name"] as? String ?? "fixture"
            let activity = try JSONSerialization.data(withJSONObject: item["activity"]!)
            let stats = item["stats"] as? [String: Any]
            let data = try stats.map { try JSONSerialization.data(withJSONObject: $0) }
            if item["invalid"] as? Bool == true {
                XCTAssertThrowsError(try Normalizer.reading(activity: activity, stats: data), name); continue
            }
            let limits = (item["contextWindows"] as? [String: NSNumber] ?? [:]).mapValues(\.doubleValue)
            let reading = try Normalizer.reading(activity: activity, stats: data, contextWindows: limits)
            let values: [String: Any?] = ["phase": reading.phase == .noModel ? "notLoaded" : reading.phase.rawValue,
                "active": reading.active, "queued": reading.queued, "rate": reading.rate, "prompt": reading.prompt,
                "reused": reading.reused, "output": reading.output, "progress": reading.progress, "eta": reading.prefillETA,
                "contextRemaining": reading.contextRemaining, "inputReusedPercent": reading.inputReusedPercent]
            for (key, expected) in try XCTUnwrap(item["expected"] as? [String: Any]) {
                let actual = values[key] ?? nil
                if expected is NSNull { XCTAssertNil(actual, "\(name): \(key)") }
                else if let number = expected as? NSNumber {
                    XCTAssertEqual(try XCTUnwrap(actual as? Double, "\(name): \(key)"), number.doubleValue, accuracy: 0.000001, "\(name): \(key)")
                } else { XCTAssertEqual(actual as? String, expected as? String, "\(name): \(key)") }
            }
            XCTAssertFalse(String(describing: reading).contains("synthetic-a"), name)
        }
    }
    func testSharedJSONC() throws {
        for item in try XCTUnwrap(try fixture("jsonc.json") as? [[String: Any]]) {
            let text = try XCTUnwrap(item["text"] as? String), name = item["name"] as? String ?? "fixture"
            if item["valid"] as? Bool == true { XCTAssertNoThrow(try JSONC.object(Data(text.utf8)), name) }
            else { XCTAssertThrowsError(try JSONC.object(Data(text.utf8)), name) }
        }
    }
    func testPrefillStageStartsNewContinuity() throws {
        func input(phase: String, total: Int) throws -> Data {
            try JSONSerialization.data(withJSONObject: ["active_models": ["models": [["id":"fixture", "prefilling": [["request_id":"synthetic", "phase":phase, "total":total, "processed":0]]]]]])
        }
        let before = Normalizer.continuity(try input(phase:"vision",total:100)).0
        XCTAssertNotEqual(before, Normalizer.continuity(try input(phase:"text",total:100)).0)
        XCTAssertNotEqual(before, Normalizer.continuity(try input(phase:"vision",total:200)).0)
    }
}
