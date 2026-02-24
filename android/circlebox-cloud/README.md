# circlebox-cloud (Android)

Companion uploader module for CircleBox Cloud.

## Install (release AAR)

1. Download `circlebox-cloud-release.aar` from the tagged release.
2. Place it in your app `libs/` folder.
3. Add:

```gradle
repositories {
  flatDir {
    dirs("$rootDir/libs")
  }
}

dependencies {
  implementation(name: "circlebox-cloud-release", ext: "aar")
}
```

## Usage

```kotlin
CircleBoxCloud.start(
    CircleBoxCloudConfig(
        endpoint = "https://api.circlebox.dev",
        ingestKey = "cb_live_project_key",
        enableAutoFlush = true,
        autoExportPendingOnStart = true,
    )
)

CircleBoxCloud.setUser("user-123")
CircleBoxCloud.captureAction("checkout_tapped")
CircleBoxCloud.flush()
```

Behavior:
- Exports from CircleBox SDK
- Uploads summary payload first (`/v1/ingest/fragment`)
- Uploads full report next (`/v1/ingest/report`)
- Persists an upload queue at `files/circlebox/cloud/upload-queue.json`
- Sends `x-circlebox-idempotency-key` to make retries idempotent
- Automatically checks pending crash reports on start and app foreground transitions
- Automatically drains queued uploads on `flushIntervalSec` while app is foregrounded
- Automatic mode drains queue only; it does not create periodic live snapshots
