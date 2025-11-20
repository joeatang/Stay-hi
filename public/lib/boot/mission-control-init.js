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
  // Begin initialization immediately; auth-ready will revalidate later.
  initializeSecuritySystem();
});

// React when admin state flips after initial denial (e.g. passcode unlock)
window.addEventListener('hi:admin-state-changed', (e) => {
  try {
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

// Revalidate on auth-ready (ensures fresh privileges after magic link)
window.addEventListener('hi:auth-ready', async () => {
  console.log('[MissionControl] auth-ready received -> revalidate admin');
  if (window.AdminAccessManager) {
    await window.AdminAccessManager.checkAdmin({ force:true });
    const st = window.AdminAccessManager.getState();
    if (st.isAdmin && document.getElementById('securityLoading')?.style.display!=='none') {
      // If we were still on loading, finalize UI
      finalizeAdminUI();
    }
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
});

// Also respond to auth updates (e.g., stub->real upgrade revealing a session)
window.addEventListener('hi:auth-updated', async () => {
  console.log('[MissionControl] auth-updated received -> revalidate admin');
  if (window.AdminAccessManager) {
    await window.AdminAccessManager.checkAdmin({ force:true });
    const st = window.AdminAccessManager.getState();
    if (st.isAdmin && document.getElementById('securityLoading')?.style.display!=='none') {
      finalizeAdminUI();
    }
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
});

async function initializeSecuritySystem() {
  const statusEl = document.getElementById('securityStatus');
  const progressBar = document.getElementById('progressBar');

  console.log('🔐 initializeSecuritySystem started');
  console.log('📍 Status element:', statusEl);
  console.log('📊 Progress bar:', progressBar);

  try {
    statusEl.textContent = 'Verifying admin privileges...';
    progressBar.style.width = '25%';
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
    if (!state.isAdmin) throw new Error(state.reason || 'Administrative privileges required');
    currentUser = state.user;
    statusEl.textContent = 'Establishing secure session...';
    progressBar.style.width = '55%';
    const sb = getClient();
    if (!sb) throw new Error('Supabase unavailable');
    const clientIP = await getClientIP();
    const { data: sessionData, error: sessionError } = await sb.rpc('create_admin_session', { p_ip_address: clientIP, p_user_agent: navigator.userAgent });
    if (sessionError || !sessionData) throw new Error('Session creation failed');
    adminSession = sessionData;
    statusEl.textContent = 'Loading dashboard data...';
    progressBar.style.width = '75%';
    await loadDashboardData();
    statusEl.textContent = 'Mission Control Ready';
    progressBar.style.width = '100%';
    finalizeAdminUI();
    startSessionTimer(adminSession.expires_at);
  } catch (error) {
    console.error('Security verification failed:', error);
    showUnauthorizedAccess(error.message);
    // WOZ-grade fallback: if we have no Supabase client session after grace, auto redirect to sign-in
    try {
      const sb = getClient();
      const hasAuth = !!(await sb?.auth?.getSession())?.data?.session;
      if (!hasAuth) {
        setTimeout(()=>{
          // Avoid redirect loop if already on signin
          if (!/signin\.html/.test(location.pathname)) {
            location.href = '/signin.html?redirect=/hi-mission-control.html';
          }
        }, 1800);
      }
    } catch {}
  }
}

function finalizeAdminUI(){
  const loading = document.getElementById('securityLoading');
  const dash = document.getElementById('dashboardContainer');
  if (loading) loading.style.display='none';
  if (dash) dash.style.display='block';
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
  } catch (error) {
    console.error('Failed to load dashboard stats:', error);
    showError('Failed to load dashboard statistics');
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
async function generateInviteCode() {
  try {
    const sb = getClient(); if(!sb) throw new Error('Supabase unavailable');
    const { data, error } = await sb.rpc('admin_generate_invite_code', {
      p_created_by: currentUser.id,
      p_max_uses: 1,
      p_expires_in_hours: 168 // 7 days
    });

    if (error) throw error;
    // Present structured code card plus raw JSON for audit
    const code = data?.code || 'UNKNOWN';
    const expires = data?.expires_at || 'n/a';
    const remaining = data?.uses_remaining ?? '?';
    const jsonBlock = JSON.stringify(data, null, 2);
    showResults('New Invitation Code Generated', jsonBlock);
    showSuccess('Invitation code generated successfully!');
    injectInviteCodeCard({ code, expires, remaining });
    await loadDashboardData();

  } catch (error) {
    console.error('Error generating invite code:', error);
    showError('Failed to generate invitation code: ' + error.message);
  }
}

async function listInviteCodes() {
  try {
    const sb = getClient(); if(!sb) throw new Error('Supabase unavailable');
    const { data, error } = await sb.rpc('admin_list_invite_codes');

    if (error) throw error;

    showResults('All Invitation Codes', JSON.stringify(data, null, 2));
    renderInviteCards(data || []);

  } catch (error) {
    console.error('Error listing invite codes:', error);
    showError('Failed to retrieve invitation codes: ' + error.message);
  }
}

async function getActiveInvites() {
  try {
    const sb = getClient(); if(!sb) throw new Error('Supabase unavailable');
    const { data, error } = await sb
      .from('invitation_codes')
      .select('*')
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString());

    if (error) throw error;

    showResults('Active Invitation Codes', JSON.stringify(data, null, 2));
    renderInviteCards(data || []);

  } catch (error) {
    console.error('Error getting active invites:', error);
    showError('Failed to retrieve active invitations: ' + error.message);
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

function injectInviteCodeCard(meta){
  const existing = document.getElementById('latestInviteCodeCard');
  if (existing) existing.remove();
  const container = document.getElementById('dashboardContainer');
  const card = document.createElement('div');
  card.id = 'latestInviteCodeCard';
  card.style.cssText = 'background:rgba(0,212,255,0.08);border:1px solid rgba(0,212,255,0.3);padding:20px;border-radius:16px;margin:18px 0;position:relative;';
  card.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <div style="font-size:16px;font-weight:600;color:#00d4ff;">🎫 Invitation Code Ready</div>
      <button type="button" style="background:#00d4ff;color:#0f172a;border:none;padding:6px 12px;border-radius:8px;font-weight:600;cursor:pointer;font-size:12px;" onclick="copyInviteCode()">Copy</button>
    </div>
    <div style="font-family:Menlo,monospace;font-size:20px;letter-spacing:2px;background:#0f2538;padding:12px 16px;border-radius:12px;color:#e2e8f0;" id="inviteCodeValue">${meta.code}</div>
    <div style="margin-top:12px;font-size:12px;opacity:.8;display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;">
      <div><strong>Expires:</strong><br>${meta.expires}</div>
      <div><strong>Remaining Uses:</strong><br>${meta.remaining}</div>
      <div><strong>Status:</strong><br>${(meta.remaining>0)?'Active':'Exhausted'}</div>
    </div>
    <div style="margin-top:14px;font-size:12px;opacity:.7;">Share this code privately. Redemption UI will validate <code>uses_remaining</code> & <code>expires_at</code>.</div>
  `;
  container.insertBefore(card, container.children[1]);
  window.copyInviteCode = function(){
    const val = meta.code;
    navigator.clipboard.writeText(val).then(()=>{
      showSuccess('Code copied to clipboard');
    }).catch(()=> showError('Clipboard copy failed'));
  };
}

function renderInviteCards(rows){
  const wrap = document.getElementById('inviteCardsContainer');
  if (!wrap) return;
  wrap.innerHTML='';
  if (!rows.length){
    wrap.innerHTML = '<div style="opacity:.6;font-size:12px;">No invitation codes found.</div>';
    return;
  }
  const now = Date.now();
  rows.forEach(r=>{
    const expiresTs = r.expires_at ? Date.parse(r.expires_at) : 0;
    const remaining = r.uses_remaining ?? 0;
    const active = r.is_active && remaining>0 && expiresTs>now;
    const card = document.createElement('div');
    card.className = 'invite-card ' + (active ? 'active':'exhausted');
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;">
        <div style="font-size:12px;font-weight:600;letter-spacing:.5px;">${active?'ACTIVE':'INACTIVE'}</div>
        <div style="font-size:10px;opacity:.55;">${r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}</div>
      </div>
      <div class="invite-code-value">${r.code || 'UNKNOWN'}</div>
      <div class="invite-meta">
        <div><strong>Uses Left:</strong><br>${remaining}</div>
        <div><strong>Max Uses:</strong><br>${r.max_uses ?? '?'}</div>
        <div><strong>Expires:</strong><br>${r.expires_at ? new Date(r.expires_at).toLocaleString() : 'n/a'}</div>
      </div>
      <div class="invite-actions">
        <button type="button" data-code="${r.code}">Copy</button>
        ${active?'<button type="button" data-code="'+r.code+'" data-action="share">Share</button>':''}
      </div>
    `;
    wrap.appendChild(card);
  });
  // Wire buttons
  wrap.querySelectorAll('button[data-code]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const code = btn.getAttribute('data-code');
      if (btn.getAttribute('data-action')==='share'){
        try {
          const shareData = { title:'Hi Invitation', text:`Join Hi with invite code: ${code}`, url: location.origin+'/welcome.html?invite='+encodeURIComponent(code) };
          if (navigator.share){ navigator.share(shareData).catch(()=>{}); }
          else { navigator.clipboard.writeText(code).then(()=> showSuccess('Copied for sharing')); }
        } catch { navigator.clipboard.writeText(code).then(()=> showSuccess('Copied')); }
      } else {
        navigator.clipboard.writeText(code).then(()=> showSuccess('Code copied')).catch(()=> showError('Clipboard copy failed'));
      }
    });
  });
}

function startSessionTimer(expiresAt) {
  const expiryTime = new Date(expiresAt).getTime();
  const timerEl = document.getElementById('sessionTimer');

  sessionTimeout = setInterval(() => {
    const now = Date.now();
    const timeLeft = Math.max(0, expiryTime - now);
    const minutesLeft = Math.floor(timeLeft / (1000 * 60));

    timerEl.textContent = minutesLeft;

    if (minutesLeft <= 0) {
      clearInterval(sessionTimeout);
      alert('⚠️ Session expired. Redirecting to login...');
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
