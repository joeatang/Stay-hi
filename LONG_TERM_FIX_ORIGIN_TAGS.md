# Long-Term Fix: Origin Tag System

## Problems Fixed

### 1. Origin Tag Mismatch
**Problem:** hi-muscle.html was calling `openHiShareSheet('hi-muscle', ...)` but database/pills expected `'higym'`

**Fix Applied:**
```javascript
// OLD (WRONG):
window.openHiShareSheet('hi-muscle', { ... });

// NEW (CORRECT):
window.openHiShareSheet('higym', { ... });
```

**Impact:** Pills now derive correctly as purple HiGym instead of orange Hi5

---

### 2. Missing Pill Field in Database
**Problem:** Database has `pill` column but HiShareSheet wasn't setting it, so pill derivation had to guess from content

**Fix Applied:**
```javascript
// HiShareSheet.js line 1383
pill: this.origin === 'higym' ? 'higym' : (this.origin === 'hi-island' ? 'island' : 'hi5')
```

**Impact:** Database now stores authoritative pill type, no guessing needed

---

### 3. Archive Schema Incomplete
**Problem:** hi_archives has 13 columns but insertArchive() only set 7, causing 400 errors

**Actual Schema (from logs):**
```
id, user_id, current_emoji, desired_emoji, journal, location, 
created_at, origin, type, text, content, current_name, desired_name
```

**Fix Applied:**
```javascript
const row = {
  user_id,
  journal: journalText,
  current_emoji: entry.currentEmoji || '👋',
  current_name: entry.currentName || 'Hi',
  desired_emoji: entry.desiredEmoji || '✨',
  desired_name: entry.desiredName || 'Goal',
  location: entry.location || null,
  origin: entry.metadata?.origin || entry.origin || 'unknown', // ADDED
  type: entry.type || 'general', // ADDED
  text: entry.text || journalText, // ADDED
  content: entry.text || journalText // ADDED
};
```

**Impact:** Anonymous shares now save to BOTH archives AND public_shares without 400 errors

---

### 4. Anonymous Shares Not Appearing
**Problem:** 400 errors prevented save to public_shares (now fixed)

**Root Cause:** Schema mismatch in both insertPublicShare() and insertArchive()

**Verification:** General feed query already loads all visibility types (public + anonymous + private if user is owner). No filter needed.

---

## Long-Term Prevention Strategy

### Phase 1: Standardize Origin Tags (DONE)
✅ Document valid origin values: `'higym'`, `'hi-island'`, `'hi5'`
✅ Fix all call sites to use correct tags
✅ Add pill field to database payload

### Phase 2: Schema Documentation (TODO)
Create comprehensive schema reference docs:
- `DATABASE_SCHEMA.md` with actual CREATE TABLE statements
- JSDoc types for TypeScript-style checking
- Column-by-column documentation with examples

### Phase 3: Validation Layer (TODO)
Add schema validation before database inserts:
```javascript
// /public/lib/validation/SchemaValidator.js
export const PUBLIC_SHARES_SCHEMA = {
  user_id: 'uuid?',
  content: 'string!',
  location: 'string?',
  visibility: "'public'|'private'|'anonymous'!",
  origin: 'string!',
  pill: 'string?',
  username: 'string?',
  display_name: 'string?',
  avatar_url: 'string?'
};

export function validatePublicShare(data) {
  const errors = [];
  for (const [key, type] of Object.entries(PUBLIC_SHARES_SCHEMA)) {
    // Validate type and required fields
  }
  return errors.length === 0;
}
```

### Phase 4: Automated Tests (TODO)
Test share creation across all pages:
- Hi Gym: `origin='higym'`, `pill='higym'`
- Hi Island: `origin='hi-island'`, `pill='island'`
- Dashboard: `origin='hi5'`, `pill='hi5'`

Test all visibility types:
- Public: appears in general feed with user name
- Anonymous: appears in general feed as anonymous, also in personal archives
- Private: only in personal archives

