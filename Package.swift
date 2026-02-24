// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "CircleBox",
    platforms: [
        .iOS(.v13),
        .macOS(.v12)
    ],
    products: [
        .library(name: "CircleBoxSDK", targets: ["CircleBoxSDK"]),
        .library(name: "CircleBoxCloud", targets: ["CircleBoxCloud"]),
        .library(name: "CircleBoxIntegrations", targets: ["CircleBoxIntegrations"])
    ],
    targets: [
        .target(
            name: "CircleBoxSDK",
            path: "ios/CircleBoxSDK/Sources/CircleBoxSDK",
            linkerSettings: [
                .linkedLibrary("z")
            ]
        ),
        .target(
            name: "CircleBoxCloud",
            dependencies: ["CircleBoxSDK"],
            path: "ios/CircleBoxCloud/Sources/CircleBoxCloud"
        ),
        .target(
            name: "CircleBoxIntegrations",
            path: "integrations/ios/CircleBoxIntegrations/Sources/CircleBoxIntegrations"
        ),
        .testTarget(
            name: "CircleBoxSDKTests",
            dependencies: ["CircleBoxSDK"],
            path: "ios/CircleBoxSDK/Tests/CircleBoxSDKTests"
        ),
        .testTarget(
            name: "CircleBoxCloudTests",
            dependencies: ["CircleBoxCloud"],
            path: "ios/CircleBoxCloud/Tests/CircleBoxCloudTests"
        )
    ]
)
