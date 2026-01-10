// enable-mobile-diag.js - Conditional loader for mobile diagnostics
// Add this ONE LINE to any page you want to diagnose:
// <script src="/lib/diagnostics/enable-mobile-diag.js"></script>

(function() {
  const urlParams = new URLSearchParams(window.location.search);
  const diagEnabled = urlParams.get('diag') === '1' || localStorage.getItem('HI_DIAG') === '1';
  
  if (diagEnabled) {
    const basePath = (window.location.hostname === 'localhost' ? '/public' : '');
    
    // Load console-based diagnostics
    const script1 = document.createElement('script');
    script1.src = basePath + '/lib/diagnostics/mobile-diag.js';
    script1.async = false;
    document.head.insertBefore(script1, document.head.firstChild);
    
    // Load on-screen overlay diagnostics
    const script2 = document.createElement('script');
    script2.src = basePath + '/lib/diagnostics/mobile-diag-overlay.js';
    script2.async = false;
    document.head.insertBefore(script2, document.head.firstChild);
  }
})();
