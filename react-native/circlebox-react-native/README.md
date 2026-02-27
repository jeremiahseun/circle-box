# circlebox-react-native

React Native bridge for CircleBox native SDKs (iOS + Android).

This package exposes parity APIs with native CircleBox:

- `CircleBox.start(config?)`
- `CircleBox.breadcrumb(message, attrs?)`
- `CircleBox.exportLogs(formats?)`
- `CircleBox.hasPendingCrashReport()`
- `CircleBox.clearPendingCrashReport()`

It also provides automatic JS error hooks that chain existing handlers:

- Global JS exception handler (`ErrorUtils`)
- Unhandled promise rejection hooks (best effort)
- Realtime adapter helpers for forwarding high-signal events with CircleBox attribution fields

## Install (installable today via release `.tgz`)

CircleBox RN packages are distributed from GitHub release assets.

### 1) Download package file from release `v0.3.1`

- `circlebox-react-native-0.3.1.tgz`

### 2) Install in your RN app

From your React Native app root:

```bash
npm install ./circlebox-react-native-0.3.1.tgz
```

### 3) iOS native install

```bash
cd ios
pod install --repo-update
cd ..
```

### 4) Expo prebuild apps only

Add plugin in `app.json` (or `app.config.ts`):

```json
{
  "expo": {
    "plugins": ["circlebox-react-native"]
  }
}
```

Then regenerate native projects:

```bash
npx expo prebuild --clean
```

Notes:

- Published flow: `circlebox-react-native` depends on CocoaPods package `CircleBoxSDK`.
- Local monorepo flow: Expo plugin auto-injects `pod 'CircleBoxSDK', :path => '<repo-root>'` during prebuild.

## Where To Initialize

Initialize once during app bootstrap (before normal app usage begins).

### Bare React Native (`index.js` / `index.ts`)

```ts
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { CircleBox } from 'circlebox-react-native';

async function bootstrap() {
  await CircleBox.start({
    bufferCapacity: 200,
    installReactNativeErrorHooks: true,
  });
  AppRegistry.registerComponent(appName, () => App);
}

void bootstrap();
```

### Expo / App entry (`App.tsx`)

```ts
import { useEffect } from 'react';
import { CircleBox } from 'circlebox-react-native';

export default function App() {
  useEffect(() => {
    void CircleBox.start({
      bufferCapacity: 200,
      installReactNativeErrorHooks: true,
    });
  }, []);

  return null;
}
```

Call `CircleBox.start` once per launch.

## Usage

```ts
import { CircleBox, attachRealtimeForwarders } from 'circlebox-react-native';

await CircleBox.start({
  bufferCapacity: 200,
  enableDebugViewer: true,
  installReactNativeErrorHooks: true,
});

await CircleBox.breadcrumb('User started Checkout', { flow: 'checkout' });

if (await CircleBox.hasPendingCrashReport()) {
  const files = await CircleBox.exportLogs(['json', 'csv', 'summary']);
  console.log(files);
}

const sub = attachRealtimeForwarders({
  onSentryBreadcrumb: (breadcrumb) => {
    console.log('sentry breadcrumb', breadcrumb);
  },
  onPostHogCapture: (event) => {
    console.log('posthog event', event);
  },
});

// later
sub.remove();
```

## Required app permissions

For cloud upload package (`circlebox-cloud-react-native`), ensure Android app has:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

## Notes

- Core CircleBox SDKs remain dependency-free from Sentry/PostHog.
- If native `CircleBoxSDK`/`com.circlebox.sdk` is not linked, methods reject with `missing_native_sdk`.
- `debugSnapshot` returns data only when native SDK is started with debug viewer enabled.

## Troubleshooting

- `Unable to resolve "circlebox-react-native"`:
  clear Metro cache and restart (`npx expo start --clear`).
- `ReactAppDependencyProvider` pod error after Expo prebuild:
  ensure Expo/RN versions are compatible, reinstall dependencies, run `npx expo prebuild --clean`.
- iOS bridge compiles but native module missing:
  run `pod install --repo-update` in `ios/` and rebuild.

## Standalone Validation

From this directory:

```bash
./scripts/package_check.sh
```
