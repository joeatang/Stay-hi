// 🔧 TESLA-GRADE: Fixed path references to prevent 404 errors
console.log('📱 Loading PWA Manager...');

// Load consolidated module with correct paths
const pwaManagerScript = document.createElement('script');
pwaManagerScript.src = '../lib/HiPWA.js';
pwaManagerScript.onerror = () => {
  console.warn('⏳ PWA loading failed - continuing without PWA features');
  // No fallback to prevent 404 errors
};
document.head.appendChild(pwaManagerScript);