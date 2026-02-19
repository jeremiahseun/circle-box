# CircleBox Event Schema v2

Schema v2 is the canonical export schema for CircleBox Phase 2.

## Goals

- Canonical snake_case keys across iOS and Android exports.
- Explicit export provenance for easier downstream analytics.
- Backward compatibility for reading v1 pending/checkpoint data.

## Envelope

Required top-level fields:

- `schema_version`: `2`
- `session_id`: UUID
- `platform`: `ios` | `android`
- `app_version`
- `build_number`
- `os_version`
- `device_model`
- `export_source`: `pending_crash` | `live_snapshot`
- `capture_reason`: `uncaught_exception` | `manual_export` | `startup_pending_detection`
- `generated_at_unix_ms`
- `events`: `CircleBoxEvent[]`

## Event

Required event fields:

- `seq`: monotonic Int64
- `timestamp_unix_ms`: wall clock milliseconds
- `uptime_ms`: process uptime milliseconds
- `type`: event name
- `thread`: `main` | `background` | `crash`
- `severity`: `info` | `warn` | `error` | `fatal`
- `attrs`: `Map<String,String>` (sanitized/truncated by default)

## CSV Representation

CSV includes metadata rows first, then event rows:

1. Metadata header:
`meta,schema_version,export_source,capture_reason,session_id,platform,generated_at_unix_ms`
2. Metadata values row
3. Event header:
`seq,timestamp_unix_ms,uptime_ms,type,thread,severity,attrs_json`
4. Event rows

## Backward Compatibility

- iOS and Android can read legacy v1 pending/checkpoint payloads.
- Legacy envelopes that omit v2 provenance fields are normalized during export:
  - `export_source` falls back to runtime context.
  - `capture_reason` falls back to runtime context.
  - `schema_version` is upgraded to `2` in exported artifacts.

## Example (abridged)

```json
{
  "schema_version": 2,
  "session_id": "IOS-SAMPLE-SESSION",
  "platform": "ios",
  "app_version": "1.0",
  "build_number": "1",
  "os_version": "17.0",
  "device_model": "iPhone",
  "export_source": "live_snapshot",
  "capture_reason": "manual_export",
  "generated_at_unix_ms": 1771490003000,
  "events": [
    {
      "seq": 0,
      "timestamp_unix_ms": 1771490001000,
      "uptime_ms": 100,
      "type": "sdk_start",
      "thread": "main",
      "severity": "info",
      "attrs": {
        "buffer_capacity": "200"
      }
    }
  ]
}
```
