// 🚀 PWA Registration & Update Manager
(function() {
  'use strict';
  
  // Register service worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('✅ Service Worker registered:', registration.scope);
        
        // Handle updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              showUpdateNotification(registration);
            }
          });
        });
        
      } catch (error) {
        console.log('❌ Service Worker registration failed:', error);
      }
    });
  }
  
  // Show update notification with Tesla-grade UX
  function showUpdateNotification(registration) {
    if (window.PremiumUX) {
      window.PremiumUX.showNotice(`
        <div style="text-align: center; padding: 20px;">
          <h3 style="color: #FFD166; margin-bottom: 12px;">🚀 App Update Available</h3>
          <p style="margin-bottom: 16px;">A new version of Hi Collective is ready!</p>
          <button onclick="updateApp()" style="
            background: linear-gradient(135deg, #FFD166, #FF7B24);
            border: none; color: #111; padding: 12px 24px; border-radius: 8px;
            font-size: 16px; cursor: pointer; font-weight: bold; margin-right: 8px;
          ">✨ Update Now</button>
          <button onclick="dismissUpdate()" style="
            background: transparent; border: 1px solid #666; color: #666;
            padding: 12px 24px; border-radius: 8px; font-size: 16px; cursor: pointer;
          ">Later</button>
        </div>
      `, { duration: 0, persistent: true });
    }
    
    // Make functions available globally for button clicks
    window.updateApp = () => {
      registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    };
    
    window.dismissUpdate = () => {
      if (window.PremiumUX) {
        window.PremiumUX.hideNotice();
      }
    };
  }
  
  // Install prompt handling
  let deferredPrompt;
  
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallButton();
  });
  
  function showInstallButton() {
    // Create install button if it doesn't exist
    if (document.getElementById('installApp')) return;
    
    const installBtn = document.createElement('button');
    installBtn.id = 'installApp';
    installBtn.innerHTML = '📱 Install App';
    installBtn.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 12px 20px;
      border-radius: 25px;
      font-size: 14px;
      font-weight: bold;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3);
      z-index: 1000;
      animation: installPulse 2s infinite;
    `;
    
    // Add pulse animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes installPulse {
        0%, 100% { transform: scale(1); box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3); }
        50% { transform: scale(1.05); box-shadow: 0 6px 25px rgba(102, 126, 234, 0.5); }
      }
    `;
    document.head.appendChild(style);
    
    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('✅ PWA installed');
        if (window.PremiumUX) {
          window.PremiumUX.celebrate(installBtn, '🎉 Installed!');
        }
      }
      
      deferredPrompt = null;
      installBtn.remove();
    });
    
    document.body.appendChild(installBtn);
  }
  
  // Handle app installed event
  window.addEventListener('appinstalled', () => {
    console.log('✅ Hi Collective PWA installed');
    
    if (window.PremiumUX) {
      window.PremiumUX.showNotice(`
        <div style="text-align: center; padding: 20px;">
          <h3 style="color: #10b981; margin-bottom: 12px;">🎉 Hi Collective Installed!</h3>
          <p>Welcome to the Hi revolution on your device!</p>
        </div>
      `, { duration: 3000 });
    }
    
    // Remove install button if it exists
    const installBtn = document.getElementById('installApp');
    if (installBtn) {
      installBtn.remove();
    }
  });
  
  // Detect if running as PWA
  function isPWA() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true;
  }
  
  // Add PWA-specific styling
  if (isPWA()) {
    document.documentElement.classList.add('pwa-mode');
    
    // Add PWA-specific styles
    const pwaStyle = document.createElement('style');
    pwaStyle.textContent = `
      .pwa-mode {
        --header-padding-top: env(safe-area-inset-top);
        --footer-padding-bottom: env(safe-area-inset-bottom);
      }
      
      .pwa-mode .admin-header,
      .pwa-mode .header {
        padding-top: calc(1rem + var(--header-padding-top));
      }
      
      .pwa-mode .footer,
      .pwa-mode .fixed-bottom {
        padding-bottom: calc(1rem + var(--footer-padding-bottom));
      }
    `;
    document.head.appendChild(pwaStyle);
  }
  
})();