// Import HiBase shares for flagged rollout
const sharesModule = await import('../hibase/shares.js');
window.HiBase = window.HiBase || {};
window.HiBase.shares = sharesModule;
console.log('🔥 HiBase shares module loaded for Hi Island feed integration');
