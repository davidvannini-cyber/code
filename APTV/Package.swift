// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "APTVCore",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [
        .library(name: "APTVCore", targets: ["APTVCore"])
    ],
    targets: [
        .target(name: "APTVCore"),
        .testTarget(name: "APTVCoreTests", dependencies: ["APTVCore"])
    ]
)
