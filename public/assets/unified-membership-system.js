// DEPRECATED: moved to /lib/HiMembership.js on 2025-11-01
console.warn('⚠️ DEPRECATED: assets/unified-membership-system.js moved to lib/HiMembership.js - update your imports');

// Load consolidated module
const script = document.createElement('script');
script.src = '../../lib/HiMembership.js';
script.onerror = () => {
  console.warn('⏳ Loading fallback unified-membership-system.js...');
  const fallbackScript = document.createElement('script');
  fallbackScript.src = './unified-membership-system.js.bak';
  document.head.appendChild(fallbackScript);
};
document.head.appendChild(script);