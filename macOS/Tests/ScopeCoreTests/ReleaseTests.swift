import XCTest
@testable import ScopeCore

final class ReleaseTests: XCTestCase {
    private func release(_ version: String, native: Bool = true, draft: Bool = false, prerelease: Bool = false) -> [String: Any] {
        let name = "OMLX-Scope-macOS-\(version).zip"
        return ["tag_name": "v\(version)", "draft": draft, "prerelease": prerelease,
                "assets": native ? [["name": name, "size": 420_000, "state": "uploaded",
                                      "browser_download_url": "https://github.com/\(ReleaseCatalog.repository)/releases/download/v\(version)/\(name)"]] : []]
    }
    private func data(_ releases: [[String: Any]]) throws -> Data { try JSONSerialization.data(withJSONObject: releases) }

    func testVersionComparisonIsNumericAndStableOnly() throws {
        XCTAssertGreaterThan(try XCTUnwrap(ReleaseVersion("0.5.10")), try XCTUnwrap(ReleaseVersion("0.5.9")))
        XCTAssertGreaterThan(try XCTUnwrap(ReleaseVersion("1.0.0")), try XCTUnwrap(ReleaseVersion("0.99.99")))
        XCTAssertEqual(ReleaseVersion("0.5.6")?.description, "0.5.6")
        for invalid in ["v0.5.6", "0.5", "0.5.6-beta", "0.5.6+build", "00.5.6", "0.5.-6", "0.5.6/evil", "0.5.6\n", "999999999999.1.1"] {
            XCTAssertNil(ReleaseVersion(invalid), invalid)
        }
    }
    func testNewestNativeReleaseIgnoresExtensionOnlyAndPreviewTags() throws {
        let result = try ReleaseCatalog.newestMacRelease(in: data([
            release("0.6.0", native: false), release("0.5.9"), release("0.5.10"),
            release("0.9.0", draft: true), release("0.8.0", prerelease: true)
        ]))
        XCTAssertEqual(result.version.description, "0.5.10")
        XCTAssertEqual(result.pageURL.host, "github.com")
    }
    func testOnlyExactRepositoryAssetIsAccepted() throws {
        var payload = release("0.5.7")
        var asset = (payload["assets"] as! [[String: Any]])[0]
        for bad in ["https://evil.example/OMLX-Scope-macOS-0.5.7.zip", "http://github.com/unsafe", "https://github.com/other/repo/releases/download/v0.5.7/app.zip"] {
            asset["browser_download_url"] = bad; payload["assets"] = [asset]
            XCTAssertThrowsError(try ReleaseCatalog.newestMacRelease(in: data([payload])))
        }
        payload = release("0.5.7"); payload["assets"] = (payload["assets"] as! [[String: Any]]) + (payload["assets"] as! [[String: Any]])
        XCTAssertThrowsError(try ReleaseCatalog.newestMacRelease(in: data([payload])))
    }
    func testMalformedEmptyOversizedOrInvalidAssetsDoNotClaimCurrent() throws {
        XCTAssertThrowsError(try ReleaseCatalog.newestMacRelease(in: Data("{}".utf8)))
        XCTAssertThrowsError(try ReleaseCatalog.newestMacRelease(in: data([])))
        XCTAssertThrowsError(try ReleaseCatalog.newestMacRelease(in: data(Array(repeating: release("0.5.6"), count: 21))))
        XCTAssertThrowsError(try ReleaseCatalog.newestMacRelease(in: Data(repeating: 32, count: 1_000_001)))
        for size in [0, -1, 40_000_001] {
            var payload = release("0.5.7"), asset = (release("0.5.7")["assets"] as! [[String: Any]])[0]
            asset["size"] = size; payload["assets"] = [asset]
            XCTAssertThrowsError(try ReleaseCatalog.newestMacRelease(in: data([payload])))
        }
    }
}
