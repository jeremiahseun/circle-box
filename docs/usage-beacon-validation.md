# Usage Beacon Validation (All SDK Families)

Use this checklist to validate usage beacon upload paths end-to-end for iOS, Android, Flutter, and React Native.

## Prerequisites

1. A project with active keys:
   - ingest: `cb_live_*`
   - usage beacon: `cb_usage_*`
2. Worker base URL (`https://<your-worker>.workers.dev`).
3. Dashboard access to `/app/projects/<project_id>/usage`.

## SDK Config Snippets

### iOS (`CircleBoxCloud`)

```swift
CircleBoxCloud.start(
    config: CircleBoxCloudConfig(
        endpoint: URL(string: "https://circlebox.seunjeremiah.workers.dev")!,
        ingestKey: "<cb_live_key>",
        enableUsageBeacon: true,
        usageBeaconKey: "<cb_usage_key>",
        usageBeaconMode: .coreCloud
    )
)
```

### Android (`circlebox-cloud`)

```kotlin
CircleBoxCloud.start(
    CircleBoxCloudConfig(
        endpoint = "https://circlebox.seunjeremiah.workers.dev",
        ingestKey = "<cb_live_key>",
        enableUsageBeacon = true,
        usageBeaconKey = "<cb_usage_key>",
        usageBeaconMode = CircleBoxCloudUsageMode.CORE_CLOUD
    )
)
```

### Flutter (`circlebox_cloud_flutter`)

```dart
await CircleBoxCloud.start(
  const CircleBoxCloudConfig(
    endpoint: Uri.parse('https://circlebox.seunjeremiah.workers.dev'),
    ingestKey: '<cb_live_key>',
    enableUsageBeacon: true,
    usageBeaconKey: '<cb_usage_key>',
    usageBeaconMode: CircleBoxCloudUsageMode.coreCloud,
  ),
);
```

### React Native (`circlebox-cloud-react-native`)

```ts
await CircleBoxCloud.start({
  endpoint: 'https://circlebox.seunjeremiah.workers.dev',
  ingestKey: '<cb_live_key>',
  enableUsageBeacon: true,
  usageBeaconKey: '<cb_usage_key>',
  usageBeaconMode: 'core_cloud',
});
```

## Validation Flow

1. Launch app with usage beacon enabled.
2. Trigger 2-3 breadcrumbs and one `flush()` (or crash + restart auto flush).
3. Keep app foregrounded for at least one beacon interval (`usageBeaconMinIntervalSec` default is `300`).
4. Open dashboard usage page:
   - `/app/projects/<project_id>/usage`
5. Confirm rows exist in **Usage Beacon Rows** with expected `sdk_family`:
   - `ios`
   - `android`
   - `flutter`
   - `react_native`
6. Revoke the `cb_usage_*` key and verify new beacons return `401 invalid_usage_key`.

## Automated Smoke Coverage

Use these scripts:

```bash
bash scripts/smoke_test_worker_ingest.sh --env-file .env.local --region us
bash scripts/smoke_test_worker_usage_telemetry.sh --env-file .env.local --region us
```

These cover:
- ingest acceptance + dedupe
- dashboard download token flow
- usage telemetry acceptance
- key auth negative paths (invalid key, wrong key type, revoked keys)
