# circlebox_flutter

Flutter bridge for CircleBox native SDKs.

## API

```dart
await CircleBox.start();
await CircleBox.breadcrumb('User started Checkout', attrs: {'flow': 'checkout'});
final pending = await CircleBox.hasPendingCrashReport();
final files = await CircleBox.exportLogs(formats: {CircleBoxExportFormat.json, CircleBoxExportFormat.csv});
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
