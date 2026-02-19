// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "CircleBoxIntegrations",
    platforms: [
        .iOS(.v13),
        .macOS(.v12)
    ],
    products: [
        .library(name: "CircleBoxIntegrations", targets: ["CircleBoxIntegrations"])
    ],
    targets: [
        .target(
            name: "CircleBoxIntegrations",
            path: "Sources/CircleBoxIntegrations"
        )
    ]
)
