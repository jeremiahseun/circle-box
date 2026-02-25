# Cloud Architecture

## Scope
Use this guide for service boundaries, API design, event contracts, and scalability decisions.

## Architecture Defaults
- Prefer modular services with clear ownership boundaries.
- Keep synchronous request paths small and move long work to async jobs.
- Keep contract boundaries explicit for APIs, events, and storage schemas.
- Keep dependencies directional to avoid tight service coupling.
- Keep deployment units independently releasable where feasible.

## API and Contract Design
- Define versioning strategy for external APIs and events.
- Validate inputs at the edge and fail with actionable error responses.
- Keep idempotency keys for mutation endpoints that can be retried.
- Keep pagination and filtering stable and backward-compatible.
- Keep timeouts and retry semantics documented per endpoint.

## Event-Driven Architecture
- Emit domain events with explicit schema and ownership.
- Include correlation identifiers for traceability across services.
- Assume at-least-once delivery and design consumers for idempotency.
- Keep consumer side effects isolated and retry-safe.
- Keep schema evolution backward-compatible until all consumers migrate.

## Data and Consistency
- Define source of truth for each entity.
- Pick consistency level intentionally per use case.
- Keep transactional boundaries explicit.
- Use outbox/inbox patterns when cross-service consistency matters.
- Define data retention and archival strategy for growth.

## Performance and Scale
- Define SLOs for latency, error rate, and throughput.
- Scale reads and writes independently when workloads differ.
- Use caching where staleness tolerance is explicit.
- Prevent hot partitions with balanced keys and traffic shaping.
- Load test critical paths before production rollouts.

## Security Baseline
- Keep network policies least-privileged.
- Keep secrets managed via runtime secret stores, not source control.
- Keep encryption enabled in transit and at rest.
- Keep authz rules server-side and auditable.
- Keep audit trails for privileged operations.

## Done Criteria
- Contracts are explicit, versioned, and tested.
- Failure modes are modeled and handled.
- SLO impacts are measured and observable.
- Rollout and rollback paths are documented.
