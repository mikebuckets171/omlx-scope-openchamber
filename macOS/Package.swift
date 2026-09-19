// swift-tools-version: 5.10
import PackageDescription
import Foundation

var dependencies: [Package.Dependency] = []
var products: [Product] = [.library(name: "ScopeCore", targets: ["ScopeCore"])]
var targets: [Target] = [
    .target(name: "ScopeCore"),
    .testTarget(name: "ScopeCoreTests", dependencies: ["ScopeCore"])
]
#if os(macOS)
// Preview builds discover releases without embedding an inactive installer.
let signedUpdates = ProcessInfo.processInfo.environment["SCOPE_DISTRIBUTION"] == "developer-id"
var macDependencies: [Target.Dependency] = ["ScopeCore"]
var macSettings: [SwiftSetting] = []
if signedUpdates {
    dependencies.append(.package(url: "https://github.com/sparkle-project/Sparkle", exact: "2.10.0"))
    macDependencies.append(.product(name: "Sparkle", package: "Sparkle"))
    macSettings.append(.define("SCOPE_SIGNED_UPDATES"))
}
products.append(.executable(name: "OMLXScope", targets: ["OMLXScope"]))
products.append(.executable(name: "ScopePreview", targets: ["ScopePreview"]))
targets += [
    .target(name: "ScopeMac", dependencies: macDependencies, swiftSettings: macSettings),
    .executableTarget(name: "OMLXScope", dependencies: ["ScopeMac"]),
    // Developer-only renderer; never included in the app bundle.
    .executableTarget(name: "ScopePreview", dependencies: ["ScopeMac", "ScopeCore"]),
    .testTarget(name: "ScopeMacTests", dependencies: ["ScopeMac", "ScopeCore"])
]
#endif
let package = Package(name: "OMLXScope", platforms: [.macOS(.v14)],
                      products: products, dependencies: dependencies, targets: targets)