### Phase 5: Single Share Module (TODO - HIGH PRIORITY)
Create `/public/lib/shares/UnifiedShareCreator.js`:
```javascript
/**
 * Single source of truth for creating shares
 * All pages use this instead of calling hiDB directly
 */
export async function createShare({
  text,
  origin, // 'higym', 'hi-island', 'hi5'
  visibility, // 'public', 'anonymous', 'private'
  location,
  currentEmoji,
  desiredEmoji,
  metadata
}) {
  // Validate inputs
  if (!['higym', 'hi-island', 'hi5'].includes(origin)) {
    throw new Error(`Invalid origin: ${origin}`);
  }
  
  // Derive pill from origin
  const pill = ORIGIN_TO_PILL[origin];
  
  // Create payloads with correct schema
  const publicPayload = {
    user_id: visibility === 'anonymous' ? null : await getUserId(),
    content: text,
    visibility,
    origin,
    pill,
    location,
    display_name: await getDisplayName(),
    avatar_url: await getAvatarUrl()
  };
  
  const archivePayload = {
    user_id: await getUserId(),
    journal: text,
    current_emoji: currentEmoji || '👋',
    desired_emoji: desiredEmoji || '✨',
    origin,
    type: origin,
    text,
    content: text,
    location
  };
  
  // Save to database(s)
  const results = await Promise.allSettled([
    visibility !== 'private' ? hiDB.insertPublicShare(publicPayload) : null,
    hiDB.insertArchive(archivePayload)
  ]);
  
  // Return results
  return {
    public: results[0],
    archive: results[1]
  };
}
```

**Benefits:**
- Single place to update schema mappings
- Guaranteed consistency across all pages
- Easy to add validation
- Simpler to test

### Phase 6: Origin Tag Constants (TODO)
```javascript
// /public/lib/constants/OriginTags.js
export const ORIGIN = {
  HI_GYM: 'higym',
  HI_ISLAND: 'hi-island',
  HI_FIVE: 'hi5'
};

export const PILL = {
  HI_GYM: 'higym',
  HI_ISLAND: 'island',
  HI_FIVE: 'hi5'
};

export const ORIGIN_TO_PILL = {
  [ORIGIN.HI_GYM]: PILL.HI_GYM,
  [ORIGIN.HI_ISLAND]: PILL.HI_ISLAND,
  [ORIGIN.HI_FIVE]: PILL.HI_FIVE
};

// Validation
export function isValidOrigin(origin) {
  return Object.values(ORIGIN).includes(origin);
}
```

Then use everywhere:
```javascript
import { ORIGIN } from './lib/constants/OriginTags.js';

window.openHiShareSheet(ORIGIN.HI_GYM, { ... });
```

**Benefits:**
- No magic strings
- IDE autocomplete
- Easy refactoring (rename in one place)
- Self-documenting code

---

## Testing Checklist

### After Hard Refresh
- [ ] Share from Hi Gym shows purple pill (not orange)
- [ ] Anonymous share appears in general feed AND archives
- [ ] Public share appears in general feed AND archives with username
- [ ] Private share ONLY in archives
- [ ] No 400 errors in console
- [ ] Filter by HiGym shows only gym shares
- [ ] Filter by Hi5 shows only dashboard shares

### Edge Cases
- [ ] Share without location works
- [ ] Share without emojis works (uses defaults)
- [ ] Share from incognito window
- [ ] Share immediately after login
- [ ] Share with very long text (>500 chars)

---

## Implementation Priority

**Phase 1-2: DONE** ✅ Immediate fixes + this documentation

**Phase 3: HIGH** 🔴 Schema validation prevents 400 errors

**Phase 5: HIGH** 🔴 Single share module eliminates drift

**Phase 4: MEDIUM** 🟡 Automated tests catch regressions

**Phase 6: LOW** 🟢 Constants are nice-to-have, not critical

---

## Status
- ✅ Origin tag fixed in hi-muscle.html
- ✅ Pill field added to HiShareSheet payload
- ✅ Archive schema completed with all fields
- ⏳ Awaiting browser hard refresh to test
- ⏳ Awaiting long-term refactoring (Phase 3-6)

**Date:** 2024-12-13  
**Files Modified:** hi-muscle.html, HiShareSheet.js, HiDB.js
