// sw-register.js — minimal SW registration for offline shell
(function(){
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;
  const disabled = location.search.includes('nosw=1');
  if (disabled) return;
  window.addEventListener('load', function(){
    navigator.serviceWorker.register('/sw.js').catch(()=>{});
  });
})();
