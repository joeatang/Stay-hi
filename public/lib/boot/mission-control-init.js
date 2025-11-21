console.log('🎬 Mission Control script starting (Woz unified admin access)...');
// Lazy client getter to avoid capturing a null before upgrade
function getClient(){
  return (window.hiSupabase)
    || (window.HiSupabase?.getClient && window.HiSupabase.getClient())
    || window.supabaseClient
    || window.sb
    || null;
}
console.log('🔌 Supabase client available:', !!getClient());

// 🔐 SECURITY GLOBALS
let currentUser = null;
let adminSession = null;
let sessionTimeout = null;

// ⏱️ Utility: timeout wrapper to avoid hangs
function withTimeout(promise, ms, label = 'operation') {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms))
  ]);
}

// 🚀 INITIALIZATION
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 DOMContentLoaded fired. Initial admin state:', window.AdminAccessManager?.getState());
  // GOLD STANDARD: Wait for auth to fully settle before checking admin (prevents flickering)
  // Give session 2 full seconds to propagate from post-auth redirect
  await new Promise(resolve => setTimeout(resolve, 2000));
  initializeSecuritySystem();
});

// React when admin state flips after initial denial (e.g. passcode unlock)
// BUT: Only if initialization hasn't started yet (prevents duplicate checks)
window.addEventListener('hi:admin-state-changed', (e) => {
  try {
    if (initializationComplete) return; // Already initialized, ignore
    const st = e.detail;
    if (st?.isAdmin) {
      document.body.dataset.adminMode = 'true';
      const unauth = document.getElementById('unauthorizedScreen');
      const loading = document.getElementById('securityLoading');
      if (unauth && unauth.style.display === 'flex') {
        console.log('[MissionControl] Admin granted after denial – rebuilding secure session');
        unauth.style.display = 'none';
        if (loading) loading.style.display = 'flex';
        initializeSecuritySystem();
      } else {
        finalizeAdminUI();
      }
    } else {
      document.body.dataset.adminMode = 'false';
    }
  } catch {}
});

// GOLD STANDARD: Consolidated auth event handler (debounced)
// Prevents storm of checks from hi:auth-ready + hi:auth-updated firing simultaneously
let authEventDebounce = null;
function handleAuthEvent(eventName) {
  if (initializationComplete) {
    console.log(`[MissionControl] ${eventName} received but initialization complete, skipping`);
    return;
  }
  if (isInitializing) {
    console.log(`[MissionControl] ${eventName} received but already initializing, queuing`);
    pendingInitRequests.push(eventName);
    return;
  }
  
  // Debounce: Only run last event in 300ms window
  clearTimeout(authEventDebounce);
  authEventDebounce = setTimeout(async () => {
    console.log(`[MissionControl] ${eventName} triggered (debounced) -> validate admin`);
    if (window.AdminAccessManager && !initializationComplete) {
      const st = await window.AdminAccessManager.checkAdmin({ force: false }); // Use cache if available
      if (st.isAdmin && document.getElementById('securityLoading')?.style.display !== 'none') {
        finalizeAdminUI();
      }
    }
  }, 300);
}

window.addEventListener('hi:auth-ready', () => handleAuthEvent('hi:auth-ready'));
window.addEventListener('hi:auth-updated', () => handleAuthEvent('hi:auth-updated'));

