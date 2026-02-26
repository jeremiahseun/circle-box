# Android Chaos App

## Run

```bash
cd samples/android-chaos-app
./gradlew :app:installDebug
```

## Optional Cloud Uploader (Real Dashboard Flow)

Set project properties in `samples/android-chaos-app/gradle.properties`:

```properties
CIRCLEBOX_WORKER_BASE_URL=https://circlebox.seunjeremiah.workers.dev
CIRCLEBOX_INGEST_KEY=cb_live_<project_key>
CIRCLEBOX_USAGE_KEY=cb_usage_<project_key>
```

When endpoint + ingest key are set, the app starts `CircleBoxCloud` and auto-uploads pending crash exports.

## Flow

1. Tap several mock chaos buttons.
2. Tap **Hard Crash**.
3. Re-open app.
4. Export logs and inspect JSON/CSV ordering.
5. Tap **Open Local Viewer** to inspect in-memory timeline events.
6. Use type/severity/thread filters before viewing results.
