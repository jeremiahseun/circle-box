# CircleBoxSDK (iOS)

Native CircleBox core SDK for iOS.

## Install (Swift Package)

```swift
.package(url: "https://github.com/jeremiahseun/circle-box.git", from: "0.3.1")
```

Add product dependency: `CircleBoxSDK`.

## Install (CocoaPods)

```ruby
pod 'CircleBoxSDK', '~> 0.3.1'
```

## Usage

```swift
import CircleBoxSDK

CircleBox.start(config: .default)
CircleBox.breadcrumb("checkout_started", attrs: ["flow": "standard"])

if CircleBox.hasPendingCrashReport() {
    let files = try CircleBox.exportLogs(formats: [.json, .csv, .jsonGzip, .summary])
    print(files)
}
```

Signal crash capture is enabled by default and can be disabled:

```swift
CircleBox.start(config: CircleBoxConfig(enableSignalCrashCapture: false))
```

## Standalone Validation

From this directory:

```bash
./scripts/package_check.sh
```
