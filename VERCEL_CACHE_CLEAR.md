# Clear Vercel Cache

The syntax error at line 3859 is a **phantom error from Vercel edge caching**.

## Evidence:
1. ✅ Node.js parses the file with NO syntax errors
2. ✅ All brackets match correctly
3. ❌ Console shows NO diagnostic logs from commits a50daf8 and 34c1646
4. ❌ Browser still reporting line 3859 error that doesn't exist in source

## Solution:
Force Vercel to rebuild and clear edge cache:

```bash
# Option 1: Vercel Dashboard
1. Go to https://vercel.com/joeatang/stay-hi
2. Click "Deployments"
3. Find latest deployment
4. Click "..." → "Redeploy" → Check "Use existing build cache: NO"

# Option 2: Touch a file to trigger rebuild
cd /Users/joeatang/Documents/GitHub/Stay-hi
echo "// Cache bust $(date)" >> public/profile.html
git add -A && git commit -m "chore: Bust Vercel cache" && git push
```

## What's Actually Broken:
1. **ProfileMerge.js** - FIXED (commit 34c1646) but not deployed
2. **Diagnostic logging** - ADDED (commit a50daf8) but not deployed
3. **Vercel serving old broken version** - NEEDS CACHE CLEAR

Once cache clears, you'll see:
- ✅ `💾 CHECKING LOCALSTORAGE for user: ...`
- ✅ `📤 SAVING TO SUPABASE: ...`
- ✅ `[ProfileMerge] ✅ Profile synced to database after merge`
- ❌ NO MORE 400 Bad Request errors
- ❌ NO MORE syntax error at line 3859
