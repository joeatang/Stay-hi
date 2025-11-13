// ui/HiFooter/HiFooter.js
// Tesla-Grade Hi Footer Navigation Component
(function() {
  'use strict';

  // Hi Footer navigation configuration
  const hiFooterTabs = [
    { id: 'today', label: 'Hi Today', icon: '⭘', href: 'hi-dashboard.html', pages: ['hi-dashboard.html', 'index.html', ''] },
    { id: 'explore', label: 'Hi-island', icon: '🧭', href: 'hi-island-NEW.html', pages: ['hi-island-NEW.html'] },
    { id: 'plus', label: 'Hi Gym', icon: '✨', href: 'hi-muscle.html', pages: ['hi-muscle.html', 'calendar.html'] },
    { id: 'me', label: 'Me', href: 'profile.html', icon: '👤', pages: ['profile.html'] }
  ];

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
             aria-selected="${tab.id === activeTab}"
             aria-label="${tab.label}">
            <span class="hi-footer-icon">${tab.icon}</span>
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
  }

  // Global HiFooter interface
  window.HiFooter = {
    init: initHiFooter,
    createFooter: createHiFooter,
    getCurrentPage: getCurrentPage
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