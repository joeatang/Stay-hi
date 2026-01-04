// lib/navigation/SmoothNavigate.js
// Tesla-Grade SPA Navigation - Smooth page transitions without full reload
(function() {
  'use strict';

  // Pages that support smooth navigation
  const SUPPORTED_PAGES = [
    'hi-dashboard.html',
    'hi-island-NEW.html',
    'profile.html',
    'hi-muscle.html'
  ];

  // Track if navigation is in progress
  let isNavigating = false;

  // Main container selector - where we swap content
  const CONTENT_CONTAINER = 'body';

  /**
   * Smooth navigate to a new page
   * @param {string} targetURL - URL to navigate to
   * @param {boolean} addToHistory - Whether to add to browser history
   */
  async function smoothNavigate(targetURL, addToHistory = true) {
    if (isNavigating) {
      console.log('[SmoothNav] Navigation already in progress');
      return;
    }

    // Check if target page supports smooth nav
    const targetPage = targetURL.split('/').pop().split('?')[0];
    if (!SUPPORTED_PAGES.includes(targetPage)) {
      console.log('[SmoothNav] Page not supported, using normal navigation');
      window.location.href = targetURL;
      return;
    }

    isNavigating = true;
    console.log('[SmoothNav] Starting smooth navigation to:', targetURL);

    try {
      // 1. Fade out current content
      await fadeOutContent();

      // 2. Fetch new page HTML
      const html = await fetchPage(targetURL);
      
      // 3. Extract and replace content
      replaceContent(html);

      // 4. Update browser history
      if (addToHistory) {
        window.history.pushState({ page: targetURL }, '', targetURL);
      }

      // 5. Fade in new content
      await fadeInContent();

      // 6. Re-initialize page-specific components
      initializePageComponents(targetPage);

      console.log('[SmoothNav] ✅ Navigation complete');
    } catch (err) {
      console.error('[SmoothNav] Navigation failed, falling back to normal:', err);
      window.location.href = targetURL;
    } finally {
      isNavigating = false;
    }
  }

  /**
   * Fade out current content
   */
  function fadeOutContent() {
    return new Promise(resolve => {
      const body = document.body;
      body.style.transition = 'opacity 0.2s ease-out';
      body.style.opacity = '0';
      setTimeout(resolve, 200);
    });
  }

  /**
   * Fade in new content
   */
  function fadeInContent() {
    return new Promise(resolve => {
      const body = document.body;
      // Force reflow
      void body.offsetHeight;
      body.style.opacity = '1';
      setTimeout(() => {
        body.style.transition = '';
        resolve();
      }, 200);
    });
  }

  /**
   * Fetch page HTML
   */
  async function fetchPage(url) {
    const response = await fetch(url, {
      headers: { 'Accept': 'text/html' }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return await response.text();
  }

  /**
   * Replace body content with new page content
   */
  function replaceContent(html) {
    const parser = new DOMParser();
    const newDoc = parser.parseFromString(html, 'text/html');
    
    // Preserve auth state and critical globals
    const preservedGlobals = {
      __HI_SUPABASE_CLIENT: window.__HI_SUPABASE_CLIENT,
      hiSupabase: window.hiSupabase,
      __hiAuthResilience: window.__hiAuthResilience,
      HiSupabase: window.HiSupabase
    };

    // Get new body HTML (excluding scripts that are already loaded)
    const newBody = newDoc.body;
    
    // Replace body innerHTML but skip splash screen
    const currentBody = document.body;
    
    // Remove splash if it exists in new content
    const newSplash = newBody.querySelector('#instant-splash');
    if (newSplash) {
      newSplash.remove();
    }
    
    // Copy body content
    currentBody.innerHTML = newBody.innerHTML;
    
    // Copy body attributes
    Array.from(newBody.attributes).forEach(attr => {
      currentBody.setAttribute(attr.name, attr.value);
    });
    
    // Update page title
    document.title = newDoc.title;

    // Restore auth state
    Object.assign(window, preservedGlobals);
    
    console.log('[SmoothNav] Content replaced, auth state preserved');
  }

  /**
   * Initialize page-specific components after navigation
   */
  function initializePageComponents(pageName) {
    console.log('[SmoothNav] Initializing components for:', pageName);
    
    // Re-init footer (updates active tab)
    if (window.HiFooter?.init) {
      window.HiFooter.init();
    }
    
    // Page-specific initializations
    if (pageName === 'hi-island-NEW.html') {
      // Re-init map if needed
      if (window.UnifiedHiIslandController?.init) {
        window.UnifiedHiIslandController.init();
      }
    } else if (pageName === 'hi-dashboard.html') {
      // Re-init dashboard stats
      if (window.HiDashboard?.refresh) {
        window.HiDashboard.refresh();
      }
    }
    
    // Dispatch custom event for other listeners
    window.dispatchEvent(new CustomEvent('smooth-navigation-complete', {
      detail: { page: pageName }
    }));
  }

  /**
   * Handle browser back/forward buttons
   */
  window.addEventListener('popstate', (e) => {
    if (e.state?.page) {
      smoothNavigate(e.state.page, false);
    }
  });

  // Export to global
  window.SmoothNavigate = {
    navigate: smoothNavigate,
    isSupported: (url) => {
      const page = url.split('/').pop().split('?')[0];
      return SUPPORTED_PAGES.includes(page);
    }
  };

  console.log('[SmoothNav] Module initialized');
})();
