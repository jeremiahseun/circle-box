# Flutter Chaos App

Flutter sample app for validating CircleBox bridge behavior and Phase 2 export flows.

## Run

```bash
cd samples/flutter_chaos_app
flutter pub get
flutter run
```

## Validation Flow

1. Trigger mock context actions (`thermal`, `battery`, `network`, `permission`, `disk`, breadcrumb).
2. Trigger Flutter error hooks:
   - Framework Error
   - Async Unhandled Error
   - Isolate Unhandled Error
3. Export logs with selected formats (`json`, `csv`, `json_gzip`, `csv_gzip`, `summary`).
4. Verify exported paths and file sizes are shown.
5. Tap **Load Viewer Snapshot** to inspect in-memory ring-buffer events.
6. Use viewer filters (`type`, `severity`, `thread`) to focus the timeline.
7. If a pending crash report exists, confirm launch dialog offers immediate export.
