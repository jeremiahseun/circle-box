# circlebox-cloud-react-native

Companion uploader for sending CircleBox exports to CircleBox Cloud.

## Install (release tarballs)

### 1) Download release assets (`v0.3.1`)

- `circlebox-react-native-0.3.1.tgz`
- `circlebox-cloud-react-native-0.3.1.tgz`

### 2) Install in your RN app

```bash
npm install ./circlebox-react-native-0.3.1.tgz
npm install ./circlebox-cloud-react-native-0.3.1.tgz
```

`circlebox-react-native` is a required peer dependency and must be installed before this package.

### 3) iOS native install

```bash
cd ios
pod install --repo-update
cd ..
```

### 4) Android permissions (cloud mode)

Ensure `android/app/src/main/AndroidManifest.xml` includes:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

## Where To Initialize

Initialize once during app bootstrap, after `CircleBox.start(...)`.

### Bare React Native

```ts
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { CircleBox } from 'circlebox-react-native';
import * as CircleBoxCloud from 'circlebox-cloud-react-native';

async function bootstrap() {
  await CircleBox.start();
  await CircleBoxCloud.start({
    endpoint: 'https://circlebox.seunjeremiah.workers.dev',
    ingestKey: 'cb_live_project_key',
  });
  AppRegistry.registerComponent(appName, () => App);
}

void bootstrap();
```

### Expo / `App.tsx`

```ts
import { useEffect } from 'react';
import { CircleBox } from 'circlebox-react-native';
import * as CircleBoxCloud from 'circlebox-cloud-react-native';

export default function App() {
  useEffect(() => {
    void (async () => {
      await CircleBox.start();
      await CircleBoxCloud.start({
        endpoint: 'https://circlebox.seunjeremiah.workers.dev',
        ingestKey: 'cb_live_project_key',
      });
    })();
  }, []);

  return null;
}
```

Call `CircleBoxCloud.start` once per launch.

## Usage

```ts
import * as CircleBoxCloud from 'circlebox-cloud-react-native';
import { CircleBox } from 'circlebox-react-native';

await CircleBox.start();

await CircleBoxCloud.start({
  endpoint: 'https://circlebox.seunjeremiah.workers.dev',
  ingestKey: 'cb_live_project_key',
  flushIntervalSec: 15,
  enableAutoFlush: true,
  autoExportPendingOnStart: true,
  immediateFlushOnHighSignal: true,
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
- Automatically drains queued uploads every `flushIntervalSec` (15s default) while app is active
- Best-effort immediate flush on high-signal events (`error`, `fatal`, `native_exception_prehook`) when realtime listener stream is available
- Automatic mode drains queue only; it does not create periodic live snapshots
- Optional usage-beacon telemetry (`/v1/telemetry/usage`) is opt-in via `enableUsageBeacon` + `usageBeaconKey`
- For self-host ingest, set `usageBeaconEndpoint` to CircleBox Worker to keep aggregate usage reporting enabled
- Cloud mode requires `cb_live_*` ingest keys; usage beacons require `cb_usage_*`

## Key rules

- `ingestKey` must be an active `cb_live_*` key.
- `usageBeaconKey` must be an active `cb_usage_*` key when `enableUsageBeacon` is true.

## Troubleshooting

- `invalid_ingest_key`:
  key is missing/revoked/wrong region or from a different control-plane project.
- Upload queue grows and never drains:
  verify endpoint URL, Android network permissions, and app connectivity.
- Queue persistence not retained across app restarts:
  install `@react-native-async-storage/async-storage` in host app.

## Standalone Validation

From this directory:

```bash
./scripts/package_check.sh
```
