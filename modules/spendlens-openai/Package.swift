// swift-tools-version: 6.0
import PackageDescription
let package = Package(
  name: "SpendLensAuthCore",
  platforms: [.macOS(.v13), .iOS(.v16)],
  products: [.library(name: "SpendLensAuthCore", targets: ["SpendLensAuthCore"])],
  targets: [
    .target(name: "SpendLensAuthCore", path: "ios/Core"),
    .testTarget(name: "SpendLensAuthCoreTests", dependencies: ["SpendLensAuthCore"], path: "Tests")
  ],
  swiftLanguageModes: [.v5]
)
