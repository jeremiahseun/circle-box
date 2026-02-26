# CircleBoxCloud (iOS)

Companion uploader package for CircleBox Cloud.

## Install (Swift Package)

Use the root repository package:

```swift
.package(url: "https://github.com/jeremiahseun/circle-box.git", from: "0.3.1")
```

Then add product dependency: `CircleBoxCloud`.

## Usage

```swift
import CircleBoxCloud

CircleBoxCloud.start(
    config: CircleBoxCloudConfig(
        endpoint: URL(string: "https://api.circlebox.dev")!,
        ingestKey: "cb_live_project_key",
        enableAutoFlush: true,
        autoExportPendingOnStart: true,
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
- Automatically drains queued uploads on `flushIntervalSec` while app is active
- Automatic mode drains queue only; it does not create periodic live snapshots
- Optional usage-beacon telemetry (`/v1/telemetry/usage`) is opt-in via `enableUsageBeacon` + `usageBeaconKey`
- For self-host ingest, set `usageBeaconEndpoint` to CircleBox Worker to keep aggregate usage reporting enabled

## Standalone Validation

From this directory:

```bash
./scripts/package_check.sh
```
