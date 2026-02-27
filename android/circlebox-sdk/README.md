# circlebox-sdk (Android)

Native CircleBox core SDK for Android (`minSdk 23`).

## Install (GitHub Release AAR, installable today)

CircleBox is not on Maven Central yet. Use tagged release artifacts.

### 1) Download artifact

From release `v0.3.1`, download:

- `circlebox-sdk-release.aar`

Optional for cloud upload:

- `circlebox-cloud-release.aar`

### 2) Place artifact in your app

Create and copy into:

- `<your-android-app>/app/libs/circlebox-sdk-release.aar`
- `<your-android-app>/app/libs/circlebox-cloud-release.aar` (optional)

### 3) Add `flatDir` repository

If your project uses modern `dependencyResolutionManagement`, add this in `settings.gradle`:

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

If your project uses module-level repositories, add:

```gradle
repositories {
  flatDir {
    dirs("$rootDir/libs")
  }
}
```

### 4) Add dependency in `app/build.gradle`

```gradle
dependencies {
  implementation(name: "circlebox-sdk-release", ext: "aar")
}
```

If you also use CircleBox Cloud uploader:

```gradle
dependencies {
  implementation(name: "circlebox-sdk-release", ext: "aar")
  implementation(name: "circlebox-cloud-release", ext: "aar")
}
```

### 5) Sync and verify compile

```bash
./gradlew :app:assembleDebug
```

### 6) Verify artifact integrity (recommended)

Compare downloaded file checksums with release `checksums.txt`.

## Where To Initialize

Initialize once in process startup, ideally in your custom `Application`.

### Recommended: `Application.onCreate()`

```kotlin
import android.app.Application
import com.circlebox.sdk.CircleBox
import com.circlebox.sdk.CircleBoxExportFormat

class MyApp : Application() {
  override fun onCreate() {
    super.onCreate()
    CircleBox.start()
  }
}
```

### Required manifest wiring for custom `Application`

In `AndroidManifest.xml`:

```xml
<application
    android:name=".MyApp"
    ... >
</application>
```

### Fallback if you do not control `Application`

Call `CircleBox.start()` in the first launched activity `onCreate`, before navigation and network bootstrapping.

Call `CircleBox.start` once per process launch.

## Usage

Record breadcrumbs anywhere in app code:

```kotlin
CircleBox.breadcrumb("checkout_started", mapOf("flow" to "standard"))
```

Export pending crash logs:

```kotlin
if (CircleBox.hasPendingCrashReport()) {
  val files = CircleBox.exportLogs(
    setOf(
      CircleBoxExportFormat.JSON,
      CircleBoxExportFormat.CSV,
      CircleBoxExportFormat.JSON_GZIP,
      CircleBoxExportFormat.SUMMARY
    )
  )
  println(files)
}
```

## Troubleshooting

- `Could not find method implementation(name:..., ext:...)`:
  place the dependency in module `build.gradle` (usually `app/build.gradle`), not root.
- `Could not find circlebox-sdk-release.aar`:
  confirm file exists in the exact `libs` path referenced by `flatDir`.
- App compiles but no cloud upload:
  ensure `circlebox-cloud-release.aar` is added and cloud keys are valid.

## Standalone Validation

From this directory:

```bash
./scripts/package_check.sh
```
