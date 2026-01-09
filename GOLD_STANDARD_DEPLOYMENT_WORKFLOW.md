# 🚀 Gold Standard Deployment Workflow
## Zero-Downtime Production Updates for 14+ Active Users

**Philosophy:** Users should NEVER know the app is being updated. No interruptions, no announcements, instant rollback capability.

---

## 🎯 Deployment Tiers

### **Tier 1: Silent Bug Fixes (No User Impact)**
**Examples:** Check-in button errors, avatar upload blocks, tier pill flashing  
**User Experience:** Instant improvement, zero awareness

**Workflow:**
1. ✅ Fix code locally
2. ✅ Test in browser DevTools (no server needed for client-side)
3. ✅ `git commit -m "PRODUCTION FIX: [clear description]"`
4. ✅ `git push` → Vercel auto-deploys in ~30 seconds
5. ✅ Monitor for 5 minutes (check Supabase logs if backend change)
6. ✅ No announcement needed - users just see it work better

**Database Changes (RLS policies, functions):**
- Run SQL in Supabase dashboard → Effects immediate
- Zero downtime (existing sessions unaffected)
- Test with `SELECT` first, then `CREATE/DROP POLICY`

---

### **Tier 2: New Features (Flagged Rollout)**
**Examples:** Post editing, new profile sections, messaging  
**User Experience:** Feature appears gradually, can be disabled instantly

**Workflow:**
1. ✅ Add feature behind `HiFlags.getFlag('feature_name')`
2. ✅ Set flag to `false` in database (default off)
3. ✅ Deploy code (feature exists but hidden)
4. ✅ Test with your account: `UPDATE feature_flags SET enabled = true WHERE flag = 'feature_name' AND user_id = 'YOUR_ID'`
5. ✅ Roll out to 10% of users after 24h monitoring
6. ✅ 100% rollout after 3 days stable
7. ✅ Instant disable if issues: `UPDATE feature_flags SET enabled = false WHERE flag = 'feature_name'`

**Feature Flag Structure:**
```sql
CREATE TABLE IF NOT EXISTS feature_flags (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  flag text NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  tier text, -- 'bronze', 'silver', 'gold' for tier-gated features
  enabled boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
```

---

### **Tier 3: Infrastructure Changes (Staged Deployment)**
**Examples:** Auth system overhaul, database schema migration, API changes  
**User Experience:** Seamless transition, backwards compatible

**Workflow:**
1. ✅ **Week 1:** Deploy new code alongside old (dual support)
2. ✅ **Week 2:** Monitor both paths, fix edge cases
3. ✅ **Week 3:** Migrate 25% of traffic to new path
4. ✅ **Week 4:** 100% migration, remove old code
5. ✅ **Always:** Keep rollback SQL ready

**Example - Database Migration:**
```sql
-- Phase 1: Add new column (non-breaking)
ALTER TABLE profiles ADD COLUMN new_field text;

-- Phase 2: Backfill data (background)
UPDATE profiles SET new_field = old_field WHERE new_field IS NULL;

-- Phase 3: Update app to use new_field

-- Phase 4: Drop old_field after 1 week
ALTER TABLE profiles DROP COLUMN old_field;
```

---

## 🔥 Emergency Rollback Procedures

### **Client-Side Issues (UI bugs, JS errors)**
**Instant Fix:**
```bash
git revert HEAD
git push
# Vercel redeploys in 30 seconds
```

### **Database Issues (RLS blocking, function errors)**
**Instant Fix:**
```sql
-- Drop new policies
DROP POLICY "new_policy_name" ON table_name;

-- Restore old policy
CREATE POLICY "old_policy_name" ON table_name
FOR INSERT WITH CHECK (old_logic_here);
```

### **Feature Flag Disable**
```sql
UPDATE feature_flags SET enabled = false WHERE flag = 'problematic_feature';
-- Takes effect immediately for next page load
```

---

## 📊 Monitoring During Deployments

### **Real-Time Health Check (Run in Browser Console)**
```javascript
// Check if session persists
await window.hiSupabase.auth.getSession()

// Check if stats load
await window.UnifiedStatsLoader.getStats()

// Check profile manager
await window.ProfileManager.getProfile()

// Check tier display
localStorage.getItem('hi_membership_tier')
```

### **Supabase Logs (Check After Deploy)**
1. Go to Supabase Dashboard → Logs → API
2. Filter last 5 minutes
3. Look for 500 errors, auth failures, RLS violations
4. No errors = successful deploy

### **User Impact Metrics**
- ✅ **Good:** Session persists across navigation
- ✅ **Good:** Stats load in <1 second
- ✅ **Good:** No red error text anywhere
- ❌ **Bad:** Users reporting "signed out" feeling
- ❌ **Bad:** Points not updating after check-in
- ❌ **Bad:** Avatar uploads disappearing

---

## 🎯 Current Production Deployment (Today's Fix)

