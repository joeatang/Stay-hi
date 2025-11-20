# Telemetry Anomaly Alerts

Version: 1.2.0

## Purpose
Proactively detect abnormal spikes in access gating failures (blocked attempts) to surface reliability or membership friction issues before they impact user experience.

## Data Sources
- `access_telemetry`: Raw event stream (`type`, `context`, `reason`, `ts`).
- `access_telemetry_alerts`: Derived anomaly windows with ratio metrics.

## Window & Baseline
- Window: Last 5 minutes ending at script execution time.
- Baseline: Previous 24 hours (24h lookback) immediately preceding the window (excludes current 5m).

## Metrics Computed
| Field | Description |
| ----- | ----------- |
| `total_requested` | Count of `access-requested` events in window |
| `total_blocked` | Count of `access-blocked` events in window |
| `blocked_ratio` | `total_blocked / total_requested` (0 if requested=0) |
| `baseline_ratio` | Same ratio over the baseline period (null if insufficient data) |
| `threshold_ratio` | Static absolute ratio trigger (default `0.35`) |
| `min_blocked_threshold` | Minimum blocked events required (default `50`) |
| `triggered` | `true` if alert conditions met |
| `context` | Context scope for alert (`all` or a specific surface) |
| `severity` | Classification (`warning`, `major`, `critical`) |
| `window_start` / `window_end` | ISO timestamps bounding window |

## Trigger Logic (v1.1.0)
An alert is inserted only if all of:
1. `total_blocked >= min_blocked_threshold`
2. `blocked_ratio >= threshold_ratio`
3. AND (baseline absent) OR (`blocked_ratio >= baseline_ratio * 1.5`)

This combines absolute (hard ceiling) and relative (deviation amplification) criteria to reduce false positives in low-volume periods. Severity tiers apply multiplicative thresholds (major ≈2× baseline/absolute, critical ≈3×).

## Non-Triggered Windows
Windows not meeting criteria are currently ignored (no row). Future versions may record non-triggered windows for longitudinal modeling.

## Future Enhancements
- Adaptive baseline (rolling weighted median or EMA instead of simple 24h ratio).
- Auto-resolution when subsequent windows normalize.
- Slack / webhook notifications for all non-warning severities + escalation logic.
- Trend fields (delta vs previous window, exponential moving average).
- Latency anomaly correlation (link decision latency spikes to block ratio changes).
- Non-triggered window archival for ML modeling.

## Operational Notes
- Workflow: `.github/workflows/telemetry-anomaly.yml` runs every 5 minutes (cron `*/5 * * * *`).
- Requires secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`.
- Service role policies permit insert/select on `access_telemetry_alerts`.

## Validation Tips
To simulate an alert spike locally: emit synthetic `hi:access-blocked` events while suppressing `hi:access-allowed` to inflate ratio, then manually run `node scripts/telemetry-anomaly-check.js` with valid service credentials.

## Changelog
- 1.2.0: Performance addendum for decision latency (p95) alerts with separate table, workflow, and ops runbook.
- 1.1.0: Added severity tiers, per-context alerts, optional webhook dispatch, latency metric foundation.
- 1.0.0: Initial implementation (absolute + relative ratio, single aggregated context).

---

## Addendum: Performance (Decision Latency p95)

This addendum covers performance anomalies for access decision latency (p95), complementing the blocked ratio reliability alerts above.

### Data Sources
- `access_telemetry`: Event stream with `decision_latency_ms` populated for `access-allowed`/`access-blocked`.
- `access_telemetry_perf_alerts`: Perf anomaly windows with p95 metrics.

### Window & Baseline
- Window: Last 15 minutes ending at execution time.
- Baseline: Previous 24 hours immediately preceding the window (excludes current 15m).

### Metrics Computed
| Field | Description |
| ----- | ----------- |
| `p95_latency_ms` | 95th percentile decision latency over the window (ms) |
| `baseline_p95_ms` | p95 latency over the baseline window (ms; null if insufficient) |
| `threshold_ms` | Absolute latency ceiling (default `400` ms) |
| `total_decisions` | Count of decisions with latency in window |
| `triggered` | `true` if alert conditions met |
| `context` | Scope (`all` for MVP) |
| `severity` | `warning`, `major`, `critical` |
| `window_start` / `window_end` | ISO timestamps bounding window |

Table schema lives in `DEPLOY_ACCESS_TELEMETRY_PERF_ALERTS.sql`.

### Trigger Logic
Alert triggers if any of the following evaluate to breach:
1. Absolute: `p95_latency_ms >= threshold_ms` (default 400ms)
2. Relative (if baseline available):
	- `major` if `p95_latency_ms >= baseline_p95_ms * 1.5`
	- `critical` if `p95_latency_ms >= baseline_p95_ms * 2.0`

If neither absolute nor relative thresholds are exceeded, no row is inserted.

### Workflow
- GitHub Actions: `.github/workflows/telemetry-latency.yml` (cron `*/5 * * * *`)
- Secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, optional `ALERT_WEBHOOK_URL`
- Script: `scripts/telemetry-latency-anomaly.js`

### Validation Tips
Locally simulate latency spikes by delaying decision pathways or seeding synthetic `decision_latency_ms` values, then run:
```
node scripts/telemetry-latency-anomaly.js
```
Confirm rows appear in `access_telemetry_perf_alerts` with `triggered=true`.

### Ops Runbook
- Investigate recent deploys, network changes, or upstream outages if `p95_latency_ms` jumps.
- Correlate with blocked ratio alerts to distinguish performance vs logic/RLS issues.
- Tune `threshold_ms` and multipliers in the script if too noisy or too lax.

