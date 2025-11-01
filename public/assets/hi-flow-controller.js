// DEPRECATED: moved to /lib/HiFlowController.js on 2025-11-01
console.warn('⚠️ DEPRECATED: assets/hi-flow-controller.js moved to lib/HiFlowController.js - update your imports');

// Load consolidated module
const script = document.createElement('script');
script.src = '../../lib/HiFlowController.js';
script.onerror = () => {
  console.warn('⏳ Loading fallback hi-flow-controller.js...');
  const fallbackScript = document.createElement('script');
  fallbackScript.src = './hi-flow-controller.js.bak';
  document.head.appendChild(fallbackScript);
};
document.head.appendChild(script);