async function initializeSecuritySystem() {
  // GOLD STANDARD: Guard against multiple simultaneous initializations
  if (isInitializing) {
    console.log('⏳ Already initializing, skipping duplicate call');
    return;
  }
  if (initializationComplete) {
    console.log('✅ Already initialized, skipping');
    return;
  }
  
  isInitializing = true;
  const statusEl = document.getElementById('securityStatus');
  const progressBar = document.getElementById('progressBar');
  try { const dash = document.getElementById('dashboardContainer'); dash?.setAttribute('aria-busy','true'); } catch {}

  console.log('🔐 initializeSecuritySystem started (SINGLE CHECK)');
  console.log('📍 Status element:', statusEl);
  console.log('📊 Progress bar:', progressBar);

  try {
    statusEl.textContent = 'Verifying admin privileges...';
    progressBar.style.width = '25%';
    try { progressBar.setAttribute('aria-valuenow','25'); } catch {}
    // Unified manager check (cached or fresh)
    let mgr = window.AdminAccessManager;
    if (!mgr){
      // Wait briefly for late-loading script before failing
      for (let i=0;i<10 && !mgr;i++){
        // 50ms x10 = 500ms grace
        // eslint-disable-next-line no-await-in-loop
        await new Promise(r=>setTimeout(r,50));
        mgr = window.AdminAccessManager;
      }
    }
    if (!mgr) throw new Error('Admin access system unavailable');
    const state = await mgr.checkAdmin({ force:true }); // force to avoid stale cached denial
    
    console.log('🔍 DIAGNOSTIC - Admin check result:', {
      isAdmin: state.isAdmin,
      status: state.status,
      reason: state.reason,
      user: state.user?.email || state.user?.id || 'no user',
      roleType: state.roleType,
      lastChecked: state.lastChecked ? new Date(state.lastChecked).toISOString() : 'never'
    });
    
    if (!state.isAdmin) {
      const errorMsg = `Access check failed: ${state.reason || 'unknown'} | Status: ${state.status} | User: ${state.user?.email || 'none'}`;
      console.error('🚨 DIAGNOSTIC - Admin access denied:', errorMsg);
      throw new Error(errorMsg);
    }
    currentUser = state.user;
    statusEl.textContent = 'Establishing secure session...';
    progressBar.style.width = '55%';
    try { progressBar.setAttribute('aria-valuenow','55'); } catch {}
    const sb = getClient();
    if (!sb) throw new Error('Supabase unavailable');
    const clientIP = await getClientIP();
    const { data: sessionData, error: sessionError } = await sb.rpc('create_admin_session', { p_ip_address: clientIP, p_user_agent: navigator.userAgent });
    if (sessionError || !sessionData) throw new Error('Session creation failed');
    adminSession = sessionData;
    statusEl.textContent = 'Loading dashboard data...';
    progressBar.style.width = '75%';
    try { progressBar.setAttribute('aria-valuenow','75'); } catch {}
    await loadDashboardData();
    statusEl.textContent = 'Mission Control Ready';
    progressBar.style.width = '100%';
    try { progressBar.setAttribute('aria-valuenow','100'); } catch {}
    finalizeAdminUI();
    startSessionTimer(adminSession.expires_at);
    
    // GOLD STANDARD: Mark initialization complete
    initializationComplete = true;
    isInitializing = false;
    console.log('✅ Initialization complete, flickering storm prevented');
  } catch (error) {
    console.error('Security verification failed:', error);
    isInitializing = false; // Reset flag on error
    showUnauthorizedAccess(error.message);
    // NO AUTO-REDIRECT: Let user manually choose retry or sign-in to avoid cascade
    // Access denied screen provides "Sign in to Continue" and "Retry Verification" buttons
  }
}

function finalizeAdminUI(){
  const loading = document.getElementById('securityLoading');
  const dash = document.getElementById('dashboardContainer');
  if (loading) loading.style.display='none';
  if (dash) dash.style.display='block';
  try { dash?.setAttribute('aria-busy','false'); } catch {}
  try {
    const badge = document.querySelector('.security-badge');
    const auth = (window.getAuthState && window.getAuthState()) || null;
    const uid = auth?.session?.user?.id;
    const tier = auth?.membership?.tier;
    if (badge && (uid || tier)){
      const short = uid ? (uid.split('-')[0]) : 'user';
      badge.textContent = `🔒 Admin • ${short}${tier?` • ${tier.toUpperCase()}`:''}`;
    }
  } catch {}
}

