// public/assets/header.js
(function () {
  // Tesla-Grade Navigation Helper
  function getCurrentPageName() {
    const path = window.location.pathname;
    const fileName = path.split('/').pop() || 'index.html';
    
    // Normalize common variations
    if (fileName === '' || fileName === '/') return 'index.html';
    if (fileName === 'hi-island.html') return 'hi-island-NEW.html'; // Always use NEW version
    
    return fileName;
  }

  // Ensure immediate rendering by checking DOM state
  function initHeader() {
    const mount = document.getElementById("app-header");
    if (!mount) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initHeader);
        return;
      }
      console.warn('Header mount point not found');
      return;
    }
    
    // Clear any placeholder content
    mount.innerHTML = '';

  mount.innerHTML = `
    <div class="appbar">
      <button id="btnCal" class="icon-btn premium-hover focus-premium" aria-label="Open calendar">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="3" ry="3"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
          <circle cx="8" cy="16" r="1.5" fill="currentColor"></circle>
          <circle cx="16" cy="16" r="1.5" fill="currentColor"></circle>
        </svg>
      </button>
      <a class="brand" href="index.html" aria-label="Stay Hi home">
        <img class="logo" src="assets/brand/hi-logo-light.png" alt="" />
        <span class="brand-name">Stay Hi</span>
      </a>
      <div class="menu">
        <button id="btnMore" class="icon-btn premium-hover focus-premium" aria-label="Open menu" aria-haspopup="menu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="1"></circle>
            <circle cx="19" cy="12" r="1"></circle>
            <circle cx="5" cy="12" r="1"></circle>
          </svg>
        </button>
        <div id="menuSheet" class="menu-sheet" role="menu" aria-hidden="true" style="display: none;">
          <a href="index.html" role="menuitem">🏠 Hi Today</a>
          <a href="hi-muscle.html" role="menuitem">💪 Hi Gym</a>
          <a href="hi-island-NEW.html" role="menuitem">🏝️ Hi Island</a>
          <a href="profile.html?from=${getCurrentPageName()}" role="menuitem">👤 Profile</a>
          <div id="adminMenuSection" style="display: block;">
            <div class="sep"></div>
            <button id="openMissionControl" class="menu-item-btn" role="menuitem" style="color: #FFD166; font-weight: 700; background:transparent;border:none;cursor:pointer">🏛️ Mission Control</button>
          </div>
          <div class="sep"></div>
          <button id="btnSignOut" class="menu-item-btn" role="menuitem">🚪 Sign Out</button>
        </div>
      </div>
      <div id="adminVerifiedBanner" class="admin-verified-banner" aria-live="polite" role="status" style="display:none;white-space:nowrap;position:absolute;right:8px;top:8px;background:#059669;border:1px solid #10b981;color:#0f172a;padding:4px 10px;font-size:11px;font-weight:600;border-radius:14px;box-shadow:0 4px 12px rgba(0,0,0,.25);letter-spacing:.5px">✅ Admin verified</div>
    </div>
  `;

  // Inject lightweight CSS only once (optional future theming)
  if (!document.getElementById('adminVerifiedBannerStyles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'adminVerifiedBannerStyles';
    styleEl.textContent = `.admin-verified-banner[data-role="super_admin"]{background:#fbbf24;border-color:#f59e0b;color:#0f172a}
    body[data-admin-mode="true"] .admin-verified-banner{animation:adminBadgePulse 4s ease-in-out infinite}
    @keyframes adminBadgePulse{0%,100%{filter:brightness(1)}50%{filter:brightness(1.15)}}`;
    document.head.appendChild(styleEl);
  }

  // Show banner when admin confirmed (roleType sourced from AdminAccessManager)
  function showVerifiedBanner(){
    const banner = document.getElementById('adminVerifiedBanner');
    if (!banner) return;
    if (banner.dataset.shown === 'true') return; // idempotent
    const state = window.AdminAccessManager?.getState?.() || {};
    if (!state.isAdmin) return; // only show for admins
    banner.style.display='block';
    banner.dataset.shown='true';
    document.body.dataset.adminMode='true';
    if (state.roleType){
      banner.textContent = state.roleType === 'super_admin' ? '👑 Super Admin verified' : '✅ Admin verified';
      banner.dataset.role = state.roleType;
    }
  }

  // Update banner text when roleType becomes known after initial admin confirmation
  function updateBannerRole(){
    const banner = document.getElementById('adminVerifiedBanner');
    if (!banner || banner.dataset.role) return;
    const state = window.AdminAccessManager?.getState?.() || {};
    if (!state.isAdmin || !state.roleType) return;
    banner.textContent = state.roleType === 'super_admin' ? '👑 Super Admin verified' : '✅ Admin verified';
    banner.dataset.role = state.roleType;
  }

  window.addEventListener('hi:admin-confirmed', showVerifiedBanner);
  window.addEventListener('hi:admin-role-known', updateBannerRole);
  // In case admin already cached before header loads
  try { if (window.AdminAccessManager?.getState?.().isAdmin) { showVerifiedBanner(); updateBannerRole(); } } catch {}

  // === Resilient Mission Control link injection ===
  function ensureMissionControlLink(){
    const sheet = document.getElementById('menuSheet');
    if (!sheet) return;
    let btn = document.getElementById('openMissionControl');
    if (btn && btn.__mcBound) return; // already bound & present
    if (!btn){
      // Create section wrapper if missing
      let section = document.getElementById('adminMenuSection');
      if (!section){
        section = document.createElement('div');
        section.id='adminMenuSection';
        sheet.appendChild(section);
      }
      const sep = document.createElement('div'); sep.className='sep';
      btn = document.createElement('button');
      btn.id='openMissionControl';
      btn.className='menu-item-btn';
      btn.setAttribute('role','menuitem');
      btn.style.cssText='color:#FFD166;font-weight:700;background:transparent;border:none;cursor:pointer;display:block;width:100%;text-align:left;padding:10px 14px;font-size:14px;letter-spacing:.3px';
      btn.textContent='🏛️ Mission Control';
      // Insert near top of admin section
      section.appendChild(sep);
      section.appendChild(btn);
    }
    // Mark bound for later checks
    btn.__mcBound = true;
  }
  // Initial attempt
  ensureMissionControlLink();
  // Retry a few times for late DOM mutations (mobile slow loads)
  let mcRetries=0; const mcInterval=setInterval(()=>{ mcRetries++; ensureMissionControlLink(); if (mcRetries>5) clearInterval(mcInterval); }, 300);
  // Re-inject on admin state changes (in case header rebuilt or removed)
  window.addEventListener('hi:admin-state-changed', ensureMissionControlLink);
  // Re-inject when menu opened (visibility edge cases on mobile)
  document.getElementById('btnMore')?.addEventListener('click', ensureMissionControlLink);

  // ======= RESTORED: Header scroll behavior with performance optimization =======
  let lastScrollY = window.scrollY;
  let ticking = false;
  
  const handleScroll = () => {
    const currentScrollY = window.scrollY;
    const header = mount.querySelector('.appbar');
    
    if (!header) return;
    
    if (currentScrollY > lastScrollY && currentScrollY > 50) {
      // Scrolling down & past threshold - hide header
      header.style.transform = 'translateY(-100%)';
    } else {
      // Scrolling up or at top - show header
      header.style.transform = 'translateY(0)';
    }
    
    lastScrollY = currentScrollY;
    ticking = false;
  };
  
  const onScroll = () => {
    if (!ticking) {
      requestAnimationFrame(handleScroll);
      ticking = true;
    }
  };
  
  // Add scroll listener with passive flag for performance
  window.addEventListener('scroll', onScroll, { passive: true });

  // Calendar button - handle both immediate and delayed availability
  const btnCal = document.getElementById("btnCal");
  if (btnCal) {
    btnCal.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Try multiple calendar interfaces (compatibility layer)
      const openCalendar = () => {
        // Try window.openHiCalendar (module components)
        if (window.openHiCalendar && typeof window.openHiCalendar === 'function') {
          window.openHiCalendar();
          return true;
        }
        
        // Try window.PremiumCalendar (legacy)
        if (window.PremiumCalendar && typeof window.PremiumCalendar.show === 'function') {
          window.PremiumCalendar.show();
          return true;
        }
        
        // Try event dispatch fallback
        window.dispatchEvent(new CustomEvent("open-calendar"));
        return false;
      };
      
      // Try immediately
      if (openCalendar()) {
        if (window.PremiumUX?.triggerHapticFeedback) {
          window.PremiumUX.triggerHapticFeedback('light');
        }
        return;
      }
      
      // If not available, wait for modules to load
      setTimeout(() => {
        if (openCalendar()) {
          if (window.PremiumUX?.triggerHapticFeedback) {
            window.PremiumUX.triggerHapticFeedback('light');
          }
        } else {
          console.warn('⚠️ Calendar component not available');
        }
      }, 100);
    });
  }

  const sheet = document.getElementById("menuSheet");
  const btnMore = document.getElementById("btnMore");
  const btnSignOut = document.getElementById("btnSignOut");
  
  // Menu button - ensure elements exist
  if (btnMore && sheet) {
    btnMore.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = sheet.classList.contains("open");
      
      if (isOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    });
  } else {
    console.warn('⚠️ Menu elements not found:', { btnMore: !!btnMore, sheet: !!sheet });
  }

  function openMenu() {
    if (!sheet || !btnMore) return;
    sheet.classList.add("open");
    sheet.setAttribute("aria-hidden", "false");
    btnMore.setAttribute("aria-expanded", "true");
    
    // Add premium animation effect
    if (window.PremiumUX?.triggerHapticFeedback) {
      window.PremiumUX.triggerHapticFeedback('light');
    }
  }

  function closeMenu() {
    if (!sheet || !btnMore) return;
    sheet.classList.remove("open");
    sheet.setAttribute("aria-hidden", "true");
    btnMore.setAttribute("aria-expanded", "false");
  }

  // Close menu when clicking outside
  document.addEventListener("click", (e) => {
    if (!sheet.contains(e.target) && e.target !== btnMore) {
      closeMenu();
    }
  });

  // Calendar functionality streamlined - only top icon button now

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sheet.classList.contains('open')) {
      closeMenu();
    }
  });

  // 🏛️ Mission Control access: guarded navigation
  (function setupMissionControlAccess(){
    const btn = document.getElementById('openMissionControl');
    if (!btn) return;
    // Create a lightweight modal for access help
    const modal = document.createElement('div');
    modal.id = 'adminAccessModal';
    modal.style.cssText = 'position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,0.5);z-index:10000;';
    modal.innerHTML = `
      <div role="dialog" aria-modal="true" aria-labelledby="adminAccessTitle" aria-describedby="adminAccessDesc" tabindex="-1" style="max-width:420px;width:92%;background:#0f1228;border:1px solid rgba(255,255,255,0.15);border-radius:16px;padding:20px;color:#fff;box-shadow:0 10px 30px rgba(0,0,0,0.4)">
        <h3 id="adminAccessTitle" style="margin:0 0 8px;font-size:18px">Admin Access Required</h3>
        <p id="adminAccessDesc" style="margin:0 0 12px;color:#cfd2ea">Mission Control is for admins. Enter the admin passcode to unlock secure access. If you already have access, tap Recheck.</p>
        <div style="display:flex;gap:8px;align-items:center;margin:6px 0 6px">
          <input id="adminPasscodeInline" placeholder="Admin passcode" inputmode="numeric" autocomplete="one-time-code" style="flex:1;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);border-radius:10px;padding:10px;color:#fff" />
          <button id="unlockAdminInline" class="menu-item-btn" style="background:#7AE582;color:#0f1228;border:none;border-radius:10px;padding:10px 12px;font-weight:700;cursor:pointer">Unlock</button>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">
          <button id="adminAccessCancel" class="menu-item-btn" aria-label="Close admin access dialog" style="background:transparent;border:1px solid rgba(255,255,255,0.2);color:#cfd2ea;border-radius:10px;padding:8px 12px;cursor:pointer">Close</button>
          <button id="recheckAdminAccess" class="menu-item-btn" style="background:#00d4ff;color:#0f172a;border:none;border-radius:10px;padding:8px 12px;font-weight:700;cursor:pointer">Recheck Access</button>
        </div>
        <div id="adminAccessMsg" style="margin-top:8px;color:#a7b0ff;font-size:12px;min-height:16px"></div>
      </div>`;
    document.body.appendChild(modal);

    let previouslyFocused = null;
    let keydownHandler = null;
    function getFocusable(container){
      const selectors = ['a[href]','area[href]','input:not([disabled])','select:not([disabled])','textarea:not([disabled])','button:not([disabled])','[tabindex]:not([tabindex="-1"])'];
      return Array.from(container.querySelectorAll(selectors.join(','))).filter(el => el.offsetParent !== null);
    }
    function openModal(){
      previouslyFocused = document.activeElement;
      modal.style.display='flex';
      try { document.body.style.overflow='hidden'; } catch {}
      const dialogEl = modal.querySelector('[role="dialog"]');
      const focusables = getFocusable(dialogEl);
      (focusables[0] || dialogEl).focus();
      keydownHandler = (e)=>{
        if (e.key === 'Escape') { e.preventDefault(); closeModal(); return; }
        if (e.key === 'Tab'){
          const f = getFocusable(dialogEl); if (!f.length) return;
          const first = f[0], last = f[f.length-1];
          if (e.shiftKey){ if (document.activeElement === first || !dialogEl.contains(document.activeElement)){ e.preventDefault(); last.focus(); } }
          else { if (document.activeElement === last || !dialogEl.contains(document.activeElement)){ e.preventDefault(); first.focus(); } }
        }
      };
      dialogEl.addEventListener('keydown', keydownHandler);
      // Click outside closes (attach once)
      if (!modal.__outsideClickAttached) {
        modal.addEventListener('click', (ev)=>{ if (ev.target === modal) closeModal(); });
        modal.__outsideClickAttached = true;
      }
    }
    function closeModal(){
      modal.style.display='none';
      try { document.body.style.overflow=''; } catch {}
      const dialogEl = modal.querySelector('[role="dialog"]');
      if (keydownHandler) dialogEl.removeEventListener('keydown', keydownHandler);
      if (previouslyFocused && typeof previouslyFocused.focus === 'function'){
        setTimeout(()=>{ try { previouslyFocused.focus(); } catch {} }, 0);
      }
    }

    btn.addEventListener('click', async (e)=>{
      e.preventDefault();
      // Unified access gate check (non-blocking for authenticated/admin users)
      try {
        const gate = window.AccessGate?.request?.('admin_mission_control');
        if (gate && gate.allow === false) {
          // AccessGateModal will appear via event listener; abort further admin logic
          return;
        }
      } catch(_){}
      // Prefer AdminAccessManager when available
      try{
        if (window.AdminAccessManager){
          const st = await window.AdminAccessManager.checkAdmin({ force:true });
          if (st?.isAdmin){ window.location.href = (window.hiPaths?.resolve ? window.hiPaths.resolve('hi-mission-control.html') : 'hi-mission-control.html'); return; }
        }
      }catch{}
      // Fallback: try direct DB role probe (non-blocking)
      try {
        const { supabase } = await import('../lib/HiSupabase.v3.js');
        const { data: { user } } = await supabase.auth.getUser();
        if (user){
          const { data: adminRow } = await supabase.from('admin_roles').select('role_type,is_active').eq('user_id', user.id).eq('is_active', true).maybeSingle();
          if (adminRow && (adminRow.role_type==='super_admin' || adminRow.role_type==='admin')){ window.location.href=(window.hiPaths?.resolve ? window.hiPaths.resolve('hi-mission-control.html') : 'hi-mission-control.html'); return; }
        }
      } catch {}
      // If not admin, show help modal
      openModal();
    });

    modal.querySelector('#adminAccessCancel').addEventListener('click', closeModal);
    modal.querySelector('#recheckAdminAccess').addEventListener('click', async ()=>{
      const msg = modal.querySelector('#adminAccessMsg');
      msg.textContent = 'Rechecking…';
      try{
        const st = await window.AdminAccessManager?.checkAdmin({ force:true });
        if (st?.isAdmin){ window.location.href=(window.hiPaths?.resolve ? window.hiPaths.resolve('hi-mission-control.html') : 'hi-mission-control.html'); return; }
        msg.textContent = 'No admin access on this account.';
      } catch(e){ msg.textContent = 'Could not verify admin access.'; }
    });
    // Invite redemption removed (passcode-only policy)

    // Admin passcode unlock flow
    modal.querySelector('#unlockAdminInline').addEventListener('click', async ()=>{
      const passcode = (modal.querySelector('#adminPasscodeInline').value||'').trim();
      const msg = modal.querySelector('#adminAccessMsg');
      if (!passcode){ msg.textContent = 'Enter the admin passcode.'; return; }
      msg.textContent = 'Verifying passcode…';
      try {
        const { supabase } = await import('../lib/HiSupabase.v3.js');
        const { data, error } = await supabase.rpc('admin_unlock_with_passcode', { p_passcode: passcode });
        if (error){ msg.textContent = error.message || 'Passcode verification failed.'; return; }
        if (data?.success){
          msg.textContent = 'Access granted. Preparing Mission Control…';
          // Recheck admin via unified manager to sync cache/events
          const st = await window.AdminAccessManager?.checkAdmin({ force:true });
          if (st?.isAdmin){ window.location.href=(window.hiPaths?.resolve ? window.hiPaths.resolve('hi-mission-control.html') : 'hi-mission-control.html'); return; }
          // Fallback direct nav if manager not present
          window.location.href=(window.hiPaths?.resolve ? window.hiPaths.resolve('hi-mission-control.html') : 'hi-mission-control.html');
        } else {
          msg.textContent = data?.message || 'Invalid passcode.';
        }
      } catch(e){ msg.textContent = e.message || 'Error unlocking admin access.'; }
    });
  })();

  // Visual indicator when admin confirmed
  try {
    const notifyAdmin = () => {
      document.body.dataset.adminMode = 'true';
      try {
        const badgeId = 'hi-admin-badge';
        if (!document.getElementById(badgeId)) {
          const badge = document.createElement('div');
          badge.id = badgeId;
          badge.setAttribute('role','status');
          badge.setAttribute('aria-live','polite');
          badge.style.cssText = 'position:fixed;bottom:12px;right:12px;padding:6px 10px;border-radius:10px;background:#10b981;color:#0b1323;font-weight:700;font-size:12px;z-index:9999;box-shadow:0 6px 20px rgba(0,0,0,.25)';
          badge.textContent = 'ADMIN MODE';
          document.body.appendChild(badge);
          setTimeout(()=>{ try { badge.remove(); } catch {} }, 3500);
        }
      } catch {}
    };
    window.addEventListener('hi:admin-confirmed', notifyAdmin);
    // If already admin (cached), mark dataset for CSS hooks
    try { if (window.AdminAccessManager?.getState?.().isAdmin) { document.body.dataset.adminMode='true'; } } catch {}
  } catch {}

  // Sign out functionality
  btnSignOut?.addEventListener("click", async () => {
    try {
      // Wait for Supabase client
      const getClient = async () => {
        if (window.sb) return window.sb;
        if (window.sbReady) return await window.sbReady;
        if (window.supabaseClient) return window.supabaseClient;
        throw new Error('Supabase client not available');
      };
      
      const sb = await getClient();
      await sb.auth.signOut();
      
      // Clear any cached data
      localStorage.clear();
      
      // Redirect to signin
      window.location.href = (window.hiPaths?.resolve ? window.hiPaths.resolve('signin.html') : '/signin.html');
    } catch (error) {
      console.error('Sign out error:', error);
      // Fallback: just clear storage and redirect
      localStorage.clear();
      window.location.href = (window.hiPaths?.resolve ? window.hiPaths.resolve('signin.html') : '/signin.html');
    }
  });
  }

  // Initialize immediately or wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeader);
  } else {
    initHeader();
  }
})();

