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

## Install

```bash
npm install circlebox-react-native
```

Installable-today release path (without npm publish):

```bash
npm install ./circlebox-react-native-0.3.1.tgz
```

For Expo prebuild apps, add plugin in `app.json`:

```json
{
  "expo": {
    "plugins": ["circlebox-react-native"]
  }
}
```

iOS linking:

- Published flow: `circlebox-react-native` depends on CocoaPods package `CircleBoxSDK`.
- Local monorepo flow: Expo plugin auto-injects `pod 'CircleBoxSDK', :path => '<repo-root>'` during prebuild.

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

## Notes

- Core CircleBox SDKs remain dependency-free from Sentry/PostHog.
- If native `CircleBoxSDK`/`com.circlebox.sdk` is not linked, methods reject with `missing_native_sdk`.
- `debugSnapshot` returns data only when native SDK is started with debug viewer enabled.

## Standalone Validation

From this directory:

```bash
./scripts/package_check.sh
```
