# Hi OS Beta Rollout

Date: 2025-11-19

## Overview
Ship a stable, observable beta: unified access + invites, tiers, points (daily check-in), profile UX, and anomaly monitoring (blocked ratio + p95 latency).

## Prerequisites
- Supabase project with service role key
- GitHub repo access with Actions enabled
- VS Code tasks available in this repo
- Secrets set in GitHub → Settings → Secrets and variables → Actions:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_KEY`
  - `ALERT_WEBHOOK_URL` (optional; Slack/Discord/etc.)

## Database Deploy (SQL)
Run in Supabase SQL editor (any order-sensitive notes below):
1. `unified-membership-schema.sql` — Unified invites + membership table and RPCs
2. `DEPLOY_HI_POINTS.sql` — Points balance + immutable ledger + `hi_award_points(...)`
3. `DEPLOY_POINTS_DAILY_CHECKIN.sql` — `award_daily_checkin()` one-per-day RPC
4. `DEPLOY_ACCESS_TELEMETRY_PERF_ALERTS.sql` — p95 latency perf alerts table + RLS

Optional/legacy as needed:
- `DEPLOY_GOLD_STANDARD_MANUAL.sql` then `DEPLOY_HI_OS_ENHANCEMENT.sql` for legacy counters/milestones
- `hi-mission-control-security.sql` for admin invite tooling RPCs

## GitHub Workflows (Cron)
- Blocked ratio anomaly: `.github/workflows/telemetry-anomaly.yml` (every 5m)
- Latency anomaly: `.github/workflows/telemetry-latency.yml` (every 5m)
- Ensure the above workflows are enabled; confirm required secrets exist.

## Local Development
Use VS Code tasks (dev server stays running):
- Start server: "Hi-OS: Start Dev Server" (port 3030)
- Preflight: "Hi-OS: Preflight" (spins a temp server, opens checks page)
- Quick Check: "Hi-OS: Quick Check" (requires server running)

Command-line equivalents (macOS zsh):
```sh
# Start local server (background task exists in VS Code)
python3 -m http.server 3030

# Run preflight (temp server auto-starts/stops)
node ./scripts/preflight.js

# Run anomaly scripts manually (requires SUPABASE secrets in env)
node ./scripts/telemetry-anomaly-check.js
node ./scripts/telemetry-latency-anomaly.js
```

## Invites: Admin & Script
- In Mission Control (admin), use "Generate Invite Code" and share the link `welcome.html?invite=CODE`.
- Or mint via script (service role needed):
```sh
export SUPABASE_URL="https://YOUR.supabase.co"
export SUPABASE_SERVICE_KEY="YOUR_SERVICE_ROLE_KEY"
node scripts/invite-mint.js --tier T2 --days 1 --uses 1 --code HIFRIEND24
```

## Verification Checklist
- Sign-in: `public/signin.html` works; optional invite input reveals with toggle
- Invite redemption:
  - Header menu modal or `welcome.html` invite box
  - RPC `activate_unified_invite_code` upgrades membership tier
- Profile:
  - Points balance visible; Daily Check-in awards +5 once per UTC day
  - Recent points ledger shows new entries
  - Tier badge and perks panel reflect current membership
- Admin:
  - Mission Control lists active invites; can generate and share
- Telemetry:
  - Ratio anomaly workflow inserts into `access_telemetry_alerts` on spikes
  - Latency anomaly workflow inserts into `access_telemetry_perf_alerts` on p95 spikes
  - Optional webhook posts for major/critical severities

## Ops Runbook (Anomalies)
- Blocked ratio spike: inspect recent AccessGate errors by `context`/`reason`; check RLS and invite validity.
- Latency spike: review client/network changes, Supabase status, and recent code deploys; compare `p95_latency_ms` vs baseline.
- Tune thresholds: adjust script constants in `scripts/telemetry-anomaly-check.js` and `scripts/telemetry-latency-anomaly.js`.

## Troubleshooting
- Missing data: ensure RLS policies and function grants exist per SQL files.
- Webhook not firing: confirm `ALERT_WEBHOOK_URL` and that severity is `major`/`critical`.
- Quick Check fails: start the dev server first, then rerun Quick Check.

## Next (Post-Beta)
- Rewards catalog + user rewards
- Archives: historical streaks, redemptions, and milestones
- Live webhook integration and escalation policy
