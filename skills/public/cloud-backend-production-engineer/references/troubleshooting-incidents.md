# Troubleshooting Incidents

## Scope
Use this guide for triage, diagnosis, and stabilization of production cloud backend incidents.

## Rapid Triage
1. Confirm incident scope.
- Identify impacted services, endpoints, queues, and user segments.
- Identify start time and known triggering change.
2. Stabilize user impact first.
- Apply kill switches, traffic shedding, or rollback where safe.
- Pause high-risk jobs or cron tasks if they amplify failure.
3. Preserve evidence.
- Capture logs, traces, metrics snapshots, and deployment metadata.
- Preserve failed payload samples for replay in non-production.

## Diagnosis Sequence
1. Check external dependencies.
- Verify upstream/downstream outages and quota limits.
2. Check resource saturation.
- Verify CPU, memory, connection pool, and queue backlog metrics.
3. Check recent changes.
- Inspect deploy diffs, config changes, and migration history.
4. Check retry and dead-letter behavior.
- Identify retry storms or poison messages driving failure loops.

## Common Failure Patterns
- `Retry storm`: failures trigger retries faster than recovery capacity.
- `Cron overlap`: new runs start before previous runs complete.
- `Policy regression`: auth or data policy blocks expected traffic.
- `Migration mismatch`: code expects schema not yet applied or partially rolled out.
- `Queue starvation`: low-priority jobs block critical workloads.

## Stabilization Actions
- Reduce concurrency for failing job types.
- Increase visibility on slow or failing dependencies.
- Reroute or defer non-critical workloads.
- Roll forward with a targeted fix when rollback is unsafe.
- Trigger controlled backfill after system health is restored.

## Post-Incident Requirements
- Document timeline, root cause, and blast radius.
- Add regression tests and guardrails for the failure mode.
- Add or refine alerts and runbooks.
- Track follow-up work with ownership and due dates.
- Validate learned fixes in future game-day or failure drills.

## Exit Criteria
- Customer impact is fully mitigated.
- Root cause is confirmed with evidence.
- Durable fixes are merged or scheduled.
- Operational documentation is updated.
