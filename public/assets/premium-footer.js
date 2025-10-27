// Premium Footer Navigation Component
(function() {
  'use strict';

  // Footer navigation configuration
  const footerTabs = [
    { id: 'today', label: 'Hi Today', icon: '⭘', href: 'index.html', pages: ['index.html', ''] },
    { id: 'explore', label: 'Hi-island', icon: '🧭', href: 'hi-island.html', pages: ['hi-island.html'] },
    { id: 'me', label: 'Me', href: 'profile.html', icon: '👤', pages: ['profile.html'] },
    { id: 'plus', label: 'Hi Gym', icon: '✨', href: 'hi-muscle.html', pages: ['hi-muscle.html', 'calendar.html'] }
  ];

  function getCurrentPage() {
    const path = window.location.pathname;
    const page = path.split('/').pop() || 'index.html';
    return page;
  }

  function getActiveTab() {
    const currentPage = getCurrentPage();
    return footerTabs.find(tab => 
      tab.pages.includes(currentPage) || 
      (currentPage === '' && tab.id === 'today')
    )?.id || 'today';
  }

  function createFooter() {
    const activeTab = getActiveTab();
    
    const footer = document.createElement('footer');
    footer.className = 'premium-footer';
    footer.innerHTML = `
      <nav class="footer-nav" role="tablist" aria-label="Main navigation">
        ${footerTabs.map(tab => `
          <a href="${tab.href}" 
             class="footer-tab ${tab.id === activeTab ? 'active' : ''}" 
             role="tab" 
             aria-selected="${tab.id === activeTab}"
             aria-label="${tab.label}">
            <span class="footer-icon">${tab.icon}</span>
            <span class="footer-label">${tab.label}</span>
          </a>
        `).join('')}
      </nav>
    `;

    return footer;
  }

  function initFooter() {
    // Remove any existing footer
    const existingFooter = document.querySelector('.premium-footer');
    if (existingFooter) {
      existingFooter.remove();
    }

    // Create and append new footer
    const footer = createFooter();
    document.body.appendChild(footer);

    // Add haptic feedback on tab press (if available)
    footer.addEventListener('click', (e) => {
      if (e.target.closest('.footer-tab')) {
        if (window.PremiumUX?.triggerHapticFeedback) {
          window.PremiumUX.triggerHapticFeedback('light');
        }
      }
    });

    console.debug('[premium-footer.js] Footer initialized');
  }

  // Initialize footer when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFooter);
  } else {
    // Small delay to ensure DOM is fully ready
    setTimeout(initFooter, 100);
  }

  // Export for manual initialization if needed
  window.PremiumFooter = { init: initFooter };
  
  console.log('[premium-footer.js] Footer script loaded');
})();