function showUnauthorizedAccess(message) {
  const loading = document.getElementById('securityLoading');
  const screen = document.getElementById('unauthorizedScreen');
  if (loading) loading.style.display = 'none';
  if (screen) screen.style.display = 'flex';
  try { screen?.setAttribute('role','alert'); } catch {}
  try { if (!screen.getAttribute('tabindex')) screen.setAttribute('tabindex','-1'); screen.focus({ preventScroll:true }); } catch {}
  // Append retry guidance
  try {
    const content = screen.querySelector('.unauthorized-content');
    if (content && !content.querySelector('.admin-retry')){
      const retry = document.createElement('div');
      retry.className='admin-retry';
      retry.style.cssText='margin-top:24px;font-size:13px;opacity:.85;';
      retry.innerHTML = `<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;">
        <button id="retryAdminCheck" style="background:#334155;color:#fff;border:1px solid #556372;padding:8px 14px;border-radius:8px;font-weight:600;cursor:pointer;">Retry Verification</button>
        <button id="openSelfCheck" style="background:#0ea5e9;color:#0b1b1e;border:1px solid #38bdf8;padding:8px 14px;border-radius:8px;font-weight:700;cursor:pointer;">Run Self-Check</button>
      </div>
      <div style="margin-top:8px;opacity:.7;line-height:1.4">Reason: ${message || 'unknown'}<br/>If you believe this is an error: 1) Ensure you are signed in with an admin email. 2) Refresh the page. 3) Use dashboard first to establish session. 4) Contact support to audit access logs.</div>`;
      content.appendChild(retry);
      document.getElementById('retryAdminCheck').addEventListener('click', async ()=>{
        screen.style.display='none';
        if (loading) loading.style.display='flex';
        document.getElementById('securityStatus').textContent='Revalidating privileges...';
        document.getElementById('progressBar').style.width='15%';
        try { await window.AdminAccessManager.checkAdmin({ force:true }); const st = window.AdminAccessManager.getState(); if (st.isAdmin){ initializeSecuritySystem(); } else { showUnauthorizedAccess(st.reason); } } catch(e){ showUnauthorizedAccess(e.message); }
      });
      const openBtn = document.getElementById('openSelfCheck');
      if (openBtn){ openBtn.addEventListener('click', ()=>{ try{ window.HiAdminSelfCheck && window.HiAdminSelfCheck.open(); } catch{} }); }
      // If we detect stub client (no rpc) surface explicit guidance
      try {
        const sb = getClient();
        const isStub = sb && (!sb.rpc || !sb.auth || !sb.auth.getSession);
        if (isStub) {
          const hint = document.createElement('div');
          hint.style.cssText='margin-top:12px;font-size:12px;opacity:.65;';
          hint.textContent='Supabase client stub active – likely CDN blocked or not yet upgraded. Will auto-redirect to sign-in shortly.';
          content.appendChild(hint);
        }
      } catch {}
    }
  } catch {}
  console.error('🚨 SECURITY INCIDENT:', { timestamp: new Date().toISOString(), user_agent: navigator.userAgent, message, url: window.location.href });
}

// Attempt to rebuild a Supabase session from local storage
async function tryRestoreSessionFromStorage() {
  try {
    const sb = getClient();
    if (!sb) return false;
    const keys = Object.keys(localStorage);
    const sbKey = keys.find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    if (!sbKey) {
      console.log('🔎 No Supabase auth storage key found');
      return false;
    }
    const raw = localStorage.getItem(sbKey);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    const current = parsed?.currentSession || parsed?.session || parsed?.value || null;
    const access_token = current?.access_token;
    const refresh_token = current?.refresh_token || parsed?.currentSession?.refresh_token;
    if (!access_token || !refresh_token) {
      console.log('🔎 Found auth storage but missing tokens');
      return false;
    }
    const { data, error } = await withTimeout(
      sb.auth.setSession({ access_token, refresh_token }),
      5000,
      'supabase.auth.setSession'
    );
    console.log('🧩 setSession result:', data, error);
    return !error;
  } catch (e) {
    console.log('⚠️ Session restore failed:', e);
    return false;
  }
}

