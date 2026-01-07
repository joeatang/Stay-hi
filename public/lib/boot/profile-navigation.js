// Extracted SmartNavigation and initialization from profile.html
class SmartNavigation {
  constructor() {
    this.backBtn = document.getElementById('smartBackBtn');
    this.backText = document.getElementById('backDestination');
    try {
      this.defaultDestination = (window.hiPaths?.resolve ? window.hiPaths.resolve('hi-dashboard.html') : '/public/hi-dashboard.html');
    } catch {
      this.defaultDestination = '/public/hi-dashboard.html';
    }
    this.validSources = [
      '/public/hi-dashboard.html',
      '/public/hi-island-NEW.html',
      '/public/hi-muscle.html',
      '/public/hi-calendar.html',
      '/public/hi-hiffirmations.html',
      '/public/hi-stats.html'
    ];
    this.init();
  }
  init(){ if(!this.backBtn) return; this.setupBackDestination(); this.backBtn.addEventListener('click', e => this.handleBackNavigation(e)); }
  setupBackDestination(){ try { const referrer=document.referrer; if(referrer && this.isValidSource(referrer)){ const sourceName=this.getSourceName(referrer); this.updateBackButton(`Back to ${sourceName}`, referrer); return; } const navHistory=JSON.parse(sessionStorage.getItem('hiNavHistory')||'[]'); const lastValidPage=navHistory.find(page=> page.url!==window.location.href && this.isValidSource(page.url)); if(lastValidPage){ this.updateBackButton(`Back to ${lastValidPage.name}`, lastValidPage.url); return; } if(history.length>1){ this.updateBackButton('Back','history'); return; } const safeDash=(window.hiPaths?.resolve?window.hiPaths.resolve('hi-dashboard.html'):this.defaultDestination); this.updateBackButton('Back to Dashboard', safeDash); } catch(e){ const safeDash=(window.hiPaths?.resolve?window.hiPaths.resolve('hi-dashboard.html'):this.defaultDestination); this.updateBackButton('Back to Dashboard', safeDash); } }
  isValidSource(url){ if(!url) return false; const sources = this.validSources.concat(['hi-dashboard.html','hi-island-NEW.html','hi-muscle.html','calendar.html','hi-hiffirmations.html','hi-stats.html']); return sources.some(source=> url.includes(source)); }
  getSourceName(url){ if(url.includes('hi-dashboard')) return 'Dashboard'; if(url.includes('hi-island')) return 'Hi Island'; if(url.includes('hi-muscle')) return 'Hi Muscle'; if(url.includes('hi-calendar')) return 'Calendar'; if(url.includes('hi-hiffirmations')) return 'Hiffirmations'; if(url.includes('hi-stats')) return 'Hi Stats'; return 'Previous Page'; }
  updateBackButton(text,destination){ if(this.backText) this.backText.textContent=text; this.backBtn.setAttribute('data-destination', destination); this.backBtn.setAttribute('title', text); }
  handleBackNavigation(e){ e.preventDefault(); const destination=this.backBtn.getAttribute('data-destination'); try { this.backBtn.classList.add('loading'); if(destination==='history'){ if(history.length>1 && document.referrer){ history.back(); } else { window.location.href=this.defaultDestination; } } else if(destination){ window.location.href=destination; } else { window.location.href=this.defaultDestination; } this.trackNavigation(destination); } catch(err){ window.location.href=this.defaultDestination; } }
  trackNavigation(destination){ try { const navEvent={ from:window.location.href, to:destination, timestamp:Date.now(), type:'smart_back' }; const navHistory=JSON.parse(sessionStorage.getItem('hiNavHistory')||'[]'); navHistory.unshift(navEvent); navHistory.splice(10); sessionStorage.setItem('hiNavHistory', JSON.stringify(navHistory)); } catch(_){} }
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Tesla Profile System Initializing...');
  try { const currentPage={ url:window.location.href, name:'Profile', timestamp:Date.now() }; const navHistory=JSON.parse(sessionStorage.getItem('hiNavHistory')||'[]'); const filtered=navHistory.filter(page=> page.url!==currentPage.url); filtered.unshift(currentPage); filtered.splice(10); sessionStorage.setItem('hiNavHistory', JSON.stringify(filtered)); } catch(_){ }
  const smartNav=new SmartNavigation();
  // ✅ REMOVED: No longer show modal automatically - wait for auth-ready event instead
  // Modal will auto-show via anonymous-access-modal.js if truly anonymous after auth check
  
