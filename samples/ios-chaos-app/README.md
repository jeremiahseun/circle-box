# iOS Chaos App

This sample uses [XcodeGen](https://github.com/yonaskolb/XcodeGen) to generate the project.

## Generate and Run

```bash
cd samples/ios-chaos-app
xcodegen generate
open CircleBoxChaosApp.xcodeproj
```

## Optional Cloud Uploader (Real Dashboard Flow)

Set scheme environment variables in Xcode (`Product` -> `Scheme` -> `Edit Scheme` -> `Run` -> `Arguments`):

- `CIRCLEBOX_WORKER_BASE_URL=https://circlebox.seunjeremiah.workers.dev`
- `CIRCLEBOX_INGEST_KEY=cb_live_<project_key>`
- `CIRCLEBOX_USAGE_KEY=cb_usage_<project_key>` (optional)

When endpoint + ingest key are set, the app starts `CircleBoxCloud` and auto-uploads pending crash exports.

## Flow

1. Tap several mock chaos buttons.
2. Tap **Hard Crash** or **Signal Crash (SIGABRT)**.
3. Re-open app.
4. Export logs and inspect JSON/CSV ordering.
5. Tap **Open Local Viewer** to inspect in-memory timeline events.
6. Apply viewer filters (`type`, `severity`, `thread`) to narrow the event timeline.