async function loadDashboardData() {
  try {
    const sb = getClient();
    if (!sb) throw new Error('Supabase unavailable');
    const { data: stats, error } = await sb.rpc('get_admin_dashboard_stats');
    if (error) throw error;

    displayStats(stats);
    // Load global platform stats via unified loader and append
    try {
      const { loadGlobalStats } = await import('../stats/UnifiedStatsLoader.js');
      const g = await loadGlobalStats();
      augmentGlobalStats(g);
    } catch(e){ console.warn('[MissionControl] Unified global stats optional:', e); }
    try { window.HiAudit?.log('dashboard_stats_loaded', { resource:'get_admin_dashboard_stats' }); } catch {}
  } catch (error) {
    console.error('Failed to load dashboard stats:', error);
    showError('Failed to load dashboard statistics');
    try { window.HiAudit?.log('dashboard_stats_failed', { resource:'get_admin_dashboard_stats' }, { success:false, failureReason: error.message }); } catch {}
  }
}

function displayStats(stats) {
  const statsGrid = document.getElementById('statsGrid');
  statsGrid.innerHTML = `
    <div class="stat-card">
      <div class="stat-number">${stats.total_users || 0}</div>
      <div class="stat-label">Total Users</div>
    </div>
    <div class="stat-card">
      <div class="stat-number">${stats.active_memberships || 0}</div>
      <div class="stat-label">Active Memberships</div>
    </div>
    <div class="stat-card">
      <div class="stat-number">${stats.total_invitations || 0}</div>
      <div class="stat-label">Total Invitations</div>
    </div>
    <div class="stat-card">
      <div class="stat-number">${stats.active_invitations || 0}</div>
      <div class="stat-label">Active Invitations</div>
    </div>
    <div class="stat-card">
      <div class="stat-number">${stats.recent_signups || 0}</div>
      <div class="stat-label">Recent Signups (7d)</div>
    </div>
    <div class="stat-card">
      <div class="stat-number">${stats.security_events || 0}</div>
      <div class="stat-label">Security Events (24h)</div>
    </div>
  `;
}

