# CircleBox Cloud CLI (Control Plane)

The CLI script lives at:

- `/Users/mac/Documents/GitHub/circlebox/scripts/cli/circlebox.sh`

It manages control-plane objects in Supabase (projects and API keys).

## Quickstart

```bash
chmod +x scripts/cli/circlebox.sh
scripts/cli/circlebox.sh auth login \
  --control-url "https://<control-project-ref>.supabase.co" \
  --service-role "<SUPABASE_SERVICE_ROLE_KEY>"
```

This writes local auth config to `~/.circlebox/config.env`.

## Commands

### `auth login`

Stores control-plane endpoint + service-role key for local CLI usage.

```bash
scripts/cli/circlebox.sh auth login --control-url "<url>" --service-role "<key>"
```

### `project create`

Creates a project in an existing organization.

```bash
scripts/cli/circlebox.sh project create \
  --organization-id "<org_uuid>" \
  --name "My App" \
  --region us
```

### `key create`

Creates an ingest or usage beacon key for a project.

```bash
scripts/cli/circlebox.sh key create --project-id "<project_uuid>" --type ingest
scripts/cli/circlebox.sh key create --project-id "<project_uuid>" --type usage_beacon
```

### `key rotate`

Revokes existing key id and creates a new key of the same type.

```bash
scripts/cli/circlebox.sh key rotate --project-id "<project_uuid>" --key-id "<api_key_uuid>"
```

### `key revoke`

Revokes key by id.

```bash
scripts/cli/circlebox.sh key revoke --project-id "<project_uuid>" --key-id "<api_key_uuid>"
```

## Notes

- Keys are shown once when created/rotated.
- The database stores only `hashed_secret`, never plaintext secret.
- Ingest keys follow `cb_live_*`; usage beacons use `cb_usage_*`.
