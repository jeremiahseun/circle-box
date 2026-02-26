# Flutter Chaos App

Flutter sample app for validating CircleBox bridge behavior and Phase 2 export flows.

## Run

```bash
cd samples/flutter_chaos_app
flutter pub get
flutter run
```

## Optional Cloud Uploader (Real Dashboard Flow)

Pass runtime values via `--dart-define`:

```bash
flutter run \
  --dart-define=CIRCLEBOX_WORKER_BASE_URL=https://circlebox.seunjeremiah.workers.dev \
  --dart-define=CIRCLEBOX_INGEST_KEY=cb_live_<project_key> \
  --dart-define=CIRCLEBOX_USAGE_KEY=cb_usage_<project_key>
```

If endpoint + ingest key are provided, the app starts `CircleBoxCloud` and auto-uploads pending crash exports.
The usage key is optional and only required for aggregate usage telemetry.

Important behavior:
- `CIRCLEBOX_INGEST_KEY` controls crash/export upload.
- `CIRCLEBOX_USAGE_KEY` controls usage beacon metrics only.
- Non-crash Flutter exceptions are captured locally as CircleBox events; use **Upload to Cloud Now** to flush current logs immediately.

## Validation Flow

1. Trigger mock context actions (`thermal`, `battery`, `network`, `permission`, `disk`, breadcrumb).
2. Trigger Flutter error hooks:
   - Framework Error
   - Async Unhandled Error
   - Isolate Unhandled Error
3. Export logs with selected formats (`json`, `csv`, `json_gzip`, `csv_gzip`, `summary`).
4. Tap **Upload to Cloud Now** to send current logs immediately.
5. Verify exported paths and file sizes are shown.
6. Tap **Load Viewer Snapshot** to inspect in-memory ring-buffer events.
7. Use viewer filters (`type`, `severity`, `thread`) to focus the timeline.
8. If a pending crash report exists, confirm launch dialog offers immediate export.
