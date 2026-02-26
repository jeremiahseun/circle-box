# circlebox_cloud_flutter

Companion uploader package for CircleBox Cloud.

## Install (Git tag + monorepo path)

```yaml
dependencies:
  circlebox_cloud_flutter:
    git:
      url: https://github.com/jeremiahseun/circle-box.git
      ref: v0.3.1
      path: flutter/circlebox_cloud_flutter
```

`circlebox_cloud_flutter` depends on `circlebox_flutter` from the same tagged repository path:

```yaml
dependencies:
  circlebox_flutter:
    git:
      url: https://github.com/jeremiahseun/circle-box.git
      ref: v0.3.1
      path: flutter/circlebox_flutter
```

## Usage

```dart
await CircleBoxCloud.start(
  const CircleBoxCloudConfig(
    endpoint: Uri.parse('https://api.circlebox.dev'),
    ingestKey: 'cb_live_project_key',
    enableAutoFlush: true,
    autoExportPendingOnStart: true,
    enableUsageBeacon: true,
    usageBeaconKey: 'cb_usage_project_key',
    usageBeaconMode: CircleBoxCloudUsageMode.coreCloud,
  ),
);

await CircleBoxCloud.setUser('user-123');
await CircleBoxCloud.captureAction('checkout_button_tapped');

final files = await CircleBoxCloud.flush();
print(files);
```

Behavior:
- Exports summary + gzipped report from `circlebox_flutter`
- Persists an upload queue at `.../circlebox/cloud/upload-queue.json`
- Sends `x-circlebox-idempotency-key` for server-side dedupe
- Automatically checks pending crash reports on startup and app resume
- Automatically drains queued uploads on `flushIntervalSec` while app is active
- Automatic mode drains queue only; it does not create periodic live snapshots
- Optional usage-beacon telemetry (`/v1/telemetry/usage`) is opt-in via `enableUsageBeacon` + `usageBeaconKey`
- For self-host ingest, set `usageBeaconEndpoint` to CircleBox Worker to keep aggregate usage reporting enabled

## Standalone Validation

From this directory:

```bash
./scripts/package_check.sh
```
