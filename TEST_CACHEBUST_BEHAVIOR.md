# 🧪 Testing Cache-Bust Line Behavior

## The Problematic Code

```javascript
const queryPromise = supabase
  .from('user_stats')
  .select('*')
  .eq('user_id', userId)
  .eq('_cachebust', timestamp)  // ❌ WHAT DOES THIS DO?
  .single();
```

## What `.eq('_cachebust', timestamp)` Actually Does

PostgREST (Supabase's REST API) translates `.eq('field', value)` into SQL:

```sql
SELECT *
FROM user_stats
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6'
  AND _cachebust = 1735577400000  -- ❌ This column doesn't exist
```

## Expected Behavior

**Option A: Query Returns Empty** (most likely)
- PostgREST: "Column `_cachebust` doesn't exist"
- Returns: `{ data: null, error: { code: '42703', message: 'column "_cachebust" does not exist' } }`
- Result: ❌ Stats NEVER load, shows 0s forever

**Option B: PostgREST Ignores Invalid Column** (less likely)
- PostgREST: "Unknown column, skip filter"
- Returns: Normal query result
- Result: ✅ Stats load normally (but cache-bust does nothing)

**Option C: Query Throws Error** (possible)
- Supabase client: "Invalid column"
- Throws exception
- Result: ❌ Stats loading crashes, shows 0s

## How to Test (User Must Do)

1. **Check Browser Console**
   - Open profile.html
   - Look for: `"Stats query error:"` or `"column "_cachebust" does not exist"`
   - If error appears → Cache-bust is BREAKING query

2. **Check Network Tab**
   - Open DevTools → Network
   - Load profile page
   - Find request to: `https://gfcubvroxgfvjhacinic.supabase.co/rest/v1/user_stats?...`
   - Check Response:
     - If empty `[]` or error → Cache-bust is BREAKING query
     - If has data with `total_hi_moments` → Cache-bust is being IGNORED

## Why This Might Work Anyway

**If user sees stats loading correctly:**
- PostgREST is likely ignoring the invalid column
- This would mean cache-bust does nothing (neither helps nor breaks)
- We can safely remove it

**If user sees stats stuck at 0:**
- Cache-bust line is BREAKING the query
- MUST remove immediately

## The Real Question

**Does Supabase/PostgREST even cache responses?**

Looking at Service Worker (sw.js line 166):
```javascript
// Skip Supabase API calls (always need fresh data)
if (url.hostname.includes('supabase.co')) {
  return;  // SW doesn't intercept
}
```

**Service Worker is NOT caching Supabase API calls.**

So cache-busting is **completely unnecessary** regardless of whether it works or breaks.

## Verdict

**MUST REMOVE** `.eq('_cachebust', timestamp)` because:
1. Unnecessary (SW doesn't cache Supabase)
2. Potentially broken (column doesn't exist)
3. Adds confusion and maintenance burden
4. Not how cache-busting works in REST APIs

**Proper cache-busting** (if ever needed) would be:
```javascript
// Option 1: HTTP headers
fetch(url, { cache: 'no-cache' })

// Option 2: URL timestamp
fetch(`${url}?_=${Date.now()}`)

// Option 3: PostgREST cache-control
// (Supabase already sends Cache-Control: no-cache by default)
```
