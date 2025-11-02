// DEPRECATED: moved to /lib/HiFlowController.js on 2025-11-01
console.warn('⚠️ DEPRECATED: assets/hi-flow-controller.js moved to lib/HiFlowController.js - update your imports');

// Load consolidated module
const flowControllerScript = document.createElement('script');
flowControllerScript.src = '../../lib/HiFlowController.js';
flowControllerScript.onerror = () => {
  console.warn('⏳ Loading fallback hi-flow-controller.js...');
  const fallbackFlowScript = document.createElement('script');
  fallbackFlowScript.src = './hi-flow-controller.js.bak';
  document.head.appendChild(fallbackFlowScript);
};
document.head.appendChild(flowControllerScript);