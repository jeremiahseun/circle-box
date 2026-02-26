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
The usage key is optional and only required for aggregate usage telemetry.

## Troubleshooting

If Xcode shows package-target conflicts like:

- `multiple packages declare targets with a conflicting name: CircleBoxSDK`
- `multiple packages declare targets with a conflicting name: CircleBoxCloud`

do not add CircleBox packages manually from Xcode UI.

This sample already references local packages via `project.yml`. Fix with:

```bash
cd samples/ios-chaos-app
xcodegen generate
```

Then in Xcode, remove any manually added CircleBox package references and reopen `CircleBoxChaosApp.xcodeproj`.

If Xcode shows:

- `Missing package product 'CircleBoxCloud'`

clean package resolution and regenerate:

```bash
cd samples/ios-chaos-app
rm -rf CircleBoxChaosApp.xcodeproj/project.xcworkspace/xcshareddata/swiftpm
xcodegen generate
```

Then in Xcode:

1. `File` -> `Packages` -> `Reset Package Caches`
2. `File` -> `Packages` -> `Resolve Package Versions`

## Flow

1. Tap several mock chaos buttons.
2. Tap **Hard Crash** or **Signal Crash (SIGABRT)**.
3. Re-open app.
4. Export logs and inspect JSON/CSV ordering.
5. Tap **Upload to Cloud Now** to send current logs immediately.
6. Tap **Open Local Viewer** to inspect in-memory timeline events.
7. Apply viewer filters (`type`, `severity`, `thread`) to narrow the event timeline.
