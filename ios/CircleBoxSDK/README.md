# CircleBoxSDK (iOS)

Native CircleBox core SDK for iOS.

## Install (Swift Package)

### Xcode App Project (Recommended)

1. Open your app in Xcode.
2. Go to `File` -> `Add Package Dependencies...`.
3. Enter repository URL:
   `https://github.com/jeremiahseun/circle-box.git`
4. Set dependency rule to `Up to Next Major` and version `0.3.1`.
5. In product selection, add:
   - `CircleBoxSDK` (required)
   - `CircleBoxCloud` (optional)
   - `CircleBoxIntegrations` (optional)
6. Ensure you added only one package reference (`circle-box`).

Do not add `ios/CircleBoxSDK` and `ios/CircleBoxCloud` as separate package URLs in the same app, or Xcode will report target name conflicts.

### Package.swift Manifest

```swift
.package(url: "https://github.com/jeremiahseun/circle-box.git", from: "0.3.1")
```

Add product dependency: `CircleBoxSDK`.

## Install (CocoaPods)

```ruby
pod 'CircleBoxSDK', '~> 0.3.1'
```

## Where To Initialize

Initialize once at app startup, before user flows begin.

### SwiftUI app

```swift
import SwiftUI
import CircleBoxSDK

@main
struct MyApp: App {
    init() {
        CircleBox.start(config: .default)
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
```

### UIKit app

```swift
import UIKit
import CircleBoxSDK

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        CircleBox.start(config: .default)
        return true
    }
}
```

Call `CircleBox.start` once per process launch.

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
