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

## Install

```bash
npm install circlebox-react-native
```

For Expo prebuild apps, add plugin in `app.json`:

```json
{
  "expo": {
    "plugins": ["circlebox-react-native"]
  }
}
```

## Usage

```ts
import { CircleBox } from 'circlebox-react-native';

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
```

## Notes

- Core CircleBox SDKs remain dependency-free from Sentry/PostHog.
- If native `CircleBoxSDK`/`com.circlebox.sdk` is not linked, methods reject with `missing_native_sdk`.
- `debugSnapshot` returns data only when native SDK is started with debug viewer enabled.
