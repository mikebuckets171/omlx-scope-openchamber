// swift-tools-version: 5.10
import PackageDescription

var dependencies: [Package.Dependency] = []
var products: [Product] = [.library(name: "ScopeCore", targets: ["ScopeCore"])]
var targets: [Target] = [
    .target(name: "ScopeCore"),
    .testTarget(name: "ScopeCoreTests", dependencies: ["ScopeCore"])
]
#if os(macOS)
dependencies.append(.package(url: "https://github.com/sparkle-project/Sparkle", exact: "2.10.0"))
products.append(.executable(name: "OMLXScope", targets: ["OMLXScope"]))
products.append(.executable(name: "ScopePreview", targets: ["ScopePreview"]))
targets += [
    .target(name: "ScopeMac", dependencies: ["ScopeCore", .product(name: "Sparkle", package: "Sparkle")]),
    .executableTarget(name: "OMLXScope", dependencies: ["ScopeMac"]),
    // Developer-only renderer; never included in the app bundle.
    .executableTarget(name: "ScopePreview", dependencies: ["ScopeMac", "ScopeCore"]),
    .testTarget(name: "ScopeMacTests", dependencies: ["ScopeMac", "ScopeCore"])
]
#endif
let package = Package(name: "OMLXScope", platforms: [.macOS(.v14)],
                      products: products, dependencies: dependencies, targets: targets)
