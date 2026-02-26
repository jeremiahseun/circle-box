// swift-tools-version: 5.9
import PackageDescription
import Foundation

private let localSDKPath = "../CircleBoxSDK"
private let useLocalSDK = FileManager.default.fileExists(atPath: localSDKPath)
private let sdkPackageDependency: Package.Dependency = useLocalSDK
    ? .package(path: localSDKPath)
    : .package(url: "https://github.com/jeremiahseun/circle-box.git", from: "0.3.1")
private let sdkPackageName = useLocalSDK ? "CircleBoxSDK" : "circle-box"

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
        sdkPackageDependency
    ],
    targets: [
        .target(
            name: "CircleBoxCloud",
            dependencies: [
                .product(name: "CircleBoxSDK", package: sdkPackageName)
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
