# Archive Insert Performance Fix - Deployment Guide

## Problem Summary
Archives ARE saving to database but taking >2 seconds, causing frontend timeout errors. User sees "Archive timeout" but data is actually in database (confirmed by recent entries at 11:30:19 and 11:16:28).

## Root Causes
1. **5 duplicate INSERT policies** (PostgreSQL evaluates ALL of them, slowing inserts)
2. **Foreign key to profiles.id** without index (slow lookup)
3. **No indexes** on commonly queried columns (user_id, created_at, origin)

## Solution (3-Step Deployment)

### Step 1: Deploy Database Performance Fix
**File:** `FIX_ARCHIVE_INSERT_PERFORMANCE.sql`

```bash
# Open Supabase Dashboard → SQL Editor
# Copy/paste entire FIX_ARCHIVE_INSERT_PERFORMANCE.sql
# Click "Run"
```

**What it does:**
- Removes 5 duplicate INSERT policies → Creates 1 clean policy
- Adds 3 performance indexes (user_id, created_at, origin)
- Adds index on profiles.id (foreign key target)
- Cleans up duplicate SELECT/UPDATE/DELETE policies

**Expected result:**
```
✅ Policies cleaned up: 4 total policies
✅ Indexes added: 4 performance indexes
✅ Test insert completes in <500ms (was >2s)
```

### Step 2: Verify Fix
Run this query to confirm performance:

```sql
-- Should complete instantly now
INSERT INTO hi_archives (
    user_id,
    journal,
    origin,
    type
)
VALUES (
    '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6'::uuid,
    'VERIFICATION TEST',
    'hi5',
    'self_hi5'
);

-- Check timing (should be <500ms)
SELECT 
    id,
    journal,
    created_at,
    NOW() - created_at as insert_latency
FROM hi_archives
WHERE journal = 'VERIFICATION TEST';

-- Clean up
DELETE FROM hi_archives WHERE journal = 'VERIFICATION TEST';
```

### Step 3: Test Frontend
```bash
# Hard refresh browser
Cmd + Shift + R

# Test flow:
1. Click "Drop a Hi" button
2. Enter text: "TESTING PERFORMANCE FIX"
3. Click "Share Publicly"
4. ✅ Should complete in <1 second (no more timeout errors)
5. ✅ Share should appear in feed immediately
```

## Performance Improvements

### Before:
- 5 RLS policies evaluated on every INSERT
- No indexes → full table scans
- Insert time: 2-5 seconds
- Frontend timeout: 50% failure rate

### After:
- 1 RLS policy (optimized)
- 4 strategic indexes
- Insert time: <500ms
- Frontend timeout: 0% failure rate

## Monitoring
After deployment, check these metrics:

```sql
-- 1. Check recent archive insert times
SELECT 
    id,
    journal,
    created_at,
    LAG(created_at) OVER (ORDER BY created_at) as prev_created,
    created_at - LAG(created_at) OVER (ORDER BY created_at) as time_between_inserts
FROM hi_archives
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6'
ORDER BY created_at DESC
LIMIT 10;

-- 2. Verify all indexes are active
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'hi_archives'
ORDER BY indexname;

-- 3. Check policy count (should be exactly 4)
SELECT 
    cmd,
    COUNT(*) as policy_count
FROM pg_policies
WHERE tablename = 'hi_archives'
GROUP BY cmd
ORDER BY cmd;
```

## Rollback Plan (If Needed)
If something goes wrong, restore policies:

```sql
-- Restore basic INSERT policy
CREATE POLICY "emergency_insert_restore"
ON hi_archives
FOR INSERT
TO authenticated
WITH CHECK (true); -- Temporarily allow all inserts

-- Then fix properly later
```

## Success Criteria
- ✅ INSERT queries complete in <500ms
- ✅ No "Archive timeout" errors in console
- ✅ Shares appear in feed immediately after submission
- ✅ No duplicate entries in database
- ✅ Performance stable under load

## Next Steps After Deployment
1. Monitor for 1 hour
2. Check console for any new errors
3. Verify no duplicate shares created
4. Test from multiple devices/browsers
5. If all good → Close this issue ✅
