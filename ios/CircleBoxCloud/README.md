# CircleBoxCloud (iOS)

Companion uploader package for CircleBox Cloud.

## Install (Swift Package)

Use the root repository package once:

```swift
.package(url: "https://github.com/jeremiahseun/circle-box.git", from: "0.3.1")
```

Then add product dependencies to your app target:
- `CircleBoxCloud`
- `CircleBoxSDK` (if your app also imports `CircleBoxSDK` directly)

Xcode path:
1. `File` -> `Add Package Dependencies...`
2. URL: `https://github.com/jeremiahseun/circle-box.git`
3. Version rule: `Up to Next Major` `0.3.1`
4. Select `CircleBoxCloud` (and `CircleBoxSDK` if needed)

Do not add separate package URLs for `ios/CircleBoxSDK` or `ios/CircleBoxCloud` in the same app graph; use the root package URL only.

## Install (CocoaPods)

```ruby
pod 'CircleBoxCloud', '~> 0.3.1'
```

## Where To Initialize

Start core SDK first, then start cloud companion in the same startup path.

### SwiftUI app

```swift
import SwiftUI
import CircleBoxSDK
import CircleBoxCloud

@main
struct MyApp: App {
    init() {
        CircleBox.start(config: .default)
        CircleBoxCloud.start(
            config: CircleBoxCloudConfig(
                endpoint: URL(string: "https://circlebox.seunjeremiah.workers.dev")!,
                ingestKey: "cb_live_project_key"
            )
        )
    }

    var body: some Scene {
        WindowGroup { ContentView() }
    }
}
```

### UIKit app

```swift
import UIKit
import CircleBoxSDK
import CircleBoxCloud

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        CircleBox.start(config: .default)
        CircleBoxCloud.start(
            config: CircleBoxCloudConfig(
                endpoint: URL(string: "https://circlebox.seunjeremiah.workers.dev")!,
                ingestKey: "cb_live_project_key"
            )
        )
        return true
    }
}
```

Call `CircleBoxCloud.start` once per process launch.

## Usage

```swift
import CircleBoxCloud

CircleBoxCloud.start(
    config: CircleBoxCloudConfig(
        endpoint: URL(string: "https://api.circlebox.dev")!,
        ingestKey: "cb_live_project_key",
        flushIntervalSec: 15,
        enableAutoFlush: true,
        autoExportPendingOnStart: true,
        immediateFlushOnHighSignal: true,
        enableUsageBeacon: true,
        usageBeaconKey: "cb_usage_project_key",
        usageBeaconMode: .coreCloud
    )
)

CircleBoxCloud.setUser(id: "user-123")
CircleBoxCloud.captureAction(name: "checkout_tapped")

let uploaded = try await CircleBoxCloud.flush()
print(uploaded)
```

Behavior:
- Reads CircleBox exports
- Sends summary payload first (`/v1/ingest/fragment`)
- Sends full report next (`/v1/ingest/report`)
- Persists an on-device upload queue at `Application Support/CircleBox/Cloud/upload-queue.json`
- Uses `x-circlebox-idempotency-key` so retries are deduplicated server-side
- Automatically checks pending crash reports on start and foreground resume
- Automatically drains queued uploads every `flushIntervalSec` (15s default) while app is active
- Triggers immediate flush on high-signal events (`error`, `fatal`, `native_exception_prehook`) when enabled
- Automatic mode drains queue only; it does not create periodic live snapshots
- Optional usage-beacon telemetry (`/v1/telemetry/usage`) is opt-in via `enableUsageBeacon` + `usageBeaconKey`
- For self-host ingest, set `usageBeaconEndpoint` to CircleBox Worker to keep aggregate usage reporting enabled
- Cloud mode requires `cb_live_*` ingest keys; usage beacons require `cb_usage_*`

## Standalone Validation

From this directory:

```bash
./scripts/package_check.sh
```

If you extract this package to its own repository (no sibling `../CircleBoxSDK` path),
resolve dependencies with:

```bash
CIRCLEBOX_FORCE_REMOTE_SDK=1 swift package resolve
```
