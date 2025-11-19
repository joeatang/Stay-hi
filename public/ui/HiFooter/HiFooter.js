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

    // Add haptic feedback on tab press (if available)
    footer.addEventListener('click', (e) => {
      if (e.target.closest('.hi-footer-tab')) {
        if (window.PremiumUX?.triggerHapticFeedback) {
          window.PremiumUX.triggerHapticFeedback('light');
        }
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
  function appendAdminTab(forceGate=true){
    if (hiFooterTabs.some(t=> t.id==='admin')) return;
    hiFooterTabs.push({ id:'admin', label:'Admin', icon:'🛡️', href:'hi-mission-control.html', pages:['hi-mission-control.html'] });
    initHiFooter();
  }

  // Listen for admin events to reflect active state
  window.addEventListener('hi:admin-confirmed', ()=> appendAdminTab(false));
  window.addEventListener('hi:admin-state-changed', (e)=>{ if (e?.detail?.isAdmin) appendAdminTab(false); });
  // Always ensure gate exists (append even before confirmation for deterministic access)
  appendAdminTab(true);

  // Global HiFooter interface
  window.HiFooter = {
    init: initHiFooter,
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