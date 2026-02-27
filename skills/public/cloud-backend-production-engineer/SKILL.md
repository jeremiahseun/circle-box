---
name: cloud-backend-production-engineer
description: Design, build, scale, and operate production cloud backends. Use when tasks involve backend APIs, serverless services, BaaS platforms, auth and data policies, cron scheduling, async jobs and workers, queues, event-driven processing, cloud storage, deployments, observability, reliability engineering, and incident response for modern cloud systems.
---

# Cloud Backend Production Engineer

## Overview

Build production cloud backends across two tracks:
1. Deliver API and data systems that scale safely.
2. Operate cloud workloads with reliable jobs, scheduling, and observability.

Load only the references needed for the current task.

## Task Routing

1. Identify the dominant task type.
- `Core backend architecture`: read `references/cloud-architecture.md`.
- `BaaS, auth, data, and storage`: read `references/baas-data-auth-storage.md`.
- `Cron, jobs, workers, and queues`: read `references/jobs-cron-workers-queues.md`.
- `Production operations and releases`: read `references/production-operations.md`.
- `Failures or incidents`: read `references/troubleshooting-incidents.md`.
2. Define scope and constraints early.
- Define workload type: request/response, event-driven, or batch.
- Define SLO/SLA targets and compliance constraints.
- Define data consistency, latency, and durability expectations.
3. Define acceptance criteria before coding.
- Define behavior, failure handling, and rollback strategy.
- Define required tests and release gates.
- Define runbook and observability updates for production-impacting changes.

## Execution Workflow

1. Map current topology before changes.
- Inspect service boundaries, data ownership, and existing deploy paths.
- Reuse existing runtime and CI conventions unless they block reliability.
2. Design the smallest safe production change.
- Keep API and event contracts explicit and versioned.
- Keep async processing idempotent and retry-safe.
- Keep auth and data policies least-privileged by default.
3. Implement and verify.
- Add or update tests with each behavior change.
- Validate success and failure paths, including retry and timeout behavior.
- Validate migration and rollback paths for schema or infrastructure changes.
4. Harden for operations.
- Add metrics, logs, and traces with stable correlation identifiers.
- Add alerts tied to SLOs and business-critical failures.
- Update runbooks and on-call actions for new failure modes.

## Minimum Quality Bar

- Keep services stateless where possible and make side effects idempotent.
- Keep retries bounded with backoff and dead-letter handling.
- Keep auth, secrets, and network policies least-privileged.
- Keep data changes migration-safe and reversible.
- Keep production visibility sufficient for rapid triage.
- Keep release and rollback steps deterministic in CI.

## Deliverable Patterns

- `Feature work`: include API or event contract tests and operational notes.
- `Data/BaaS work`: include policy changes, migration notes, and integrity checks.
- `Job/cron work`: include idempotency strategy, retry policy, and backfill plan.
- `Production changes`: include deployment gate checklist and rollback plan.

## References

- `references/cloud-architecture.md`
- `references/baas-data-auth-storage.md`
- `references/jobs-cron-workers-queues.md`
- `references/production-operations.md`
- `references/troubleshooting-incidents.md`
