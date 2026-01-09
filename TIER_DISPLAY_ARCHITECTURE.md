# Tier Display Architecture - Single Source of Truth

## ✅ VERIFIED: January 8, 2026

### Architecture
**universal-tier-listener.js** is the ONLY code that updates tier pills across all pages.

### Files Modified (Long-term Fix)
1. `public/lib/boot/universal-tier-listener.js` - Extract `.tier` from NavCache object
2. `public/hi-dashboard.html` - Inlined tier listener with `.tier` extraction
3. `public/hi-muscle.html` - Added ProfileManager.js for profile loading
4. `public/lib/boot/profile-navigation.js` - REMOVED competing tier update
5. `public/lib/HiMembership.js` - REMOVED competing tier update

### Data Flow
```
ProfileManager.init()
  ↓
Loads user profile + membership from database
  ↓
Fires: window.dispatchEvent('hi:auth-ready', { membership: {...} })
  ↓
universal-tier-listener.js listens
  ↓
Extracts: membership.tier OR NavCache.getTier().tier (for cached/fast path)
  ↓
Calls: HiBrandTiers.updateTierPill(element, tierString, options)
  ↓
Tier pill displays: "Hi Pathfinder" for bronze, "Hi Friend" for anonymous
```

### NavCache Structure
```javascript
NavCache.getTier() returns:
{
  tier: 'bronze',           // ✅ EXTRACT THIS
  membership: {...},
  timestamp: 1234567890,
  needsRefresh: false
}

// CORRECT usage:
const cached = NavCache.getTier();
const tierString = cached.tier || cached;  // Fallback for legacy
```

### Pages Using This System
- ✅ hi-dashboard.html (inlined version)
- ✅ hi-muscle.html (external file via dynamic import)
- ✅ profile.html (external file via dynamic import)
- ✅ hi-island-NEW.html (external file)
- ✅ hi-island.html (external file)

### Competing Code REMOVED
- ❌ profile-navigation.js → `updateBrandTierDisplay(e)` removed from auth-ready listener
- ❌ HiMembership.js → Tier pill update removed after membership load
- ❌ HiStandardNavigation.js → `this.updateTierIndicator()` call removed
- ❌ dashboard-main.js → Competing pageshow tier update removed

### Why This Works Long-term
1. **Single listener** - Only universal-tier-listener.js responds to hi:auth-ready
2. **NavCache fast path** - Instant display on repeat visits (no database wait)
3. **Correct extraction** - `.tier` property extracted from NavCache structured object
4. **All pages consistent** - Same ProfileManager + NavCache + universal-tier-listener
5. **No race conditions** - No competing code can overwrite the tier

### Testing Checklist
- [ ] Dashboard shows "Hi Pathfinder" for bronze (no flash to "Hi Friend")
- [ ] Profile shows "Hi Pathfinder" for bronze (no flash)
- [ ] Hi Gym shows tier correctly (ProfileManager now loaded)
- [ ] Hard refresh maintains tier (NavCache provides instant display)
- [ ] Mobile navigation preserves tier across bfcache events
- [ ] Other user accounts show correct tier (verified by user report)

### Debug Commands
```javascript
// Check cache
window.NavCache.getTier()

// Check profile
window.ProfileManager.getProfile()

// Check tier config
window.HiTierConfig.getTierConfig('bronze')

// Force tier update (testing only)
window.dispatchEvent(new CustomEvent('hi:auth-ready', {
  detail: { membership: { tier: 'bronze' } }
}))
```

## Long-term Maintenance
- **DO NOT** add tier updates to any other file
- **DO NOT** modify tier pill textContent directly
- **ALWAYS** use `HiBrandTiers.updateTierPill()`
- **ALWAYS** extract `.tier` from NavCache objects
- **TEST** tier display on all pages after any auth changes
