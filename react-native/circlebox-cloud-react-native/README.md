# circlebox-cloud-react-native

Companion uploader for sending CircleBox exports to CircleBox Cloud.

## Install (release tarball)

```bash
npm install ./circlebox-react-native-0.3.1.tgz
npm install ./circlebox-cloud-react-native-0.3.1.tgz
```

`circlebox-react-native` is a required peer dependency and must be installed before this package.

## Usage

```ts
import * as CircleBoxCloud from 'circlebox-cloud-react-native';

await CircleBoxCloud.start({
  endpoint: 'https://api.circlebox.dev',
  ingestKey: 'cb_live_project_key',
  enableAutoFlush: true,
  autoExportPendingOnStart: true,
  enableUsageBeacon: true,
  usageBeaconKey: 'cb_usage_project_key',
  usageBeaconMode: 'core_cloud',
});

await CircleBoxCloud.setUser('user-123');
await CircleBoxCloud.captureAction('checkout_tapped');

await CircleBoxCloud.flush();
```

Behavior:
- Queues uploads in memory by default, and persists queue if host app provides `@react-native-async-storage/async-storage`
- Sends summary first, then full report
- Uses `x-circlebox-idempotency-key` to deduplicate retry uploads
- Automatically checks pending crash reports on startup and app foreground transitions
- Automatically drains queued uploads on `flushIntervalSec` while app is active
- Automatic mode drains queue only; it does not create periodic live snapshots
- Optional usage-beacon telemetry (`/v1/telemetry/usage`) is opt-in via `enableUsageBeacon` + `usageBeaconKey`
- For self-host ingest, set `usageBeaconEndpoint` to CircleBox Worker to keep aggregate usage reporting enabled

## Standalone Validation

From this directory:

```bash
./scripts/package_check.sh
```
