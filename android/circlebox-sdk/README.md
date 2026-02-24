# circlebox-sdk (Android)

Native CircleBox core SDK for Android.

## Install (release AAR)

1. Download `circlebox-sdk-release.aar` from the tagged GitHub release.
2. Place in your app `libs/` directory.
3. Add:

```gradle
repositories {
  flatDir {
    dirs("$rootDir/libs")
  }
}

dependencies {
  implementation(name: "circlebox-sdk-release", ext: "aar")
}
```

## Usage

```kotlin
CircleBox.start()
CircleBox.breadcrumb("checkout_started", mapOf("flow" to "standard"))

if (CircleBox.hasPendingCrashReport()) {
  val files = CircleBox.exportLogs(setOf(CircleBoxExportFormat.JSON, CircleBoxExportFormat.CSV))
  println(files)
}
```
