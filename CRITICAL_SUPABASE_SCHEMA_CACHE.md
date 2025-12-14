# CRITICAL: Supabase Schema Cache Issue

## Error
```
POST /rest/v1/public_shares 400 (Bad Request)
Could not find the 'avatar_url' column of 'public_shares' in the schema cache
```

## Root Cause
**Supabase PostgREST schema cache is stale.** The column exists in the database but the API layer hasn't refreshed its internal schema representation.

## Why This Happens
1. Column was recently added/modified in database
2. Schema cache refresh cycle hasn't completed yet
3. Cache can take up to 10 minutes to auto-refresh

## Immediate Fix Applied
**Removed optional columns from INSERT payload:**
```javascript
// OLD (causes cache error):
const row = {
  user_id,
  content,
  location,
  visibility,
  origin,
  pill,
  username: null,      // ← Removed
  display_name,        // ← Removed  
  avatar_url           // ← Removed (causes error)
};

// NEW (bypasses cache issue):
const row = {
  user_id,
  content,
  location,
  visibility,
  origin,
  pill
  // Let database populate username, display_name, avatar_url via triggers/defaults
};
```

**Why this works:**
- We only send columns that are definitely cached
- Database triggers/views can still populate the missing fields
- Avoids "column not found in schema cache" errors

## Manual Schema Cache Refresh

### Option 1: Supabase Dashboard
1. Go to Supabase Dashboard → Settings → API
2. Find "Schema Cache" section
3. Click "Reload schema cache" button
4. Wait 30 seconds for propagation

### Option 2: SQL Command
```sql
-- Force schema cache refresh
NOTIFY pgrst, 'reload schema';
```

### Option 3: Wait
Auto-refresh happens every 10 minutes (default PostgREST config)

## Long-Term Prevention

### 1. Use Database Defaults
Instead of sending nullable columns from client:
```sql
ALTER TABLE public_shares 
ALTER COLUMN display_name SET DEFAULT NULL,
ALTER COLUMN avatar_url SET DEFAULT NULL,
ALTER COLUMN username SET DEFAULT NULL;

-- Or use computed columns
ALTER TABLE public_shares
ADD COLUMN display_name TEXT GENERATED ALWAYS AS (
  (SELECT display_name FROM profiles WHERE id = user_id)
) STORED;
```

### 2. Use Database Triggers
```sql
-- Populate profile fields on insert
CREATE TRIGGER populate_profile_fields
  BEFORE INSERT ON public_shares
  FOR EACH ROW
  EXECUTE FUNCTION populate_share_profile();

CREATE FUNCTION populate_share_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    SELECT display_name, avatar_url, username
    INTO NEW.display_name, NEW.avatar_url, NEW.username
    FROM profiles
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 3. Use Views for Enrichment
Instead of storing profile data in shares table:
```sql
CREATE VIEW public_shares_enriched AS
SELECT 
  ps.*,
  p.display_name,
  p.avatar_url,
  p.username
FROM public_shares ps
LEFT JOIN profiles p ON ps.user_id = p.id;

-- Then query the view instead of table
-- Client never needs to send profile data
```

### 4. Minimal Client Payloads
**Best practice:** Client should only send data it owns, not derived data.

```javascript
// ✅ GOOD: Only send share data
const row = {
  content: text,
  visibility: 'public',
  origin: 'higym',
  pill: 'higym',
  location: 'Ashburn, VA'
  // user_id populated from auth.uid() by RLS
  // profile fields populated by trigger/view
};

// ❌ BAD: Client sends everything including profile data
const row = {
  user_id: getUserId(),
  content: text,
  visibility: 'public',
  origin: 'higym',
  pill: 'higym',
  location: 'Ashburn, VA',
  display_name: await getDisplayName(), // ← Don't do this
  avatar_url: await getAvatarUrl(),    // ← Don't do this
  username: await getUsername()        // ← Don't do this
};
```

## Status
- ✅ Immediate workaround applied (removed optional columns)
- ⏳ Awaiting Supabase schema cache refresh
- ⏳ Awaiting hard refresh to test
- 📝 Documented long-term solutions

**Date:** 2024-12-13  
**Impact:** Blocks all share creation until cache refreshes or workaround applied
