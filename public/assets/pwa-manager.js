// DEPRECATED: moved to /lib/HiPWA.js on 2025-11-01
console.warn('⚠️ DEPRECATED: assets/pwa-manager.js moved to lib/HiPWA.js - update your imports');

// Load consolidated module
const script = document.createElement('script');
script.src = '../../lib/HiPWA.js';
script.onerror = () => {
  console.warn('⏳ Loading fallback pwa-manager.js...');
  const fallbackScript = document.createElement('script');
  fallbackScript.src = './pwa-manager.js.bak';
  document.head.appendChild(fallbackScript);
};
document.head.appendChild(script);