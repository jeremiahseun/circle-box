# BaaS Data Auth Storage

## Scope
Use this guide for backend-as-a-service integrations, managed auth, database policies, and cloud storage workflows.

## Provider-Agnostic BaaS Principles
- Treat BaaS as infrastructure you configure, not a black box.
- Keep environment separation strict: local, staging, production.
- Keep schema changes versioned and reproducible via migrations.
- Keep access policies explicit and testable.
- Keep service-level credentials isolated from client credentials.

## Authentication and Authorization
- Keep authn and authz separate in design and code.
- Prefer short-lived tokens and refresh rotation.
- Validate token audience, issuer, and expiry on every protected call.
- Enforce role-based or attribute-based access checks server-side.
- Keep user impersonation and admin actions auditable.

## Row-Level and Object-Level Policies
- Define least-privilege policies first, then widen only when needed.
- Validate policy behavior with allow and deny tests.
- Keep policy logic simple enough to audit.
- Keep service-role bypasses limited to trusted backend paths.
- Keep policy and schema migrations coordinated.

## Managed Database Usage
- Keep indexes aligned with query paths.
- Keep write-heavy and read-heavy access patterns measured.
- Keep transaction scopes small to avoid contention.
- Keep backup and restore drills scheduled and tested.
- Keep replication and failover expectations documented.

## Storage and File Pipelines
- Keep upload paths presigned and time-limited.
- Validate MIME type and file size before persistence.
- Keep storage object naming deterministic and traceable.
- Keep lifecycle policies for retention and cleanup.
- Keep malware or integrity scanning in async pipelines where needed.

## BaaS Functions and Triggers
- Keep functions idempotent and retry-safe.
- Keep trigger logic bounded to avoid cascading side effects.
- Keep payload schemas versioned and validated.
- Keep execution time and memory budgets monitored.
- Keep dead-letter handling for repeated failures.

## Operational Guardrails
- Keep migration reviews mandatory for production.
- Keep config drift detection in CI or deployment checks.
- Keep key rotation periodic and automatable.
- Keep high-risk operations behind change windows or approvals.

## Done Criteria
- Auth and policy model is explicit and tested.
- Data and storage pathways are migration-safe.
- Operational runbooks cover key failure scenarios.
- Security and compliance controls are documented.
