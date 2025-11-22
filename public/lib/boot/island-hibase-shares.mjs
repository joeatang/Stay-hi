// Import HiBase shares for flagged rollout
const sharesModule = await import('../hibase/shares.js');
window.HiBase = window.HiBase || {};

// WOZ FIX: ES6 module exports are wrapped - expose them directly
// Only expose methods that actually exist in the module
window.HiBase.shares = {
  insertShare: sharesModule.insertShare,
  getPublicShares: sharesModule.getPublicShares,
  getUserShares: sharesModule.getUserShares,
  // Expose full module for future methods
  _module: sharesModule
};

console.log('🔥 HiBase shares module loaded for Hi Island feed integration');
console.log('✅ Available methods:', Object.keys(window.HiBase.shares).filter(k => k !== '_module'));
