# CircleBox Event Schema v1

## Envelope

- `schema_version`: `1`
- `session_id`: UUID
- `platform`: `ios` or `android`
- `app_version`
- `build_number`
- `os_version`
- `device_model`
- `generated_at_unix_ms`
- `events`: `CircleBoxEvent[]`

## Event

- `seq`: monotonic Int64
- `timestamp_unix_ms`: wall clock ms
- `uptime_ms`: monotonic uptime ms
- `type`: event name
- `thread`: `main|background|crash`
- `severity`: `info|warn|error|fatal`
- `attrs`: string key/value map (sanitized by default)
