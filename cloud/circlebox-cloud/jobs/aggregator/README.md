# Aggregator Jobs

`daily_rollup.sql` computes per-project crash-fingerprint daily metrics used by dashboard trend cards.

Suggested execution:

1. Run hourly via Supabase scheduled task or external cron runner.
2. Use idempotent upsert semantics to avoid duplicate metrics.
3. Keep rollup window short (last 48 hours) for low query cost.
