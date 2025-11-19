// Load Hi OS enhancement layer after base tracker
setTimeout(() => {
  import('../stats/HiOSEnhancementLayer.js')
    .then(() => console.log('🚀 Hi OS Enhancement Layer loaded for Hi-Island'))
    .catch(error => console.warn('⚠️ Hi OS enhancement optional:', error));
}, 100);
