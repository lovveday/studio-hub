---
name: data-lifecycle
description: Use when designing or changing database growth, retention, archival, quotas or backups in Studio Hub. Covers hot/warm/cold tiers, monthly maintenance, partitioning, object storage and the rule that the database is never wiped monthly.
---

# Data lifecycle

## The rule

**No monthly full wipe.** Business records (posts, approvals, reports, audit) are never cleared by routine maintenance. Transient data is pruned; time-series data is archived before deletion.

## Tiers

- **Hot (Postgres/SQLite):** current 90 days of comments, events, notifications; current 13 months of raw metrics.
- **Warm:** monthly aggregates, current posts/reports/audit.
- **Cold:** Parquet/JSONL in object storage; restore on request.

## Retention defaults

| Data | Keep hot | Then |
|---|---|---|
| Brands, profiles, facts, documents | while active | export + delete on offboarding |
| Posts, approvals, reports | 24 months | archive |
| Published post records | 24 months | keep aggregates forever |
| Raw daily metrics | 13 months | monthly aggregates |
| Comments | 12 months | archive 12 more |
| Webhook events | 14 days | delete |
| Job logs | 30 days | delete |
| AI prompts/responses | 30 days | delete; keep eval sets |
| Voice audio | 7 days | delete unless pinned |
| Competitor video | 7 days | delete; keep analysis |
| Notifications | 90 days | delete |
| Sessions | 30 days | expire |
| Audit log | 24 months | cold export |
| Backups | 30 days PITR | monthly full 12 months offsite |

## Monthly runbook

1. Export partitions older than the hot window to Parquet in object storage.
2. Verify row counts and checksums.
3. Detach/drop the partition (not row-by-row DELETE).
4. Batch-prune transient tables (10k rows per batch).
5. `VACUUM (ANALYZE)`, review bloat and index usage.
6. Test a restore quarterly.

## Storage

- Media never in the database; only metadata. S3 lifecycle: standard → infrequent access → archive.
- Delete temp/derived files after 30 days.
- Deduplicate uploads by SHA-256.
- Embed only current document chunks; delete chunks with the document.
- Per-brand quotas: media GB, AI tokens, render minutes, comments.
- Alert at 70/85/95% disk.

## Destructive actions

- Always preview: rows and bytes that would be removed.
- Export before delete.
- Require typed confirmation for hard delete.
- Legal hold flag blocks deletion.
- Offboarding: export → confirm → hard delete → deletion receipt.
