// DEPRECATED: moved to /lib/HiPerformance.js on 2025-11-01
console.warn('⚠️ DEPRECATED: assets/performance-manager.js moved to lib/HiPerformance.js - update your imports');

// If already initialized, skip reloading
if (window.assetManager) {
  console.debug('[performance-manager] AssetManager already present, skipping load');
} else {
  // Load consolidated module from public scope
  const script = document.createElement('script');
  script.src = '/lib/HiPerformance.js';
  script.onload = () => console.debug('[performance-manager] Loaded /lib/HiPerformance.js');
  script.onerror = (e) => {
    console.warn('[performance-manager] Failed to load /lib/HiPerformance.js:', e);
  };
  document.head.appendChild(script);
}