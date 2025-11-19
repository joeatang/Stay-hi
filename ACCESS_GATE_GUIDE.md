# Access Gate & Unified Membership Guide

## Overview
AccessGate provides a single, event-driven decision point for protected actions. It replaces legacy anonymous modal systems and ProgressiveAuth branching with a minimal API: `AccessGate.request(context)`.

## Core Components
- `AccessGate.js`: Computes `decision = { allow, reason, context }` based on membership state.
- `HiMembershipBridge.js`: Emits unified `hi:membership-changed` events and supplies a normalized membership object.
- `AccessGateModal.js`: Listens for `hi:access-requested` and routes decisions, presenting UI for anonymous or error states.
- `AccessGateTelemetry.js`: Records funnel metrics (requested, allowed, blocked, upgradeIntent) in sessionStorage.

## Events
| Event | Emitted By | Purpose |
|-------|------------|---------|
| `hi:access-requested` | AccessGate.request | Raw decision broadcast |
| `hi:access-allowed` | AccessGateModal router | Successful access (no modal) |
| `hi:access-blocked` | AccessGateModal router | User blocked (modal likely shown) |
| `hi:membership-changed` | Membership bridge | Tier evolution & potential upgrade tracking |

## Usage Pattern
```js
// Attempt protected action
const decision = window.AccessGate.request('profile:edit');
if(decision.allow){ proceedToEdit(); } else { /* modal appears */ }
```

## Telemetry Access
```js
const snap = window.__hiAccessTelemetry.get();
console.log(snap.counts); // { requested, allowed, blocked, upgradeIntent }
```

## Migration Status
- Legacy `anonymous-access-modal.js`: Removed from primary pages.
- ProgressiveAuth: Bridged; scheduled for removal after stability verification.
- Direct `showMembershipModal` calls: Delegated to AccessGate.

## Removal Plan (ProgressiveAuth)
1. Week-long (or session-based) telemetry review: confirm expected anonymous→allowed ratios.
2. Grep for `progressive-auth.js` references; remove script tags.
3. Delete file and update docs (this guide + ARCHITECTURE.md).

## Adding New Protected Actions
Choose a semantic context string: `feature:verb` (e.g. `calendar:view`, `share:create`). Use `AccessGate.request(context)` before executing and rely on emitted events for analytics.

## Extensibility Points
- Replace simple decision logic with tier/feature flag matrix.
- Add upgrade flow enhancements (tier comparison, benefits) inside `AccessGateModal` without changing callers.
- Stream telemetry export to Supabase or another endpoint using `__hiAccessTelemetry.export()` on interval.

## Best Practices
- Keep contexts short and stable; changing names breaks longitudinal telemetry comparisons.
- Avoid direct membership checks in UI components; let AccessGate centralize gating logic.
- Use event listeners for secondary effects (e.g., show inline nudges on `hi:access-blocked`).

## Troubleshooting
| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Modal not appearing for anonymous | Missing `AccessGateModal.js` load | Include component script early in page head |
| Duplicate modal flashes | Residual legacy modal script still present | Remove `anonymous-access-modal.js` tag |
| Decision always `allow:false` | Membership bridge failed to initialize | Verify Supabase client readiness & bridge inclusion |
| Telemetry counters stuck at zero | Event listeners not registered | Ensure `AccessGateTelemetry.js` loaded after AccessGate |

## Future Enhancements
- Tier-specific upgrade recommendations.
- A/B test gating modal copy via flags.
- Real-time conversion funnel dashboard.

---
Maintained as part of the Unified Auth & Membership initiative.