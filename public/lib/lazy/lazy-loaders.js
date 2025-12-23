(function(global){
  let loadingCalendar = null;
  function loadPremiumCalendar() {
    if (global.PremiumCalendar) return Promise.resolve(global.PremiumCalendar);
    if (loadingCalendar) return loadingCalendar;
    loadingCalendar = new Promise((resolve, reject) => {
      const existing = Array.from(document.scripts).find(s => (s.src||'').includes('assets/premium-calendar.js'));
      if (existing && global.PremiumCalendar) { resolve(global.PremiumCalendar); return; }
      const script = document.createElement('script');
      script.src = 'assets/premium-calendar.js?v=20241222-streak-fix';
      script.async = true;
      script.onload = () => resolve(global.PremiumCalendar || global.PremiumCalendar);
      script.onerror = () => reject(new Error('Failed to load premium-calendar.js'));
      document.head.appendChild(script);
    });
    return loadingCalendar;
  }

  let loadingCropper = null;
  function loadTeslaAvatarCropper() {
    if (global.TeslaAvatarCropper) return Promise.resolve(global.TeslaAvatarCropper);
    if (loadingCropper) return loadingCropper;
    loadingCropper = new Promise((resolve, reject) => {
      const existing = Array.from(document.scripts).find(s => (s.src||'').includes('assets/tesla-avatar-cropper.js'));
      if (existing && global.TeslaAvatarCropper) { resolve(global.TeslaAvatarCropper); return; }
      const script = document.createElement('script');
      script.src = 'assets/tesla-avatar-cropper.js';
      script.async = true;
      script.onload = () => resolve(global.TeslaAvatarCropper);
      script.onerror = () => reject(new Error('Failed to load tesla-avatar-cropper.js'));
      document.head.appendChild(script);
    });
    return loadingCropper;
  }

  global.HiLazy = { loadPremiumCalendar, loadTeslaAvatarCropper };
  document.dispatchEvent(new CustomEvent('hi:lazy-ready', { detail: { loaders: global.HiLazy } }));
})(window);