function augmentGlobalStats(g){
  const statsGrid = document.getElementById('statsGrid');
  if (!statsGrid) return;
  const waves = Number.isFinite(g.waves) ? Number(g.waves).toLocaleString() : '...';
  const totalHis = Number.isFinite(g.totalHis) ? Number(g.totalHis).toLocaleString() : '...';
  const users = Number.isFinite(g.totalUsers) ? Number(g.totalUsers).toLocaleString() : '...';
  const sourceBadge = g.overall || 'n/a';
  const block = document.createElement('div');
  block.className = 'stat-card stat-card-global';
  block.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:6px;">
      <div><div class="stat-number">${waves}</div><div class="stat-label">Global Waves</div></div>
      <div><div class="stat-number">${totalHis}</div><div class="stat-label">Total His</div></div>
      <div><div class="stat-number">${users}</div><div class="stat-label">Users (Unified)</div></div>
    </div>
    <div style="font-size:11px;opacity:.7">Unified Source: ${sourceBadge}</div>
  `;
  statsGrid.appendChild(block);
}

// Debug overlay support for mission control
try {
  const qp = new URLSearchParams(location.search);
  if (qp.get('debugstats') === '1' || window.__HI_STATS_DEBUG__ === true) {
    import('../stats/StatsDebugOverlay.js').catch(()=>{});
  }
} catch {}

// 🎫 INVITATION MANAGEMENT FUNCTIONS
// GOLD STANDARD: Use modal for user input instead of hardcoded values
async function generateInviteCode() {
  if (typeof window.openInviteCodeModal === 'function') {
    // Open modal UI for options
    window.openInviteCodeModal();
    
    // Listen for success event to refresh dashboard
    window.addEventListener('hi:invite-code-generated', async (e) => {
      const { code } = e.detail;
      console.log('✅ Code generated via modal:', code);
      showSuccess(`Code generated: ${code}`);
      await loadDashboardData();
    }, { once: true });
  } else {
    // Fallback: Direct generation with defaults
    try {
      const sb = getClient();
      if (!sb) throw new Error('Supabase client unavailable');
      
      console.log('🎫 Generating invitation code (fallback)...');
      const { data, error } = await sb.rpc('admin_generate_invite_code', {
        p_max_uses: 1,
        p_expires_in_hours: 168 // 7 days
      });
      
      if (error) throw error;
      if (!data?.success) throw new Error(data?.message || 'Generation failed');
      
      console.log('✅ Invite code generated:', data.code);
      showSuccess(`Code generated: ${data.code} (expires in 7 days)`);
      
      // Show code in results
      const expiry = new Date(data.expires_at).toLocaleString();
      showResults('New Invitation Code', 
        `Code: ${data.code}\n` +
        `Expires: ${expiry}\n` +
        `Max Uses: ${data.max_uses}\n` +
        `ID: ${data.id}`
      );
      
      // Refresh dashboard stats
      await loadDashboardData();
    } catch (error) {
      console.error('❌ Invite code generation failed:', error);
      showError(error.message || 'Failed to generate invitation code');
    }
  }
}

async function listInviteCodes() {
  try {
    const sb = getClient();
    if (!sb) throw new Error('Supabase client unavailable');
    
    console.log('📋 Listing invitation codes...');
    const { data, error } = await sb.rpc('admin_list_invite_codes', {
      p_include_expired: false
    });
    
    if (error) throw error;
    if (!data?.success) throw new Error(data?.message || 'List retrieval failed');
    
    const codes = data.codes || [];
    console.log('✅ Retrieved codes:', codes.length);
    
    if (codes.length === 0) {
      showResults('Invitation Codes', 'No active invitation codes found.');
      return;
    }
    
    const formatted = codes.map(c => 
      `Code: ${c.code}\n` +
      `Type: ${c.code_type}\n` +
      `Uses: ${c.current_uses}/${c.max_uses} (${c.uses_remaining} remaining)\n` +
      `Valid Until: ${new Date(c.valid_until).toLocaleString()}\n` +
      `Active: ${c.is_active ? 'Yes' : 'No'}\n` +
      `Created: ${new Date(c.created_at).toLocaleString()}\n` +
      `---`
    ).join('\n');
    
    showResults(`Invitation Codes (${codes.length} active)`, formatted);
  } catch (error) {
    console.error('❌ List codes failed:', error);
    showError(error.message || 'Failed to list invitation codes');
  }
}

async function getActiveInvites() {
  try {
    const sb = getClient();
    if (!sb) throw new Error('Supabase client unavailable');
    
    console.log('🔍 Fetching active invites...');
    const { data, error } = await sb.rpc('admin_list_invite_codes', {
      p_include_expired: false
    });
    
    if (error) throw error;
    if (!data?.success) throw new Error(data?.message || 'Retrieval failed');
    
    const codes = (data.codes || []).filter(c => c.is_active && c.uses_remaining > 0);
    console.log('✅ Active invites:', codes.length);
    
    if (codes.length === 0) {
      showResults('Active Invitations', 'No active invitations with remaining uses.');
      return;
    }
    
    const formatted = codes.map(c => 
      `${c.code} - ${c.uses_remaining} uses left (expires ${new Date(c.valid_until).toLocaleDateString()})`
    ).join('\n');
    
    showResults(`Active Invitations (${codes.length})`, formatted);
  } catch (error) {
    console.error('❌ Get active invites failed:', error);
    showError(error.message || 'Failed to get active invitations');
  }
}

// 🛠️ UTILITY FUNCTIONS
function showResults(title, content) {
  document.getElementById('resultsHeader').textContent = title;
  document.getElementById('resultsContent').textContent = content;
  document.getElementById('resultsContainer').style.display = 'block';

  // Scroll to results
  document.getElementById('resultsContainer').scrollIntoView({
    behavior: 'smooth'
  });
}

function showError(message) {
  const container = document.getElementById('dashboardContainer');
  const errorEl = document.createElement('div');
  errorEl.className = 'error-message';
  errorEl.textContent = '🚨 ' + message;
  container.insertBefore(errorEl, container.firstChild);

  setTimeout(() => errorEl.remove(), 5000);
}

function showSuccess(message) {
  const container = document.getElementById('dashboardContainer');
  const successEl = document.createElement('div');
  successEl.className = 'success-message';
  successEl.textContent = '✅ ' + message;
  container.insertBefore(successEl, container.firstChild);

  setTimeout(() => successEl.remove(), 3000);
}

function injectInviteCodeCard(){ /* disabled */ }

function renderInviteCards(){ /* disabled */ }

function startSessionTimer(expiresAt) {
  const expiryTime = new Date(expiresAt).getTime();
  const timerEl = document.getElementById('sessionTimer');
  let warned5 = false;
  let warned1 = false;
  let liveRegion = document.getElementById('sessionTimerLive');
  if (!liveRegion){
    liveRegion = document.createElement('div');
    liveRegion.id='sessionTimerLive';
    liveRegion.setAttribute('aria-live','polite');
    liveRegion.style.cssText='position:absolute;left:-999px;top:auto;width:1px;height:1px;overflow:hidden;';
    document.body.appendChild(liveRegion);
  }

  sessionTimeout = setInterval(() => {
    const now = Date.now();
    const timeLeft = Math.max(0, expiryTime - now);
    const minutesLeft = Math.floor(timeLeft / (1000 * 60));

    timerEl.textContent = minutesLeft;
    if (!warned5 && minutesLeft === 5){
      warned5 = true; liveRegion.textContent = 'Session will expire in 5 minutes.'; try { window.HiAudit?.log('session_expiry_warning_5', { resource:'admin_session' }); } catch {}
    }
    if (!warned1 && minutesLeft === 1){
      warned1 = true; liveRegion.textContent = 'Session will expire in 1 minute.'; try { window.HiAudit?.log('session_expiry_warning_1', { resource:'admin_session' }); } catch {}
    }

    if (minutesLeft <= 0) {
      clearInterval(sessionTimeout);
      try { liveRegion.textContent='Session expired. Redirecting to login.'; } catch {}
      window.location.href = '/';
    }
  }, 60000); // Update every minute
}

async function getClientIP() {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.warn('Could not get client IP:', error);
    return null;
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 🧹 ADDITIONAL ADMIN FUNCTIONS
async function deactivateExpiredCodes() {
  try {
    const sb = getClient(); if(!sb) throw new Error('Supabase unavailable');
    const { data, error } = await sb
      .from('invitation_codes')
      .update({ is_active: false })
      .lt('expires_at', new Date().toISOString())
      .select('count');

    if (error) throw error;

    showSuccess(`Deactivated ${data?.length || 0} expired invitation codes`);
    await loadDashboardData();

  } catch (error) {
    showError('Failed to clean expired codes: ' + error.message);
  }
}

async function getUserStats() {
  try {
    const sb = getClient(); if(!sb) throw new Error('Supabase unavailable');
    const { data, error } = await sb
      .from('auth.users')
      .select('created_at, email_confirmed_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    showResults('User Statistics', JSON.stringify(data, null, 2));

  } catch (error) {
    showError('Failed to get user statistics: ' + error.message);
  }
}

async function getRecentSignups() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  try {
    const sb = getClient(); if(!sb) throw new Error('Supabase unavailable');
    const { data, error } = await sb
      .from('auth.users')
      .select('id, created_at, email, email_confirmed_at')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    showResults('Recent Signups (Last 7 Days)', JSON.stringify(data, null, 2));

  } catch (error) {
    showError('Failed to get recent signups: ' + error.message);
  }
}

async function getMembershipStats() {
  try {
    const sb = getClient(); if(!sb) throw new Error('Supabase unavailable');
    const { data, error } = await sb
      .from('user_memberships')
      .select('status, created_at, membership_type')
      .order('created_at', { ascending: false });

    if (error) throw error;

    showResults('Membership Statistics', JSON.stringify(data, null, 2));

  } catch (error) {
    showError('Failed to get membership statistics: ' + error.message);
  }
}

async function getSecurityEvents() {
  try {
    const sb = getClient(); if(!sb) throw new Error('Supabase unavailable');
    const { data, error } = await sb
      .from('admin_access_logs')
      .select('*')
      .eq('success', false)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    showResults('Security Events (Last 24 Hours)', JSON.stringify(data, null, 2));

  } catch (error) {
    showError('Failed to get security events: ' + error.message);
  }
}