### **Issue 1: Check-in Button Red Error**
**Root Cause:** Called wrong function name (`hi_award_points` vs `award_daily_checkin`)  
**Impact:** All users seeing error on daily check-in  
**Fix:** Change function call in profile.html line 1609  
**Deployment:** Push to GitHub → Vercel auto-deploy → 30 seconds live  
**Rollback:** `git revert` if issues  
**User Notice:** None - they just see it start working

### **Issue 2: Avatar Upload Blocked**
**Root Cause:** RLS policy requires `auth.uid()` but new users don't have it yet  
**Impact:** New user avatars not persisting  
**Fix:** Add temp/ folder policy for anonymous uploads  
**Deployment:** Run SQL in Supabase (DEPLOY_FIX_PRODUCTION_REGRESSION.sql)  
**Rollback:** Drop new policies, restore old ones  
**User Notice:** None - they just see uploads work

### **Deployment Order:**
1. ✅ Fix check-in button (profile.html) → Push to GitHub
2. ⏱️ Wait 1 minute for Vercel deploy
3. ✅ Test check-in on your profile (should see +5 points, green text)
4. ✅ Fix avatar RLS (run SQL in Supabase)
5. ⏱️ Wait 1 minute for RLS to propagate
6. ✅ Test avatar upload (new user should see it persist)
7. ✅ Monitor for 5 minutes (no error logs)
8. ✅ Mark as deployed in changelog

---

## 💡 Best Practices

### **DO:**
- ✅ Test locally first (open HTML in browser, check console)
- ✅ Deploy during low-traffic hours (early morning US time)
- ✅ Keep commits atomic (one fix per commit)
- ✅ Write clear commit messages (future you will thank you)
- ✅ Monitor for 5 minutes after deploy
- ✅ Keep rollback SQL handy

### **DON'T:**
- ❌ Deploy multiple unrelated changes at once
- ❌ Skip testing even "simple" fixes
- ❌ Remove old code immediately (keep for 1 week)
- ❌ Deploy breaking changes without backwards compatibility
- ❌ Announce updates unless user-facing feature
- ❌ Leave broken features in production ("we'll fix later")

### **Edge Cases:**
- **User mid-check-in during deploy:** Old session finishes, new session uses new code
- **User uploading avatar during RLS change:** Worst case = retry, new policy allows it
- **User navigating during JS deploy:** Browser caches old JS, refreshes get new version
- **Session expires during deploy:** Auth-resilience handles it, no logout

---

## 📈 Success Metrics

**Zero-Downtime Deploy = TRUE if:**
- ✅ No user reports "app stopped working"
- ✅ No spike in error logs
- ✅ Session persistence unchanged
- ✅ All features work immediately after deploy
- ✅ Users don't notice anything changed

**Perfect Deploy Checklist:**
- [ ] Local testing complete
- [ ] Commit message clear
- [ ] Vercel deploy successful (check dashboard)
- [ ] Supabase logs clean (no new errors)
- [ ] Tested on your account (check-in/avatar/navigation)
- [ ] 5 minutes stable monitoring
- [ ] Rollback plan ready (know exact revert steps)

---

## 🔄 Continuous Improvement

**After Each Deploy:**
1. Document what broke (if anything)
2. Add that scenario to testing checklist
3. Consider feature flag for similar changes
4. Update this workflow if gaps found

**Foundation Protection:**
- Session persistence = non-negotiable
- Cache-first loading = non-negotiable  
- Singleton stability = non-negotiable
- RLS security = non-negotiable
- Backwards compatibility = default stance

---

## 📞 Emergency Contact Pattern

**If Deploy Goes Wrong:**
1. **Immediate:** Run rollback (git revert or SQL restore)
2. **5 minutes:** Verify rollback worked (test yourself)
3. **10 minutes:** Notify users if data affected (rare)
4. **30 minutes:** Write incident report (what/why/fix)
5. **Next day:** Deploy proper fix with more testing

**User Communication (Only if Data Loss):**
```
"Quick heads-up: We just fixed a bug that might have affected 
[specific feature]. Everything's working now. If you notice 
anything off, refresh the page or let us know!"
```

**Silent Fix (99% of deploys):**
- No Slack message
- No email
- No in-app notification
- Users just see it work better

---

## 🎯 Foundation Integrity Principles

**From User Directive:** "foundational structure and integrity is fine and awesome and i need this to remain that way"

**Protected Systems:**
1. **Session Persistence:** Cache-first auth, no fake logouts
2. **Singleton Stability:** Client reference swapping, no stale state
3. **Cache Strategy:** localStorage first, database refresh background
4. **Mobile Lifecycle:** pageshow/pagehide handlers preserved
5. **Error Boundaries:** AbortError catch, graceful degradation

**Never Break:**
- User can always navigate between pages
- Session survives backgrounding/navigation
- Stats load instantly from cache
- Profile displays immediately
- Tier pill never flashes wrong value
- Points system always accurate

---

**Last Updated:** January 9, 2026  
**Status:** Production-ready for 14+ active users  
**Next Review:** After reaching 50 users (scale considerations)
