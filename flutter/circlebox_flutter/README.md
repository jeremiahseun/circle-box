# circlebox_flutter

Flutter bridge for CircleBox native SDKs.

## Install (Git tag + monorepo path)

```yaml
dependencies:
  circlebox_flutter:
    git:
      url: https://github.com/jeremiahseun/circlebox.git
      ref: v0.3.0
      path: flutter/circlebox_flutter
```

## API

```dart
await CircleBox.start(config: const CircleBoxConfig(bufferCapacity: 200));
await CircleBox.breadcrumb('User started Checkout', attrs: {'flow': 'checkout'});
final pending = await CircleBox.hasPendingCrashReport();
final files = await CircleBox.exportLogs(
  formats: {
    CircleBoxExportFormat.json,
    CircleBoxExportFormat.csv,
    CircleBoxExportFormat.jsonGzip,
    CircleBoxExportFormat.csvGzip,
    CircleBoxExportFormat.summary,
  },
);
```

## Automatic Flutter Error Hooks

`CircleBox.start()` installs Flutter error hooks by default and records uncaught Dart/Flutter failures as CircleBox breadcrumbs (`flutter_exception`):

- `FlutterError.onError` (framework errors)
- `PlatformDispatcher.instance.onError` (async uncaught errors)
- `Isolate.current.addErrorListener` (current isolate uncaught errors)

You can customize behavior:

```dart
await CircleBox.start(
  config: const CircleBoxConfig(
    installFlutterErrorHooks: true,
    captureSilentFlutterErrors: false,
    captureCurrentIsolateErrors: true,
  ),
);
```

## Native SDK Requirement

This plugin calls native `CircleBox` implementations.

- Android: include `com.circlebox.sdk` library in host app.
- iOS: link `CircleBoxSDK` into host app target.

## Optional Add-ons

- Cloud uploader: `circlebox_cloud_flutter`
- Sentry/PostHog adapters: `circlebox_adapters`
