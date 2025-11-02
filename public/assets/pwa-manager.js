// DEPRECATED: moved to /lib/HiPWA.js on 2025-11-01
console.warn('⚠️ DEPRECATED: assets/pwa-manager.js moved to lib/HiPWA.js - update your imports');

// Load consolidated module
const pwaManagerScript = document.createElement('script');
pwaManagerScript.src = '../../lib/HiPWA.js';
pwaManagerScript.onerror = () => {
  console.warn('⏳ Loading fallback pwa-manager.js...');
  const fallbackPwaScript = document.createElement('script');
  fallbackPwaScript.src = './pwa-manager.js.bak';
  document.head.appendChild(fallbackPwaScript);
};
document.head.appendChild(pwaManagerScript);