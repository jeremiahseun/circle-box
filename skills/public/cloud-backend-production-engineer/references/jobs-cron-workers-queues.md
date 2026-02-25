# Jobs Cron Workers Queues

## Scope
Use this guide for scheduled tasks, async job processing, queue design, and production batch workflows.

## Workload Selection
- Use request/response for user-visible low-latency work.
- Use queues for retryable background processing.
- Use cron or schedules for periodic maintenance and aggregation.
- Use batch workflows for high-volume offline processing.
- Keep long-running work resumable from checkpoints.

## Job Contract Design
- Define a stable job payload schema with versioning.
- Include idempotency keys and correlation identifiers.
- Keep job handlers side-effect safe under duplicate delivery.
- Keep job state transitions explicit: queued, running, failed, completed.
- Keep ownership of retries and escalation clear.

## Retry and Failure Strategy
- Use exponential backoff with jitter.
- Set max retry attempts based on workload criticality.
- Route poison messages to dead-letter queues.
- Distinguish transient errors from permanent validation failures.
- Keep replay tooling for targeted backfills.

## Cron and Scheduled Tasks
- Keep schedules in source-controlled configuration.
- Keep cron handlers idempotent and safe under overlap.
- Use distributed locking or lease mechanisms for singleton tasks.
- Keep timezone handling explicit and deterministic.
- Keep missed-run policy defined: skip, catch-up, or partial backfill.

## Queue Throughput and Scaling
- Scale workers by queue depth and processing latency.
- Keep concurrency controls per job type.
- Keep rate limits aligned with downstream dependencies.
- Keep backpressure behavior explicit to protect critical systems.
- Keep noisy-neighbor isolation for mixed-priority workloads.

## Data Integrity for Async Processing
- Use outbox pattern when publishing events from primary writes.
- Keep exactly-once assumptions out of consumer logic unless guaranteed.
- Keep dedupe windows tuned to retry behavior.
- Keep external side effects (email, billing, webhooks) idempotent.
- Keep compensating actions documented for partial failures.

## Observability for Jobs
- Track enqueue-to-start latency and processing duration.
- Track success, retry, and dead-letter rates by job type.
- Track worker saturation and queue backlog growth.
- Alert on SLA-threatening backlog or failure spikes.
- Keep tracing across producer and consumer boundaries.

## Done Criteria
- Job handlers are idempotent and retry-safe.
- Schedule behavior is explicit for overlap and missed runs.
- Queue scaling and alerting are in place.
- Backfill and replay procedures are documented.