  // 🚫 REMOVED: These call deprecated functions from profile-main.js
  // if(typeof updateProfileDisplay==='function' && window.currentProfile){ updateProfileDisplay(window.currentProfile); }
  // if(typeof updateStatsDisplay==='function' && window.userStats){ updateStatsDisplay(window.userStats); }
  // setTimeout(()=>{ console.log('🔒 Initializing secure profile loading...'); if(typeof loadProfileData==='function') loadProfileData(); },500);
  
  console.log('ℹ️ Profile loading delegated to profile.html inline system (no duplicate calls)');
  
  const avatarInput=document.getElementById('avatarFileInput'); if(avatarInput){ avatarInput.addEventListener('change', e=>{ if(e.target.files && e.target.files.length>0){ if(typeof handleImageUpload==='function') handleImageUpload(e); } }); }
  setTimeout(()=>{ if(typeof initializeTeslaAvatarSystem==='function') initializeTeslaAvatarSystem(); },100);
  if(typeof showToast==='function') showToast('Profile loaded successfully! 🎉');
  console.log('✅ Tesla Profile System fully initialized');
  // ✨ Navigation & Modal Handlers (synced with dashboard-main.js)
  const menuBtn=document.getElementById('btnMenu'); 
  const navigationModal=document.getElementById('navigationModal'); 
  const closeBtn=document.getElementById('closeNavigation'); 
  const backdrop=document.getElementById('navigationBackdrop');
  
  const openNavigation = async () => {
    if (!navigationModal) return;
    navigationModal.classList.add('show'); 
    navigationModal.style.display='block'; 
    document.body.style.overflow='hidden';
    
    // Check admin status from AdminAccessManager
    let adminState = window.AdminAccessManager?.getState?.() || {};
    const needsFreshCheck = !adminState.lastChecked || (Date.now() - adminState.lastChecked > 60000);
    if (window.AdminAccessManager?.checkAdmin && needsFreshCheck) {
      try {
        const checkPromise = window.AdminAccessManager.checkAdmin({ force: false });
        const timeoutPromise = new Promise(resolve => setTimeout(resolve, 1500));
        await Promise.race([checkPromise, timeoutPromise]);
        adminState = window.AdminAccessManager.getState();
      } catch (e) {
        console.warn('[Profile] Admin check failed:', e);
      }
    }
    
    const isAdmin = adminState.isAdmin === true;
    const adminSection = document.getElementById('adminSection');
    if (adminSection) {
      adminSection.style.display = isAdmin ? 'block' : 'none';
    }
    
    console.log('🎯 [Profile] Navigation menu opened | Admin:', isAdmin);
  };
  
  const closeNavigationModal = () => {
    if (!navigationModal) return;
    navigationModal.classList.remove('show'); 
    document.body.style.overflow=''; 
    setTimeout(()=>{ 
      if(!navigationModal.classList.contains('show')) navigationModal.style.display='none'; 
    }, 300); 
    try { menuBtn?.focus({preventScroll:true}); } catch {}
    console.log('🎯 [Profile] Navigation menu closed');
  };
  
  if(menuBtn && navigationModal){ 
    menuBtn.addEventListener('click', openNavigation);
  }
  if (closeBtn) closeBtn.addEventListener('click', closeNavigationModal);
  if (backdrop) backdrop.addEventListener('click', closeNavigationModal);
  document.addEventListener('keydown', e => { 
    if (e.key==='Escape' && navigationModal?.classList.contains('show')) closeNavigationModal(); 
  });
  
