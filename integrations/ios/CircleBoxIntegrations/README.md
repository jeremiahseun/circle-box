# CircleBoxIntegrations (iOS)

Companion mapping helpers for forwarding CircleBox export envelopes into Sentry/PostHog pipelines.

## Install (Swift Package)

```swift
.package(url: "https://github.com/jeremiahseun/circle-box.git", from: "0.3.1")
```

Use product: `CircleBoxIntegrations`.

This module does not import Sentry or PostHog directly. It maps CircleBox envelope data into neutral breadcrumb/event structures you can forward with your existing SDK clients.

## Standalone Validation

From this directory:

```bash
./scripts/package_check.sh
```
