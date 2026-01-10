# ✅ PRODUCTION DEPLOYMENT CHECKLIST
**Deploy Date:** January 9, 2026  
**Commit:** 2573edf  
**Issues Fixed:** Check-in button error + Avatar upload regression

---

## Phase 1: Code Deploy ✅ COMPLETE
- [x] Committed to GitHub
- [x] Pushed to remote (2573edf)
- [x] Vercel auto-deploy started
- [ ] **NEXT:** Wait 60 seconds for Vercel build

---

## Phase 2: Database Deploy ⏳ PENDING
**File:** `DEPLOY_FIX_PRODUCTION_REGRESSION.sql`  
**Action:** Run in Supabase SQL Editor

### Steps:
1. Open [Supabase Dashboard](https://supabase.com/dashboard/project/gfcubvroxgfvjhacinic)
2. Go to SQL Editor
3. Copy entire contents of `DEPLOY_FIX_PRODUCTION_REGRESSION.sql`
4. Click "Run" button
5. Verify output shows policies created successfully

### Expected Output:
```
DROP POLICY
DROP POLICY
DROP POLICY
...
CREATE POLICY (8 times)
SELECT 8 rows (policy verification)
SELECT 1 row (bucket config)
```

---

## Phase 3: Testing 🧪 REQUIRED

### Test 1: Check-in Button
1. Open [Profile Page](http://localhost:3030/public/profile.html)
2. Click "Daily Check-in +5" button
3. **Expected:** Green text "+5 points!" or "Done today"
4. **Fail:** Red error text
5. **Rollback if fail:** `git revert 2573edf && git push`

### Test 2: Avatar Upload (Authenticated)
1. Log in to profile
2. Click avatar → upload new image
3. **Expected:** Image saves and persists on refresh
4. **Fail:** Red error or image disappears
5. **Check console for:** RLS violations

### Test 3: Avatar Upload (Anonymous)
1. Open profile in incognito/private window
2. Upload avatar without signing in
3. **Expected:** Image uploads to temp/ folder
4. **Fail:** "row-level security" error
5. **Rollback SQL if fail:** Drop new policies, restore old ones

---

## Phase 4: Monitoring 📊 5 MINUTES

### Check Supabase Logs
1. Dashboard → Logs → API
2. Filter: Last 5 minutes
3. **Look for:**
   - ❌ 500 errors → Rollback immediately
   - ❌ RLS violations → Check temp/ policy
   - ❌ "function not found" → Check-in still broken
   - ✅ 200 responses → All good!

### Check Browser Console
1. Open DevTools on profile page
2. Click check-in button
3. **Look for:**
   - ✅ "📬 RPC response: { data: {...}, error: null }"
   - ✅ "✅ Check-in success"
   - ❌ "❌ Check-in error" → Rollback code

### Check User Reports
1. Monitor Slack/Discord for next 10 minutes
2. **Expected:** No new "broken" reports
3. **Ideal:** Users silently see features work
4. **If complaints:** Investigate immediately, rollback if needed

---

## Phase 5: Rollback Plan 🔙 READY

### Code Rollback (30 seconds)
```bash
git revert 2573edf
git push
# Vercel auto-deploys old version
```

### Database Rollback (Immediate)
```sql
-- Drop new policies
DROP POLICY IF EXISTS "Authenticated users upload to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Anonymous users upload to temp folder" ON storage.objects;
DROP POLICY IF EXISTS "Persistent users upload to users folder" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users update own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone updates temp avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users delete own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone deletes temp avatars" ON storage.objects;

-- Restore old policy (from supabase-storage-setup.sql)
CREATE POLICY "Users can upload their own avatars" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

---

## Phase 6: Success Criteria ✨

### Deploy Successful If:
- ✅ Check-in shows green "+5 points!" text
- ✅ Avatar uploads persist for authenticated users
- ✅ Avatar uploads work for anonymous users (temp/ folder)
- ✅ No spike in Supabase error logs
- ✅ No user reports of broken features
- ✅ 5 minutes stable monitoring (no issues)

### Deploy Failed If:
- ❌ Check-in still shows red error
- ❌ Avatar uploads blocked by RLS
- ❌ Users reporting "app broken"
- ❌ Supabase logs showing 500 errors
- → **ROLLBACK IMMEDIATELY**

---

## Phase 7: Post-Deploy 📝

### Mark as Complete:
- [ ] Update `CHANGELOG.md` with fix details
- [ ] Close GitHub issue (if exists)
- [ ] Document any edge cases found
- [ ] Update testing checklist with new scenarios

### User Communication:
**DO NOT announce** - Silent fix, users just see it work better

**Only if data loss occurred:**
```
"Quick fix deployed: Check-in button and avatar uploads 
now working. Refresh if you see any lingering issues!"
```

---

## 🎯 Current Status: ⏳ AWAITING DATABASE DEPLOY

**NEXT ACTION:**  
Run `DEPLOY_FIX_PRODUCTION_REGRESSION.sql` in Supabase SQL Editor

**THEN:**  
Test check-in button + avatar upload (authenticated & anonymous)

**FINALLY:**  
Monitor for 5 minutes, mark as complete or rollback
