# Hi Telemetry Dashboard

## Overview
`public/admin/telemetry-dashboard.html` provides a lightweight read-only view of the last 24h of:
- Performance beacons (`perf_beacons`)
- Error events (`error_events`)
- Integrity events (`integrity_events`)
- Track / custom events (`track_events`)

It summarizes key Web Vitals (LCP, CLS, FID, FCP, TBT, TTFB), transfer size averages, error counts, integrity drift signals, and custom event volume.

## Setup
Expose Supabase credentials (for a privileged analytics anon key or service role on a protected staging host):
```html
<script>
  window.SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
  window.SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
</script>
```
Open: `/public/admin/telemetry-dashboard.html` (ensure auth / gating strategy if needed).

## Tables
- `perf_beacons`: Each row stores a snapshot of vital metrics + resource summary.
- `error_events`: Captures window errors & unhandled promise rejections.
- `integrity_events`: Records external script `missing` or `mismatch` detections.
- `track_events`: Persists custom `hiTrack(eventName, data)` calls.

## Example Queries
Recent LCP distribution (last day):
```sql
select percentile_cont(0.5) within group (order by lcp) as p50,
       percentile_cont(0.95) within group (order by lcp) as p95,
       count(*) as samples
from perf_beacons
where ts > (extract(epoch from now())*1000 - 86400000);
```
Error volume by build:
```sql
select build_tag, type, count(*)
from error_events
where ts > (extract(epoch from now())*1000 - 86400000)
group by 1,2
order by count(*) desc;
```
Integrity mismatches:
```sql
select build_tag, event_type, src, count(*)
from integrity_events
where event_type = 'mismatch'
  and ts > (extract(epoch from now())*1000 - 86400000)
group by 1,2,3;
```
Track event usage:
```sql
select event, count(*)
from track_events
where ts > (extract(epoch from now())*1000 - 86400000)
group by 1
order by count(*) desc;
```

## Security & Access
This page should not be publicly exposed without access control. Options:
1. Restrict via build tag + secret query param check.
2. Use Supabase RLS policies limiting read access to authenticated admin roles.
3. Host behind an internal staging domain with HTTP Basic Auth or session gating.

## Roadmap Enhancements
- Percentile computation server-side & caching.
- Sparkline mini-trends (hourly buckets) for LCP / errors.
- Export CSV / JSON.
- Alert thresholds (e.g., LCP P95 > budget) with hiTrack notifications.
- Integration with CI to annotate PRs with last 24h metrics deltas.

## Retention Strategy
Add scheduled task or SQL function to purge rows older than X days (e.g., 30d) to control table growth.

## Notes
Transfer size aggregated from resource timing can be noisy; calibrate budgets after sample collection. Ensure privacy compliance when adding user-centric data—current schema excludes PII.
