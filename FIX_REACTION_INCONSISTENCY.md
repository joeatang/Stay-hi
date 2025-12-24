# 🎯 Fix Reaction Button Inconsistency

## Problem
Some shares show reaction counts ("5 Waves") while others show generic text ("Wave Back").

## Root Cause
1. **Database missing `wave_reactions` table** - only `peace_reactions` exists
2. **Database missing `wave_count` column** in `public_shares` - only `peace_count` exists
3. Feed renders `share.wave_count` which is always `undefined`
4. Conditional logic: `typeof share.wave_count === 'number' ? show count : show "Wave Back"`

## Gold Standard Solution

### Run SQL Migration
Go to: **Supabase Dashboard → SQL Editor**  
https://supabase.com/dashboard/project/gfcubvroxgfvjhacinic/sql/new

Copy/paste and run: `COMPLETE_WAVE_SYSTEM.sql`

This creates:
- ✅ `wave_reactions` table (with RLS policies)
- ✅ `wave_count` column in `public_shares` (defaults to 0)
- ✅ `wave_back()` RPC function (returns accurate count)
- ✅ Auto-sync trigger (keeps counts accurate)
- ✅ Indexes for performance

### After Migration
**All shares will show counts consistently:**
- New share with 0 waves: "👋 0 Waves"
- Share with 1 wave: "👋 1 Wave"
- Share with 5 waves: "👋 5 Waves"

No more "Wave Back" generic text. Every button shows the actual count.

### Benefits
1. **X/Twitter pattern**: Counts always visible (consistency)
2. **Database-driven**: No localStorage edge cases
3. **Real-time**: Triggers keep counts in sync
4. **Scalable**: Indexed queries, efficient RPC
5. **Symmetric**: `wave_count` + `peace_count` work identically

## Testing
```javascript
// After migration, test in browser console:
const { data } = await supabase
  .from('public_shares')
  .select('id, wave_count, peace_count')
  .limit(5);

console.log(data); 
// Should show wave_count: 0 for all shares
```

## Migration File
`COMPLETE_WAVE_SYSTEM.sql` - Ready to run in Supabase SQL Editor
