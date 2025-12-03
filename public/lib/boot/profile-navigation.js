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
  // Unified access request instead of legacy anonymous modal initialization
  setTimeout(() => {
    if(window.AccessGate?.request){
      window.AccessGate.request('profile:view');
    } else if(typeof AnonymousAccessModal !== 'undefined') {
      if(!window.anonymousAccessModal){ window.anonymousAccessModal = new AnonymousAccessModal(); }
      window.anonymousAccessModal.showAccessModal();
    } else {
      console.warn('⚠️ No AccessGate or AnonymousAccessModal for profile gating');
    }
  },500);
  if(typeof updateProfileDisplay==='function' && window.currentProfile){ updateProfileDisplay(window.currentProfile); }
  if(typeof updateStatsDisplay==='function' && window.userStats){ updateStatsDisplay(window.userStats); }
  setTimeout(()=>{ console.log('🔒 Initializing secure profile loading...'); if(typeof loadProfileData==='function') loadProfileData(); },500);
  const avatarInput=document.getElementById('avatarFileInput'); if(avatarInput){ avatarInput.addEventListener('change', e=>{ if(e.target.files && e.target.files.length>0){ if(typeof handleImageUpload==='function') handleImageUpload(e); } }); }
  setTimeout(()=>{ if(typeof initializeTeslaAvatarSystem==='function') initializeTeslaAvatarSystem(); },100);
  if(typeof showToast==='function') showToast('Profile loaded successfully! 🎉');
  console.log('✅ Tesla Profile System fully initialized');
  const menuBtn=document.getElementById('btnMenu'); const navigationModal=document.getElementById('navigationModal'); const closeBtn=document.getElementById('closeNavigation'); const backdrop=document.getElementById('navigationBackdrop');
  if(menuBtn && navigationModal){ menuBtn.addEventListener('click', ()=>{ navigationModal.style.display='flex'; document.body.style.overflow='hidden'; }); [closeBtn, backdrop].forEach(el=>{ if(el){ el.addEventListener('click', ()=>{ navigationModal.style.display='none'; document.body.style.overflow='auto'; }); } }); }
  const calBtn=document.getElementById('btnCal'); if(calBtn){ calBtn.addEventListener('click', ()=>{ console.log('📅 Calendar clicked'); }); }
  const hiffirmationsBtn=document.getElementById('hiffirmationsTrigger'); if(hiffirmationsBtn){ hiffirmationsBtn.addEventListener('click', ()=>{ console.log('✨ Hiffirmations clicked'); }); }
  
  // ✨ Tier Display Update System (synced with dashboard logic)
  function updateBrandTierDisplay() {
    const tierIndicator = document.getElementById('hi-tier-indicator');
    if (!tierIndicator) return;
    if (!window.HiBrandTiers) return;
    
    let tierKey = 'anonymous';
    if (window.unifiedMembership?.membershipStatus?.tier) {
      tierKey = window.unifiedMembership.membershipStatus.tier;
    } else if (window.HiMembership?.currentUser?.tierInfo?.name) {
      tierKey = window.HiMembership.currentUser.tierInfo.name.toLowerCase();
    }
    
    window.HiBrandTiers.updateTierPill(tierIndicator, tierKey, {
      showEmoji: false,
      useGradient: false
    });
    
    // Show admin section if admin
    if (window.HiMembership?.currentUser?.membershipTier === 'ADMIN') {
      const adminSection = document.getElementById('adminSection');
      if (adminSection) adminSection.style.display = 'block';
    }
    
    console.log('🎫 [Profile] Tier updated:', tierKey);
  }
  
  // Initialize tier display on page load and listen for changes
  setTimeout(() => updateBrandTierDisplay(), 1000);
  window.addEventListener('membershipStatusChanged', () => updateBrandTierDisplay());
  setTimeout(() => { if (window.unifiedMembership?.membershipStatus?.tier) updateBrandTierDisplay(); }, 2500);
  setTimeout(() => { if (window.unifiedMembership?.membershipStatus?.tier) updateBrandTierDisplay(); }, 5000);
});
