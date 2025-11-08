# 🧠 Hi-OS v1.0 — Hi Operating System (Founder Guide)

## Purpose
Hi-OS governs how we build, test, roll out, and monitor the Hi App. It guarantees safe changes, instant rollback, and brand integrity.

## Preflight Protocol (must pass before any task)
1) Phase context: Read latest PHASE_*_COMPLETE.md and LATEST.md.
2) Run local server:
   ```
   python3 -m http.server 3030
   ```
3) Dev checks:
   - Open /public/dev/index.html (flags console)
   - Open /public/dev/phase7-verifier/verifier.html (ALL PASS)
   - Open /public/dev/auth/phase9-verifier.html (ALL PASS)
4) Node preflight:
   ```
   node ./scripts/preflight.js
   ```
   Expect: "✅ Hi-OS Preflight PASS"
5) Guardrails:
   - No edits to sw.js or manifest.json pre–PWA hardening
   - No new window.* globals (dev tools only under /public/dev/**)
   - Keep {data,error} contract in HiBase
   - Feature-flag every new capability; use cohort rollout for 1–99%
6) If any check fails:
   - STOP. Fix root cause.
   - If >2 attempts: write /reports/FAILURE_LOG.md (template below) and propose plan.

## Operator Quick Start (non-dev)
- Dev console: /public/dev/index.html
- Rollouts: HiRolloutOps.presets.start(10) → mid(50) → full(100)
- Flags: HiRolloutOps.set('hifeed_enabled', 25)
- Metrics sanity: /public/dev/metrics-test.html

## FAILURE_LOG.md template
```markdown
# Task Failure Report

## Task
[Describe what was being attempted]

## Context (phase, branch, tag)
[Current development context]

## Steps taken (attempt 1 & 2)
[Detailed steps for each attempt]

## Console excerpts
[Relevant error messages and logs]

## Preflight result
[Output from preflight checks]

## Proposed remediation
[Suggested fix plan and next steps]
```

## Hi-OS Architecture Principles
- **Idempotent Operations**: Every task can be run multiple times safely
- **Feature Flag Everything**: All new capabilities behind flags with cohort rollout
- **{data,error} Contract**: Consistent error handling across all HiBase operations
- **PWA Stability**: Service worker and manifest locked until hardening phase
- **Telemetry First**: Track everything for monitoring and rollback decisions
- **2-Attempt Rule**: Auto-document failures after 2 attempts for learning

## Emergency Procedures
If critical failure:
1. Check /reports/FAILURE_LOG.md for recent failures
2. Run emergency rollback via feature flags
3. Verify core systems via /public/dev/preflight/index.html
4. Document in failure log and propose recovery plan

## Version History
- v1.0: Initial Hi-OS with Preflight Protocol (Nov 2025)