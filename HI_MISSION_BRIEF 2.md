# Hi Mission Brief - Metrics Contamination Fix

## Mission Context
**Current Issue**: Total Hi5s and Global Waves both display identical value (86) indicating metrics cross-contamination. These should be distinct metrics tracking different user actions.

## Mission Objectives

### Outcome We're Improving (User-Facing)
- **Fix metrics contamination** where Hi Waves (medallion taps) and Total Hi5s (share submissions) show identical values
- **Restore data integrity** so users see accurate, distinct metrics for different interaction types
- **Ensure proper separation** between wave interactions and Hi5 sharing actions

### Guardrails We Will NOT Touch
- No modifications to sw.js or manifest.json (pre-PWA hardening phase)
- No new window.* globals (dev tools only under /public/dev/**)
- Maintain HiBase {data,error} contract integrity
- No changes to production database schema or core authentication flows
- Preserve existing feature flag architecture

### Acceptance Tests (Plain English)
1. **Given** a user taps a Hi Wave medallion **When** stats refresh **Then** only Global Waves counter increments
2. **Given** a user submits a Hi5 share **When** stats refresh **Then** only Total Hi5s counter increments  
3. **Given** metrics separation is active **When** viewing welcome.html **Then** Hi Waves ≠ Total Hi5s values displayed
4. **Given** HiBase.stats.getMetrics() called **When** examining response **Then** waves.data and hi5s.data contain distinct values
5. **Given** console tracing enabled **When** page loads **Then** single [HiStats CALL] getMetrics logged per page

## Technical Context
- **Root Cause**: Likely shared data source or cross-wired API calls between wave and hi5 metrics
- **Clean Path**: Use HiBase.stats API with proper separation, avoid legacy globals
- **Rollback Plan**: Feature flag to 0% + revert to last known good commit