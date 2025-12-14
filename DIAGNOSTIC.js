# Quick Diagnostic Script

Run this in browser console to check current state:

```javascript
// Check what version of HiDB is loaded
console.log('=== DIAGNOSTIC ===');

// 1. Check if code has latest fix
const hidbSource = await fetch('/public/lib/HiDB.js').then(r => r.text());
const hasAvatarField = hidbSource.includes('avatar_url: avatar_url');
console.log('❌ OLD CODE (has avatar_url):', hasAvatarField);
console.log('✅ NEW CODE (no avatar_url):', !hasAvatarField);

// 2. Check modal state
const backdrop = document.getElementById('hi-share-backdrop');
const sheet = document.getElementById('hi-share-sheet');
console.log('Backdrop:', {
  exists: !!backdrop,
  classes: backdrop?.className,
  zIndex: backdrop?.style.zIndex,
  display: backdrop?.style.display,
  pointerEvents: backdrop?.style.pointerEvents
});
console.log('Sheet:', {
  exists: !!sheet,
  classes: sheet?.className,
  display: sheet?.style.display
});

// 3. Test close
if (backdrop) {
  console.log('Trying to close modal...');
  backdrop.click();
  setTimeout(() => {
    console.log('After click - Backdrop active:', backdrop.classList.contains('active'));
    console.log('After click - Sheet active:', sheet.classList.contains('active'));
  }, 100);
}

// 4. Check database columns
const { data, error } = await window.supabase
  .from('public_shares')
  .select('*')
  .limit(1);
  
console.log('Database actual columns:', data ? Object.keys(data[0] || {}) : 'error');
console.log('Database error:', error);
```

Copy this entire block, paste in console, press Enter.
