// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "CircleBoxSDK",
    platforms: [
        .iOS(.v13),
        .macOS(.v12)
    ],
    products: [
        .library(name: "CircleBoxSDK", targets: ["CircleBoxSDK"])
    ],
    targets: [
        .target(
            name: "CircleBoxSDK",
            path: "Sources/CircleBoxSDK"
        ),
        .testTarget(
            name: "CircleBoxSDKTests",
            dependencies: ["CircleBoxSDK"],
            path: "Tests/CircleBoxSDKTests"
        )
    ]
)
