// DEPRECATED: moved to /lib/HiPerformance.js on 2025-11-01
console.warn('⚠️ DEPRECATED: assets/performance-manager.js moved to lib/HiPerformance.js - update your imports');

// Load consolidated module
const script = document.createElement('script');
script.src = '../../lib/HiPerformance.js';
script.onerror = () => {
  console.warn('⏳ Loading fallback performance-manager.js...');
  const fallbackScript = document.createElement('script');
  fallbackScript.src = './performance-manager.js.bak';
  document.head.appendChild(fallbackScript);
};
document.head.appendChild(script);