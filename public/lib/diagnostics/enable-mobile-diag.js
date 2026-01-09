// enable-mobile-diag.js - Conditional loader for mobile diagnostics
// Add this ONE LINE to any page you want to diagnose:
// <script src="/lib/diagnostics/enable-mobile-diag.js"></script>

(function() {
  const urlParams = new URLSearchParams(window.location.search);
  const diagEnabled = urlParams.get('diag') === '1' || localStorage.getItem('HI_DIAG') === '1';
  
  if (diagEnabled) {
    const script = document.createElement('script');
    script.src = (window.location.hostname === 'localhost' ? '/public' : '') + '/lib/diagnostics/mobile-diag.js';
    script.async = false; // Load synchronously to catch early events
    document.head.insertBefore(script, document.head.firstChild);
    
    // Add visual indicator
    window.addEventListener('load', () => {
      const indicator = document.createElement('div');
      indicator.innerHTML = '🔍 DIAG';
      indicator.style.cssText = 'position:fixed;top:0;right:0;background:#00ff00;color:#000;padding:4px 8px;z-index:999999;font-size:10px;font-weight:bold;';
      document.body.appendChild(indicator);
    });
  }
})();
