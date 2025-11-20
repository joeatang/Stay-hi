# Access Telemetry Controlled Vocabulary

Gold-standard privacy hygiene: all exported telemetry normalizes free-form context / reasons into a small, reviewable enum set.

## Context Enum (origin / flow)
- `dashboard`
- `muscle`
- `island`
- `profile`
- `calendar`
- `upgrade-flow`
- `admin`
- `streaks`
- `share`
- `auth`
- `unknown` (fallback)

## Reason Enum (decision rationale)
- `membership-upgrade`
- `not-authenticated`
- `tier-required`
- `admin-only`
- `quota`
- `limit`
- `success`
- `blocked`
- `upgrade-click`
- `unknown` (fallback)

## Normalization Rules
1. Lowercase input.
2. Replace whitespace with hyphen.
3. Strip characters outside `[a-z0-9-]`.
4. If value not in enum set, map to `unknown`.

## Exporter Behavior
- Sanitization applied before insert (both realtime & batch flush).
- Telemetry ring buffer stores normalized values only.
- Prevents accidental PII / verbose leakage.
 - Adds lineage columns: `ingest_source` (e.g. client-exporter) and `failure_cycle` (consecutive failed flush count) for reliability analytics.

## Extension Guidelines
To introduce a new value:
1. Add to this file under appropriate enum.
2. Update `allowedContexts` or `allowedReasons` arrays in `AccessGateTelemetryExport.js` and `AccessGateTelemetry.js`.
3. Deploy and verify dashboard displays new bucket.

## Privacy Review Checklist
- [x] Context values limited to enumerated set.
- [x] Reason values limited to enumerated set.
- [x] No raw user identifiers beyond hashed session and user UUID.
- [x] Retention policy implemented (purge >30 days).

## Retention & Purge
Raw telemetry (`access_telemetry`): 30 days retained, weekly purge (GitHub Action `telemetry-purge.yml`).
Daily aggregates (`access_telemetry_daily`): retain 180 days (future purge script can reduce further).

Manual purge command:
```sql
DELETE FROM public.access_telemetry WHERE ts < now() - interval '30 days';
```
Follow with optional vacuum:
```sql
VACUUM ANALYZE public.access_telemetry;
```

---
Revision: v1.2.0 (lineage + failure cycle)
