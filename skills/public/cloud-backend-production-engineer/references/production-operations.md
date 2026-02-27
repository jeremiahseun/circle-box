# Production Operations

## Scope
Use this guide for production readiness, deployment safety, observability, reliability, and cost control.

## Environment and Release Management
- Keep local, staging, and production config separated and auditable.
- Keep infrastructure changes declarative and reviewable.
- Keep release artifacts immutable and reproducible.
- Keep progressive delivery options available: canary, phased, or blue/green.
- Keep rollback procedure tested and documented.

## CI and Delivery Gates
- Fail fast on lint, static analysis, and test failures.
- Block production deploys on migration or policy drift failures.
- Require smoke checks after deploy for critical paths.
- Keep deployment approvals for high-risk changes.
- Keep deployment metadata tied to commit and artifact identifiers.

## Secrets and Runtime Security
- Keep secrets in managed secret stores.
- Keep secret rotation periodic and automated when possible.
- Keep service identities short-lived and least-privileged.
- Keep ingress and egress policies explicit.
- Keep high-risk admin operations behind stronger controls.

## Observability Baseline
- Emit structured logs with stable fields.
- Emit metrics for latency, throughput, error rates, and saturation.
- Emit traces across API, queue, and database boundaries.
- Include request and job correlation identifiers in all telemetry.
- Keep dashboards aligned to service and business objectives.

## Alerting and On-Call Readiness
- Alert on SLO burn, not only raw error counts.
- Alert on queue backlog, job retry spikes, and dead-letter growth.
- Keep severity levels and escalation paths explicit.
- Keep runbooks for top failure modes near alert definitions.
- Keep paging noise low with deduplication and suppression rules.

## Data Protection and Recovery
- Keep backups and retention policies defined per datastore.
- Test restore drills on a schedule.
- Keep schema changes reversible when feasible.
- Keep disaster recovery objectives explicit: RTO and RPO.
- Keep failover playbooks practiced.

## Cost and Capacity Management
- Track cost by service, environment, and workload type.
- Track unit economics for high-volume workloads.
- Enforce quotas and guardrails for unbounded workloads.
- Tune autoscaling against throughput and latency goals.
- Remove orphaned resources and unused environments regularly.

## Done Criteria
- Deployment and rollback flow is proven.
- SLO-aligned dashboards and alerts are in place.
- Runbooks exist for critical incidents.
- Recovery and capacity plans are documented and current.