  const homeBtn=document.getElementById('btnHome'); 
  if(homeBtn){ 
    homeBtn.addEventListener('click', ()=>{ window.location.href='hi-dashboard.html'; }); 
  }
  
  const calBtn=document.getElementById('btnCal'); 
  if(calBtn){ 
    calBtn.addEventListener('click', ()=>{ 
      if(typeof openCalendar==='function'){ 
        openCalendar(); 
      } else { 
        console.log('📅 Calendar not available'); 
      } 
    }); 
  }
  
  const hiffirmationsBtn=document.getElementById('hiffirmationsTrigger'); 
  if(hiffirmationsBtn){ 
    hiffirmationsBtn.addEventListener('click', (e) =>{ 
      e.preventDefault(); 
      showHiffirmationsModal(); 
    }); 
  }
  
  // ✨ Hiffirmations Modal System (copied from dashboard-main.js)
  function getDailyHiffirmation(date=new Date()){
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`; 
    let hash=0; 
    for(let i=0;i<key.length;i++){ 
      hash=(hash*31+key.charCodeAt(i))|0; 
    }
    const hiffirmations=["✨ Stay Hi! You're on a Hi level of positive energy today","🌟 Your Hi vibes are lifting others to new Hi-ghts of joy","💫 Hi there! You have the power to get someone Hi on life today","🔥 Hi amazing soul! Your authentic self is Hi-ly inspiring","🌈 Every Hi you share lifts our world to Hi-er dimensions","⭐ Hi friend! You're exactly Hi enough, right Hi and now","💝 Hi incredible human! Your presence gets everyone Hi on good vibes","🌺 Hi warrior! You're reaching Hi-er levels with each Hi moment","🎯 Hi there! Trust your journey, you're flying Hi and amazing","💎 Hi shining star! Your Hi energy can never be brought low","🚀 Hi unstoppable force! Your potential reaches the Hi-est peaks","🌸 Hi beautiful! You bring Hi-quality beauty to every moment","⚡ Hi energy! Your Hi frequency lights up every space you enter","🏔️ Hi mountain mover! You're Hi above any challenge life brings","🎨 Hi creative soul! Your imagination paints the world in Hi definition","🌊 Hi flowing river! You ride Hi through all of life's changes","🔮 Hi intuitive being! Your inner wisdom operates on the Hi-est level","🦋 Hi transformer! You're evolving into your Hi-est, most amazing self","🌅 Hi sunrise! Each day brings Hi-level opportunities just for you","💪 Hi resilient heart! Your bounce-back ability is Hi-ly remarkable" ];
    const selectedMessage = hiffirmations[Math.abs(hash % hiffirmations.length)];
    const lastHiffirmationDate = localStorage.getItem('lastHiffirmationDate'); 
    const today = new Date().toDateString(); 
    const isDaily = lastHiffirmationDate !== today;
    if (isDaily){ 
      localStorage.setItem('lastHiffirmationDate', today); 
      return selectedMessage; 
    }
    const hiBoosts=["Stay Hi! Keep that Hi energy shining! ✨","Hi beautiful! You've got that Hi-level magic! 💪","Hi amazing! Keep riding Hi! 🚀","Hi superstar! Stay on that Hi frequency! 🌟"]; 
    return hiBoosts[Math.floor(Math.random()*hiBoosts.length)];
  }
  
  function getNextHiffirmationCountdown(){ 
    const now=new Date(); 
    const tomorrow=new Date(now); 
    tomorrow.setDate(tomorrow.getDate()+1); 
    tomorrow.setHours(0,0,0,0); 
    const timeLeft=tomorrow-now; 
    return { 
      hours:Math.floor(timeLeft/3600000), 
      minutes:Math.floor((timeLeft%3600000)/60000), 
      timeLeft 
    }; 
  }
  
  function showHiffirmationsModal(customDate=null){ 
    const targetDate=customDate||new Date(); 
    const dailyHiffirmation=getDailyHiffirmation(targetDate); 
    const countdown=getNextHiffirmationCountdown(); 
    const isToday = !customDate || (targetDate.toDateString()===new Date().toDateString()); 
    const dateLabel = isToday? 'Today' : targetDate.toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric'});
    
    const modal=document.createElement('div'); 
    modal.style.cssText='position:fixed;top:0;left:0;right:0;bottom:0;z-index:15000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.8);backdrop-filter:blur(8px);';
    modal.innerHTML=`<div style="background:rgba(15,16,34,0.95);backdrop-filter:blur(25px);border:1px solid rgba(255,255,255,0.15);border-radius:24px;padding:32px;max-width:400px;width:90vw;text-align:center;color:#fff;box-shadow:0 20px 40px rgba(0,0,0,.3);position:relative;">`+
    `<h3 style="margin:0 0 8px;color:#FFD166;font-size:24px;">✨ ${(function(){const lastDate=localStorage.getItem('lastHiffirmationDate');const todayString=new Date().toDateString();const isDailyHi=!customDate && (lastDate!==todayString);if(!isToday) return dateLabel+' Hiffirmation';return isDailyHi ? 'Daily Hiffirmation' : 'Hi Boost';})()}</h3>`+
    `<p style="font-size:18px;line-height:1.6;margin:20px 0;color:rgba(255,255,255,0.95);">${dailyHiffirmation}</p>`+
    (isToday?`<p style="font-size:12px;color:rgba(255,255,255,0.6);margin:16px 0 0;">Next Hiffirmation in ${countdown.hours}h ${countdown.minutes}m</p>`:'') +
    `<div style="display:flex;gap:12px;margin-top:24px;justify-content:center;">`+
    `<button class="close-hiffirmation" style="flex:1;padding:12px 20px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:12px;color:#fff;cursor:pointer;font-size:14px;font-weight:600;transition:all 0.3s ease;">Close</button>`+
    `<button class="hiffirmation-share" style="flex:1;padding:12px 20px;background:linear-gradient(135deg,#FFD166,#F4A261);border:none;border-radius:12px;color:#1E2A4A;cursor:pointer;font-size:14px;font-weight:600;transition:all 0.3s ease;">Share</button>`+
    `</div></div>`;
    
    document.body.appendChild(modal);
    const closeModal = () => { modal.remove(); document.body.style.overflow=''; };
    modal.addEventListener('click',e=>{ if(e.target===modal) closeModal(); });
    modal.querySelector('.close-hiffirmation').addEventListener('click', closeModal);
    modal.querySelector('.hiffirmation-share').addEventListener('click', async () => {
      try {
        if (navigator.share) {
          await navigator.share({ title: 'Stay Hi Hiffirmation', text: dailyHiffirmation, url: window.location.origin });
        } else {
          await navigator.clipboard.writeText(dailyHiffirmation);
          alert('Hiffirmation copied to clipboard! ✨');
        }
      } catch(e){ console.log('Share cancelled or failed'); }
    });
    document.body.style.overflow='hidden';
  }
  
  // ✨ Tier Display Update System (synced with dashboard logic)
  function updateBrandTierDisplay(eventOrTier) {
    const tierIndicator = document.getElementById('hi-tier-indicator');
    if (!tierIndicator) return;
    if (!window.HiBrandTiers) return;
    
    let tierKey = 'anonymous';
    
    // ✅ GOLD STANDARD: Priority order for tier sources
    // 1. Event detail from hi:auth-ready (authoritative from database RPC)
    if (eventOrTier?.detail?.membership?.tier) {
      tierKey = eventOrTier.detail.membership.tier;
    } 
    // 2. Direct string parameter
    else if (typeof eventOrTier === 'string') {
      tierKey = eventOrTier;
    } 
    // 3. AuthReady cached membership (window.__hiMembership set by AuthReady.js)
    else if (window.__hiMembership?.tier) {
      tierKey = window.__hiMembership.tier;
    } 
    // 4. Legacy unifiedMembership (older system)
    else if (window.unifiedMembership?.membershipStatus?.tier) {
      tierKey = window.unifiedMembership.membershipStatus.tier;
    } 
    // 5. HiMembership legacy
    else if (window.HiMembership?.currentUser?.tierInfo?.name) {
      tierKey = window.HiMembership.currentUser.tierInfo.name.toLowerCase();
    }
    // 6. LocalStorage fallback
    else {
      const cached = localStorage.getItem('hi_membership_tier');
      if (cached) tierKey = cached;
    }
    
    window.HiBrandTiers.updateTierPill(tierIndicator, tierKey, {
      showEmoji: true,  // ✅ Profile shows emoji + branded name ("🧭 Hi Pathfinder")
      useGradient: false
    });
    
    // Show admin section if admin or premium
    const isAdmin = eventOrTier?.detail?.membership?.is_admin || window.__hiMembership?.is_admin || tierKey === 'admin' || tierKey === 'premium';
    if (isAdmin) {
      const adminSection = document.getElementById('adminSection');
      if (adminSection) adminSection.style.display = 'block';
    }
    
    console.log('🎫 [Profile Nav] Tier updated:', tierKey, eventOrTier?.detail?.membership ? `(from auth-ready event, DB tier: ${eventOrTier.detail.membership.tier})` : '(from fallback)');
  }
  
  // 🛑 WOZ FIX: Robust tier initialization that handles all timing scenarios
  const initializeTierDisplay = () => {
    const tierIndicator = document.getElementById('hi-tier-indicator');
    if (!tierIndicator) {
      console.warn('⚠️ [Profile Nav] Tier indicator element not found');
      return;
    }
    
    // Check multiple sources for tier data
    const checkTierSources = () => {
      if (window.__hiMembership?.tier) {
        console.log('🔍 [Profile Nav] Found tier in __hiMembership:', window.__hiMembership.tier);
        return window.__hiMembership.tier;
      }
      if (window.unifiedMembership?.membershipStatus?.tier) {
        console.log('🔍 [Profile Nav] Found tier in unifiedMembership:', window.unifiedMembership.membershipStatus.tier);
        return window.unifiedMembership.membershipStatus.tier;
      }
      return null;
    };
    
    const existingTier = checkTierSources();
    
    if (existingTier) {
      console.log('✅ [Profile Nav] Auth ALREADY ready, updating tier immediately:', existingTier);
      updateBrandTierDisplay();
    } else {
      console.log('⏳ [Profile Nav] No tier data yet, setting up listeners...');
      
      // Listen for auth-ready event
      window.addEventListener('hi:auth-ready', (e) => {
        console.log('🔔 [Profile Nav] hi:auth-ready received, tier:', e.detail?.membership?.tier);
        updateBrandTierDisplay(e);
      });
      
      // Fallback: Check every 500ms for up to 5 seconds
      let checkAttempts = 0;
      const maxAttempts = 10;
      const checkInterval = setInterval(() => {
        checkAttempts++;
        const tier = checkTierSources();
        
        if (tier) {
          console.log('✅ [Profile Nav] Tier found after', checkAttempts, 'checks:', tier);
          clearInterval(checkInterval);
          updateBrandTierDisplay();
        } else if (checkAttempts >= maxAttempts) {
          console.warn('⚠️ [Profile Nav] Tier not found after', maxAttempts, 'checks - may be anonymous');
          clearInterval(checkInterval);
          // Keep loading state or set to anonymous
          updateBrandTierDisplay('anonymous');
        }
      }, 500);
    }
  };
  
  // Start tier initialization
  initializeTierDisplay();
  
  // Also listen for membership changes
  window.addEventListener('membershipStatusChanged', () => {
    console.log('🔄 [Profile Nav] Membership status changed');
    updateBrandTierDisplay();
  });
});
