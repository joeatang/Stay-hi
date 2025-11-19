// Post-auth finishing flow (classic)
let supabase;

async function waitForSupabase() {
  try {
    // Resolve relative to this file: /public/lib/boot/post-auth-init.js
    // Go up one level to /public/lib/HiSupabase.v3.js
    const module = await import('../HiSupabase.v3.js');
    supabase = module.supabase;
    console.log('✅ HiSupabase v3 loaded for post-auth');
    return supabase;
  } catch (err) {
    console.error('❌ Failed to load HiSupabase v3:', err);
    throw new Error('Failed to load authentication system');
  }
}

const $ = (s)=>document.querySelector(s);
const go = (p)=>{ 
  if (!p.startsWith('http')) {
    p = p.replace(/^\/+/, '');
  }
  window.location.href = p; 
};

function tokensFromHash() {
  if (!location.hash) return null;
  const h = new URLSearchParams(location.hash.replace(/^#/, ''));
  const access_token = h.get('access_token');
  const refresh_token = h.get('refresh_token');
  if (access_token && refresh_token) return { access_token, refresh_token };
  return null;
}

async function finishAuth() {
  try {
    console.log('🔐 Starting authentication process...');
    await supabase.auth.exchangeCodeForSession(window.location.href).catch((err) => {
      console.log('OAuth flow not applicable:', err.message);
    });

    const t = tokensFromHash();
    console.log('🎟️ Tokens from hash:', t ? 'Found' : 'None');
    
    if (t) {
      console.log('📝 Setting session with tokens...');
      await supabase.auth.setSession(t);
      history.replaceState({}, document.title, location.pathname);
    }

    console.log('🔍 Checking for active session...');
    const { data: { session } } = await supabase.auth.getSession();
    console.log('✅ Session check result:', session ? 'Active session found' : 'No session');
    
    if (!session) throw new Error('No active session after authentication');

    console.log('👤 User authenticated:', session.user.email);

    // Optional: redeem pending invite code captured during sign-in
    try {
      const pendingInvite = sessionStorage.getItem('hi_pending_invite_code');
      if (pendingInvite) {
        console.log('🎫 Redeeming invite code…');
        await supabase.rpc('activate_unified_invite_code', { invite_code: pendingInvite });
        sessionStorage.removeItem('hi_pending_invite_code');
        console.log('✅ Invite code redeemed');
      }
    } catch(invErr){
      console.warn('⚠️ Invite redemption failed (non-blocking):', invErr?.message || invErr);
    }

    try {
      const { data: me } = await supabase.auth.getUser();
      if (me?.user?.id) {
        const { data: rows } = await supabase
          .from('memberships')
          .select('expires_at')
          .eq('user_id', me.user.id)
          .gt('expires_at', new Date().toISOString())
          .limit(1)
          .maybeSingle();
        localStorage.setItem('hi_member', rows ? '1' : '0');
        console.log('🎫 Membership status cached:', rows ? 'Active' : 'None');
      }
    } catch(memberErr) {
      console.warn('⚠️ Membership check failed (non-critical):', memberErr.message);
    }

    console.log('🎉 Authentication successful! Showing success UI...');
    $('#working').style.display = 'none';
    $('#done').style.display = 'block';
    
    console.log('🔍 Smart routing: Checking membership tier...');
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user?.id) {
        const { data: memberData, error: memberError } = await supabase
          .rpc('get_unified_membership');
        
        console.log('🎯 Membership data:', memberData);
        
        if (!memberError && memberData) {
          const tier = memberData.tier;
          const isAdmin = memberData.is_admin;
          const status = memberData.status;
          
          if (isAdmin) {
            // Root fix: mission control access priority for admins on magic-link auth
            // Allow explicit next override or opt-out via ?stay=1
            const urlParams = new URLSearchParams(location.search);
            const stayParam = urlParams.get('stay');
            const explicitNext = urlParams.get('next');
            const target = (stayParam === '1') ? (explicitNext || 'hi-dashboard.html') : (explicitNext && !/hi-dashboard.html/i.test(explicitNext) ? explicitNext : 'hi-mission-control.html');
            console.log('✅ Admin user detected - routing to', target);
            setTimeout(()=>go(target), 600);
            return;
          }
          if (tier === 'collective') {
            console.log('✅ Collective user - routing to dashboard');
            const nextPage = new URLSearchParams(location.search).get('next') || 'hi-dashboard.html';
            setTimeout(()=>go(nextPage), 900);
            return;
          }
          
          if (status === 'active' && tier !== 'anonymous') {
            console.log('✅ Active member (' + tier + ') - routing to dashboard');
            const nextPage = new URLSearchParams(location.search).get('next') || 'hi-dashboard.html';
            setTimeout(()=>go(nextPage), 900);
            return;
          }
        }
      }
    } catch (smartRouteErr) {
      console.warn('⚠️ Smart routing check failed, falling back to standard logic:', smartRouteErr);
    }
    
    console.log('🔍 Fallback: Using legacy membership validation...');
    
    if (!localStorage.getItem('hi_member') || localStorage.getItem('hi_member') === '0') {
      console.log('⚠️ No active membership found - redirecting to upgrade');
      setTimeout(()=>go('upgrade.html?source=post-auth'), 900);
      return;
    }
    
    const urlParamsFinal = new URLSearchParams(location.search);
    const stayParamFinal = urlParamsFinal.get('stay');
    const nextParamFinal = urlParamsFinal.get('next');
    // Final fallback: if admin flag was missed earlier but membership indicates admin via local cache
    if (sessionStorage.getItem('hi_admin_access')==='true' && stayParamFinal!=='1') {
      console.log('🔁 Late admin detection - routing to mission control');
      setTimeout(()=>go('hi-mission-control.html'), 600);
      return;
    }
    const nextPage = nextParamFinal || 'hi-dashboard.html';
    console.log('🔄 Redirecting authenticated member to:', nextPage);
    setTimeout(()=>go(nextPage), 900);
  } catch (err) {
    console.error('❌ Authentication failed:', err);
    $('#working').style.display = 'none';
    $('#oopsMsg').textContent = err.message || 'Something went wrong during authentication.';
    $('#oops').style.display = 'block';
  }
}

if (location.protocol === 'file:') {
  localStorage.setItem('hi_dev_user', 'dev@example.com');
  go('index.html');
} else {
  waitForSupabase().then(() => {
    finishAuth();
  }).catch((err) => {
    console.error('❌ Failed to initialize Supabase:', err);
    $('#working').style.display = 'none';
    $('#oopsMsg').textContent = 'Failed to load authentication system. Please try refreshing the page.';
    $('#oops').style.display = 'block';
  });
}
