// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "CircleBoxCloud",
    platforms: [
        .iOS(.v13),
        .macOS(.v12)
    ],
    products: [
        .library(name: "CircleBoxCloud", targets: ["CircleBoxCloud"])
    ],
    dependencies: [
        .package(path: "../CircleBoxSDK")
    ],
    targets: [
        .target(
            name: "CircleBoxCloud",
            dependencies: [
                .product(name: "CircleBoxSDK", package: "CircleBoxSDK")
            ],
            path: "Sources/CircleBoxCloud"
        ),
        .testTarget(
            name: "CircleBoxCloudTests",
            dependencies: ["CircleBoxCloud"],
            path: "Tests/CircleBoxCloudTests"
        )
    ]
)
