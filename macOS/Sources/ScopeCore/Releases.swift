import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

/// Stable three-part release versions. Pre-releases never enter the stable channel.
public struct ReleaseVersion: Comparable, Sendable, CustomStringConvertible {
    public let components: [Int]
    public init?(_ text: String) {
        guard text.range(of: #"^(0|[1-9][0-9]{0,8})\.(0|[1-9][0-9]{0,8})\.(0|[1-9][0-9]{0,8})\z"#,
                         options: .regularExpression) != nil else { return nil }
        let parts = text.split(separator: ".").compactMap { Int($0) }
        guard parts.count == 3 else { return nil }
        components = parts
    }
    public var description: String { components.map(String.init).joined(separator: ".") }
    public static func < (lhs: Self, rhs: Self) -> Bool {
        lhs.components.lexicographicallyPrecedes(rhs.components)
    }
}

public struct MacRelease: Equatable, Sendable {
    public let version: ReleaseVersion
    public let pageURL: URL
    public let downloadURL: URL
    public let bytes: Int
}

public enum ReleaseError: Error, LocalizedError, Sendable, Equatable {
    case invalidResponse, noMacRelease, rateLimited, unreachable, developmentBuild
    public var errorDescription: String? {
        switch self {
        case .invalidResponse: "GitHub returned an unexpected release response. No update was downloaded."
        case .noMacRelease: "No compatible Mac release was found. You can check the releases page."
        case .rateLimited: "GitHub’s request limit was reached. Try again later."
        case .unreachable: "Could not reach GitHub. Check your connection and try again."
        case .developmentBuild: "This development build has no release version to compare."
        }
    }
}

public enum ReleaseCatalog {
    public static let repository = "mikebuckets171/omlx-scope-openchamber"
    public static let releasesURL = URL(string: "https://github.com/\(repository)/releases")!
    public static let apiURL = URL(string: "https://api.github.com/repos/\(repository)/releases?per_page=20")!
    public static let feedURL = URL(string: "https://raw.githubusercontent.com/\(repository)/updates/appcast.xml")!
    public static let maximumResponseBytes = 1_000_000

    private struct Asset: Decodable {
        let name: String
        let browser_download_url: String
        let size: Int
        let state: String
    }
    private struct Release: Decodable {
        let tag_name: String
        let draft: Bool
        let prerelease: Bool
        let assets: [Asset]
    }

    /// Extension-only releases are ignored. URLs are reconstructed and matched,
    /// never trusted as arbitrary server-provided destinations or executable commands.
    public static func newestMacRelease(in data: Data) throws -> MacRelease {
        guard data.count <= maximumResponseBytes,
              let releases = try? JSONDecoder().decode([Release].self, from: data), releases.count <= 20 else {
            throw ReleaseError.invalidResponse
        }
        let candidates: [MacRelease] = releases.compactMap { release in
            guard !release.draft, !release.prerelease, release.tag_name.hasPrefix("v"),
                  let version = ReleaseVersion(String(release.tag_name.dropFirst())) else { return nil }
            let name = "OMLX-Scope-macOS-\(version).zip"
            let download = "https://github.com/\(repository)/releases/download/v\(version)/\(name)"
            let assets = release.assets.filter { $0.name == name }
            guard assets.count == 1, let asset = assets.first, asset.state == "uploaded",
                  asset.size > 0, asset.size <= 40_000_000,
                  asset.browser_download_url == download else { return nil }
            return MacRelease(version: version,
                              pageURL: URL(string: "https://github.com/\(repository)/releases/tag/v\(version)")!,
                              downloadURL: URL(string: download)!, bytes: asset.size)
        }
        guard let newest = candidates.max(by: { $0.version < $1.version }) else { throw ReleaseError.noMacRelease }
        return newest
    }
}
