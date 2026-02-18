# CircleBox

CircleBox is a native flight recorder SDK for mobile apps.

It captures low-level runtime context into a fixed-size ring buffer and flushes crash-time context to `.circlebox` files that can be exported as JSON and CSV.

## Why CircleBox

Crash stack traces tell you where a crash happened. CircleBox helps explain what happened before it.

CircleBox records environmental transitions such as memory pressure, thermal changes, connectivity changes, battery state, lifecycle events, and custom breadcrumbs, then preserves the latest timeline around a crash.

## Core Features

- Fixed-size in-memory ring buffer (default: 50 events)
- Crash pre-hook flush to local `.circlebox` file
- iOS hard-crash marker capture for signal crashes (`SIGABRT`, `SIGSEGV`, `SIGBUS`, `SIGILL`, `SIGTRAP`, `SIGFPE`)
- Pending crash report detection on next launch
- JSON and CSV export APIs
- Compressed exports (`json_gzip`, `csv_gzip`) and summary export (`summary`)
- Automatic system signal tracking on iOS and Android
- Flutter bridge for cross-platform apps
- Naming guard to enforce `CircleBox` naming consistency

## Signals Captured

CircleBox captures these categories in v1:

1. Thermal state transitions
2. Memory pressure notifications
3. Connectivity transitions
4. Battery level and low-power mode
5. Main-thread contention (jank > configured threshold)
6. Permission changes (location/camera)
7. Background/foreground lifecycle transitions
8. Disk space samples
9. Native exception pre-hook event
10. Custom breadcrumb events

## Architecture

### Ring Buffer

CircleBox uses a fixed-capacity circular buffer.

- New events append in O(1)
- When capacity is reached, the oldest event is overwritten
- Memory use stays bounded and predictable

### Crash Persistence

On uncaught crash paths:

- CircleBox appends a final `native_exception_prehook` event
- Snapshots in-memory events
- Performs atomic file write to `pending/latest.circlebox`
- Chains to previously installed crash handlers

### Export

`exportLogs()` writes report files to SDK-managed app storage:

- JSON: structured envelope + events
- CSV: flattened event rows for quick inspection/import

## Repository Structure

- `ios/CircleBoxSDK` - Swift Package implementation
- `android/circlebox-sdk` - Android/Kotlin library implementation
- `flutter/circlebox_flutter` - Flutter bridge plugin
- `samples/ios-chaos-app` - iOS sample scaffold
- `samples/android-chaos-app` - Android sample app
- `docs/schema-v1.md` - schema reference
- `docs/phase1-closeout.md` - Phase 1 acceptance and sign-off checklist
- `scripts/check_naming.sh` - naming guard script
- `.github/workflows` - CI workflows

## Platform Support

- iOS 13+
- Android API 23+
- Flutter 3.22+ for bridge package

## Quick Start

### iOS (Swift Package)

Add `CircleBoxSDK` to your app, then call:

```swift
import CircleBoxSDK

CircleBox.start(config: .default)
CircleBox.breadcrumb("User started Checkout", attrs: ["flow": "checkout"])

if CircleBox.hasPendingCrashReport() {
    let files = try CircleBox.exportLogs(formats: [.json, .csv])
    print(files)
}
```

Signal crash capture is enabled by default on iOS and can be disabled:

```swift
CircleBox.start(config: CircleBoxConfig(enableSignalCrashCapture: false))
```

### Android (Kotlin)

Include `circlebox-sdk` in your app build, then call:

```kotlin
import com.circlebox.sdk.CircleBox
import com.circlebox.sdk.CircleBoxExportFormat

CircleBox.start()
CircleBox.breadcrumb("User started Checkout", mapOf("flow" to "checkout"))

if (CircleBox.hasPendingCrashReport()) {
    val files = CircleBox.exportLogs(setOf(CircleBoxExportFormat.JSON, CircleBoxExportFormat.CSV))
    println(files)
}
```

### Flutter

Use the bridge API:

```dart
import 'package:circlebox_flutter/circlebox_flutter.dart';

await CircleBox.start();
await CircleBox.breadcrumb('User started Checkout', attrs: {'flow': 'checkout'});

if (await CircleBox.hasPendingCrashReport()) {
  final files = await CircleBox.exportLogs(
    formats: {
      CircleBoxExportFormat.json,
      CircleBoxExportFormat.csv,
      CircleBoxExportFormat.jsonGzip,
      CircleBoxExportFormat.csvGzip,
      CircleBoxExportFormat.summary,
    },
  );
  print(files);
}
```

You can increase ring-buffer depth from Flutter:

```dart
await CircleBox.start(config: const CircleBoxConfig(bufferCapacity: 200));
```

## Public API Summary

### iOS

- `CircleBox.start(config:)`
- `CircleBox.breadcrumb(_:attrs:)`
- `CircleBox.exportLogs(formats:) -> [URL]`
- `CircleBox.hasPendingCrashReport() -> Bool`
- `CircleBox.clearPendingCrashReport()`

### Android

- `CircleBox.start(config)`
- `CircleBox.breadcrumb(message, attrs)`
- `CircleBox.exportLogs(formats) -> List<File>`
- `CircleBox.hasPendingCrashReport() -> Boolean`
- `CircleBox.clearPendingCrashReport()`

### Flutter

- `CircleBox.start(config)`
- `CircleBox.breadcrumb(message, attrs)`
- `CircleBox.exportLogs(formats) -> List<String>`
- `CircleBox.hasPendingCrashReport() -> bool`
- `CircleBox.clearPendingCrashReport()`

## Export Schema

See `docs/schema-v1.md` for complete details.

Key fields:

- Envelope: `schema_version`, `session_id`, `platform`, app/device metadata, `events[]`
- Event: `seq`, `timestamp_unix_ms`, `uptime_ms`, `type`, `thread`, `severity`, `attrs`

CSV columns:

- `seq,timestamp_unix_ms,uptime_ms,type,thread,severity,attrs_json`

## Chaos Test Apps

### Android

```bash
cd samples/android-chaos-app
gradle :app:installDebug
```

### iOS

```bash
cd samples/ios-chaos-app
xcodegen generate
open CircleBoxChaosApp.xcodeproj
```

Manual flow:

1. Trigger multiple mock chaos events
2. Trigger hard crash
3. Relaunch app
4. Detect pending report and export JSON/CSV
5. Verify event sequence near crash

## Development

### Naming Guard

```bash
bash scripts/check_naming.sh
```

### iOS Tests

```bash
cd ios/CircleBoxSDK
swift test
```

### Flutter Analyze + Tests

```bash
cd flutter/circlebox_flutter
flutter analyze
flutter test
```

### Android

If `gradle` is installed:

```bash
cd android/circlebox-sdk
gradle test
gradle assembleRelease
```

## CI Workflows

- `naming.yml` - naming policy enforcement
- `ios.yml` - Swift build/test + artifact upload
- `android.yml` - Gradle test/release assemble + AAR upload
- `flutter.yml` - Flutter analyze/test + plugin artifact upload

## Privacy and Safety Defaults

- Attribute sanitization is enabled by default
- Common sensitive patterns are redacted
- Long attribute values are truncated
- No network transfer is performed by default

## Naming Policy

`CircleBox` naming is enforced repository-wide.

Run:

```bash
bash scripts/check_naming.sh
```

Migration notes live in `docs/migration.md`.

## License

MIT
