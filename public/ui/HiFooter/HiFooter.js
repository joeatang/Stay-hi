// ui/HiFooter/HiFooter.js
// Tesla-Grade Hi Footer Navigation Component
(function() {
  'use strict';

  // Hi Footer navigation configuration
  const hiFooterTabsBase = [
    { id: 'today', label: 'Hi Today', icon: '⭘', href: 'hi-dashboard.html', pages: ['hi-dashboard.html', 'index.html', ''] },
    { id: 'explore', label: 'Hi-island', icon: '🧭', href: 'hi-island-NEW.html', pages: ['hi-island-NEW.html'] },
    { id: 'plus', label: 'Hi Gym', icon: '✨', href: 'hi-muscle.html', pages: ['hi-muscle.html', 'calendar.html'] },
    { id: 'me', label: 'Me', href: 'profile.html', icon: '👤', pages: ['profile.html'] }
  ];
  // Admin tab appended dynamically (always available as gate – Woz style deterministic access)
  let hiFooterTabs = hiFooterTabsBase.slice();

  function getCurrentPage() {
    const path = window.location.pathname;
    const page = path.split('/').pop() || 'index.html';
    return page;
  }

  function getActiveTab() {
    const currentPage = getCurrentPage();
    return hiFooterTabs.find(tab => 
      tab.pages.includes(currentPage) || 
      (currentPage === '' && tab.id === 'today')
    )?.id || 'today';
  }

  function createHiFooter() {
    const activeTab = getActiveTab();
    
    const footer = document.createElement('footer');
    footer.className = 'hi-footer';
    footer.innerHTML = `
      <nav class="hi-footer-nav" role="tablist" aria-label="Main navigation">
        ${hiFooterTabs.map(tab => `
          <a href="${tab.href}" 
             class="hi-footer-tab ${tab.id === activeTab ? 'active' : ''}" 
             role="tab" 
             aria-selected="${tab.id === activeTab}">
            <span class="hi-footer-icon" aria-hidden="true">${tab.icon}</span>
            <span class="hi-footer-label">${tab.label}</span>
          </a>
        `).join('')}
      </nav>
    `;

    return footer;
  }

  function initHiFooter() {
    // Remove any existing footer
    const existingFooter = document.querySelector('.hi-footer, .premium-footer');
    if (existingFooter) {
      existingFooter.remove();
    }

    // Create and append new Hi Footer
    const footer = createHiFooter();
    document.body.appendChild(footer);

    // Add haptic feedback + smooth navigation
    footer.addEventListener('click', (e) => {
      const tab = e.target.closest('.hi-footer-tab');
      if (tab) {
        // Haptic feedback
        if (window.PremiumUX?.triggerHapticFeedback) {
          window.PremiumUX.triggerHapticFeedback('light');
        }
        
        // Smooth navigation (if supported)
        const targetURL = tab.getAttribute('href');
        if (window.SmoothNavigate?.isSupported(targetURL)) {
          e.preventDefault();
          window.SmoothNavigate.navigate(targetURL);
        }
        // Otherwise let browser handle normal navigation
      }
    });

    console.debug('[HiFooter] Initialized successfully');
    attachAdminGateIfNeeded();
  }

  function attachAdminGateIfNeeded(){
    try {
      const adminAnchor = document.querySelector('.hi-footer-tab[href="hi-mission-control.html"]');
      if (!adminAnchor) return;
      if (adminAnchor.__hiGateAttached) return; adminAnchor.__hiGateAttached = true;
      adminAnchor.addEventListener('click', async (e)=>{
        try {
          if (window.AdminAccessManager){
            const st = await window.AdminAccessManager.checkAdmin({ force:true });
            if (st?.isAdmin) return; // allow normal nav
          }
        } catch {}
        e.preventDefault();
        // Use global quick access if present
        if (window.HiMissionControlQuick){ window.HiMissionControlQuick.open(); return; }
        // Fallback: go to page (which will deny if not admin)
        window.location.href = 'hi-mission-control.html';
      });
    } catch {}
  }

  // Dynamic admin tab append after admin confirmation OR always as gate if feature flag set
  // Admin tab intentionally disabled (policy: header-only admin access)
  function appendAdminTab(){ /* disabled */ }

  // Listen for admin events to reflect active state
  // Removed auto-append events; admin access handled exclusively by header menu modal.

  // Global HiFooter interface
  window.HiFooter = {
    init: initHiFooter,
    refresh: initHiFooter, // Alias for smooth nav re-init
    createFooter: createHiFooter,
    getCurrentPage: getCurrentPage,
    appendAdminTab
  };

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHiFooter);
  } else {
    // Small delay to ensure DOM is fully ready
    setTimeout(initHiFooter, 100);
  }
  
  console.log('[HiFooter] Component loaded');
})();