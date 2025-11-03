# SCHEMA BACKUP - Pre-Metrics Separation
**Date**: 2025-11-02 18:34:06  
**Purpose**: Backup before applying METRICS_SEPARATION_DEPLOY.sql

## Current Schema State
- Tables: shares, hi_moments, daily_hi_moments, public_shares (legacy)
- Views: Unknown (to be documented post-deployment)
- Functions: get_global_stats(), increment_hi_wave() (legacy)

## Rollback Plan
If metrics separation fails:
1. Drop new objects: `DROP TABLE hi_events CASCADE;`
2. Recreate legacy views pointing to original sources
3. Disable `metrics_v2_enabled` flag
4. Revert dashboard to use `HiUnifiedGlobalStats`

## Deployment Target
- Create: `hi_events` table
- Create: `v_total_waves`, `v_total_hi5s` views  
- Create: `get_hi_waves()`, `get_total_hi5s()`, `insert_medallion_tap()` functions
- Verify: HiBase.stats integration works end-to-end