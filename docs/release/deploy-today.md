# CircleBox Release: Deploy Today

This runbook publishes installable release artifacts for Swift, Kotlin/Android, Flutter, and React Native from a tagged commit.

## Preconditions

1. Local branch is clean.
2. Version strings are aligned to the target release version.
3. CI secrets are configured for optional worker smoke tests.

## 1) Run local release gate

From repository root:

```bash
bash scripts/release_check.sh
```

For strict git-tag dependency resolution in Flutter package checks:

```bash
RELEASE_STRICT_REMOTE_DEPS=1 bash scripts/release_check.sh
```

This verifies:
- naming guard
- schema parity fixtures
- CLI syntax check
- dashboard build/checks
- worker typecheck
- iOS/Android/Flutter/RN package checks
- optional worker ingest smoke (`/v1/ingest/*`)
- optional worker usage/key-auth smoke (`/v1/telemetry/usage`)

Also run public-registry readiness checks:

```bash
scripts/release/public_registry_check.sh 0.3.1
```

## 2) Create and push release tag

```bash
git tag v0.3.1
git push origin v0.3.1
```

The release workflow at `/Users/mac/Documents/GitHub/circlebox/.github/workflows/release.yml` will package artifacts and publish a GitHub release.

## 3) Validate release artifacts

Download release assets and verify checksums:

```bash
sha256sum -c checksums.txt
```

Expected result: every artifact reports `OK`.

## 4) Install verification matrix

### Swift

Use package URL and tag:

```swift
.package(url: "https://github.com/jeremiahseun/circle-box.git", from: "0.3.1")
```

Products:
- `CircleBoxSDK`
- `CircleBoxCloud`
- `CircleBoxIntegrations`

### Android

Use release AARs:
- `circlebox-sdk-release.aar`
- `circlebox-cloud-release.aar`

Install with `flatDir` and compile sample app.

### Flutter

Install from git tag with monorepo path:

```yaml
circlebox_flutter:
  git:
    url: https://github.com/jeremiahseun/circle-box.git
    ref: v0.3.1
    path: flutter/circlebox_flutter
```

Same pattern for:
- `flutter/circlebox_cloud_flutter`
- `flutter/circlebox_adapters`

### React Native

Install from `.tgz` artifacts:

```bash
npm install ./circlebox-react-native-0.3.1.tgz
npm install ./circlebox-cloud-react-native-0.3.1.tgz
```

## 5) Rollback procedure

If a bad release is published:

1. Mark release as prerelease or delete the release assets from GitHub.
2. Create a patch commit with fixes.
3. Tag a new version (`v0.3.2`) and publish again.
4. Update docs to point to the corrected version.

## 6) Control Plane Onboarding Verification

After deploy, validate key-management routes:

1. Open `/signup`, create account/project.
2. Confirm generated keys appear once on `/app/projects/<project_id>/keys`.
3. Rotate and revoke one key.
4. Confirm worker ingest accepts active key and rejects revoked key.
