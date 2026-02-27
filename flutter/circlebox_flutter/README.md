# circlebox_flutter

Flutter bridge for CircleBox native SDKs.

## Install (Git tag + monorepo path, installable today)

### 1) Add dependency in `pubspec.yaml`

```yaml
dependencies:
  circlebox_flutter:
    git:
      url: https://github.com/jeremiahseun/circle-box.git
      ref: v0.3.1
      path: flutter/circlebox_flutter
```

### 2) Fetch packages

```bash
flutter pub get
```

### 3) Add native CircleBox dependencies (required)

`circlebox_flutter` is a bridge. Your host app must include native CircleBox SDKs.

#### Android host app

1. Download release artifacts:
   - `circlebox-sdk-release.aar`
   - `circlebox-cloud-release.aar` (optional; required only if using cloud upload)
2. Place files in:
   - `<flutter-app>/android/app/libs/`
3. Add repository in `<flutter-app>/android/settings.gradle`:

```gradle
dependencyResolutionManagement {
  repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
  repositories {
    google()
    mavenCentral()
    flatDir {
      dirs("$rootDir/app/libs")
    }
  }
}
```

4. Add dependencies in `<flutter-app>/android/app/build.gradle`:

```gradle
dependencies {
  implementation(name: "circlebox-sdk-release", ext: "aar")
  // Optional if using cloud uploader:
  implementation(name: "circlebox-cloud-release", ext: "aar")
}
```

5. If using cloud uploader, add permissions in
   `<flutter-app>/android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

#### iOS host app

1. Open `<flutter-app>/ios/Runner.xcworkspace` in Xcode.
2. `File` -> `Add Package Dependencies...`
3. URL: `https://github.com/jeremiahseun/circle-box.git`
4. Version rule: `Up to Next Major` with `0.3.1`
5. Add product:
   - `CircleBoxSDK` (required)
   - `CircleBoxCloud` (optional if using cloud)
6. Run:

```bash
cd ios
pod install --repo-update
```

## Where To Initialize

Initialize once in `main()` before `runApp`.

```dart
import 'package:flutter/widgets.dart';
import 'package:circlebox_flutter/circlebox_flutter.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await CircleBox.start(config: const CircleBoxConfig(bufferCapacity: 200));
  runApp(const MyApp());
}
```

If you also use cloud uploader, start `CircleBoxCloud` immediately after `CircleBox.start` in the same `main()` bootstrap.

Avoid calling `CircleBox.start` repeatedly from rebuilt widgets.

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

## Optional Add-ons

- Cloud uploader: `circlebox_cloud_flutter`
- Sentry/PostHog adapters: `circlebox_adapters`

## Troubleshooting

- `Missing package product 'CircleBoxSDK'` (iOS):
  add the root package URL once and select `CircleBoxSDK` product for Runner target.
- `missing_native_sdk` at runtime:
  native Android/iOS dependencies are not linked yet.
- Android build cannot resolve AAR:
  confirm `flatDir` points to `app/libs` and artifact names match exactly.

## Standalone Validation

From this directory:

```bash
./scripts/package_check.sh
```
