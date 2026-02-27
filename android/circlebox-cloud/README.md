# circlebox-cloud (Android)

Companion uploader module for CircleBox Cloud.

This module uploads CircleBox exports. It does not replace `circlebox-sdk`.

## Install (GitHub Release AAR, installable today)

### 1) Download artifacts from `v0.3.1`

- `circlebox-sdk-release.aar` (required)
- `circlebox-cloud-release.aar` (this module)

### 2) Copy to app module

- `<your-android-app>/app/libs/circlebox-sdk-release.aar`
- `<your-android-app>/app/libs/circlebox-cloud-release.aar`

### 3) Add repository + dependencies

`settings.gradle` (recommended for modern projects):

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

`app/build.gradle`:

```gradle
dependencies {
  implementation(name: "circlebox-sdk-release", ext: "aar")
  implementation(name: "circlebox-cloud-release", ext: "aar")
}
```

### 4) Add Android permissions (cloud mode)

In `app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

### 5) Build-check

```bash
./gradlew :app:assembleDebug
```

## Where To Initialize

Start both SDKs once in app startup, inside custom `Application.onCreate()`.

```kotlin
import android.app.Application
import com.circlebox.sdk.CircleBox
import com.circlebox.cloud.CircleBoxCloud
import com.circlebox.cloud.CircleBoxCloudConfig

class MyApp : Application() {
  override fun onCreate() {
    super.onCreate()
    CircleBox.start()
    CircleBoxCloud.start(
      CircleBoxCloudConfig(
        endpoint = "https://circlebox.seunjeremiah.workers.dev",
        ingestKey = "cb_live_project_key",
      )
    )
  }
}
```

In `AndroidManifest.xml`:

```xml
<application
    android:name=".MyApp"
    ... >
</application>
```

Call `CircleBoxCloud.start` once per process launch, after `CircleBox.start()`.

## Usage

Start core first, then cloud:

```kotlin
import com.circlebox.sdk.CircleBox
import com.circlebox.cloud.CircleBoxCloud
import com.circlebox.cloud.CircleBoxCloudConfig
import com.circlebox.cloud.CircleBoxCloudUsageMode

CircleBox.start()

CircleBoxCloud.start(
  CircleBoxCloudConfig(
    endpoint = "https://circlebox.seunjeremiah.workers.dev",
    ingestKey = "cb_live_project_key",
    flushIntervalSec = 15,
    enableAutoFlush = true,
    autoExportPendingOnStart = true,
    immediateFlushOnHighSignal = true,
    enableUsageBeacon = true,
    usageBeaconKey = "cb_usage_project_key",
    usageBeaconMode = CircleBoxCloudUsageMode.CORE_CLOUD,
  )
)

CircleBoxCloud.setUser("user-123")
CircleBoxCloud.captureAction("checkout_tapped")
CircleBoxCloud.flush()
```

Key rules:

- `ingestKey` must be `cb_live_*`
- `usageBeaconKey` must be `cb_usage_*` (only if usage beacon is enabled)

Behavior:

- Exports from CircleBox SDK
- Uploads summary payload first (`/v1/ingest/fragment`)
- Uploads full report next (`/v1/ingest/report`)
- Persists an upload queue at `files/circlebox/cloud/upload-queue.json`
- Sends `x-circlebox-idempotency-key` to make retries idempotent
- Automatically checks pending crash reports on start and app foreground transitions
- Automatically drains queued uploads every `flushIntervalSec` (15s default) while app is foregrounded
- Triggers immediate flush on high-signal events (`error`, `fatal`, `native_exception_prehook`) when enabled
- Automatic mode drains queue only; it does not create periodic live snapshots
- Optional usage-beacon telemetry (`/v1/telemetry/usage`) is opt-in via `enableUsageBeacon` + `usageBeaconKey`
- For self-host ingest, set `usageBeaconEndpoint` to CircleBox Worker to keep aggregate usage reporting enabled

## Troubleshooting

- `invalid_ingest_key`:
  ensure you are using an active `cb_live_*` key from the same control-plane project used by your Worker.
- Upload queue never drains:
  verify `INTERNET` + `ACCESS_NETWORK_STATE` permissions and correct `endpoint`.
- Crashes captured locally but not uploaded:
  confirm `CircleBox.start()` is called before `CircleBoxCloud.start()`.

## Standalone Validation

From this directory:

```bash
./scripts/package_check.sh
```
