// Extracted SmartNavigation and initialization from profile.html
class SmartNavigation {
  constructor() {
    this.backBtn = document.getElementById('smartBackBtn');
    this.backText = document.getElementById('backDestination');
    this.defaultDestination = '/public/hi-dashboard.html';
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
  setupBackDestination(){ try { const referrer=document.referrer; if(referrer && this.isValidSource(referrer)){ const sourceName=this.getSourceName(referrer); this.updateBackButton(`Back to ${sourceName}`, referrer); return; } const navHistory=JSON.parse(sessionStorage.getItem('hiNavHistory')||'[]'); const lastValidPage=navHistory.find(page=> page.url!==window.location.href && this.isValidSource(page.url)); if(lastValidPage){ this.updateBackButton(`Back to ${lastValidPage.name}`, lastValidPage.url); return; } if(history.length>1){ this.updateBackButton('Back','history'); return; } this.updateBackButton('Back to Dashboard', this.defaultDestination); } catch(e){ this.updateBackButton('Back to Dashboard', this.defaultDestination); } }
  isValidSource(url){ if(!url) return false; return this.validSources.some(source=> url.includes(source)); }
  getSourceName(url){ if(url.includes('hi-dashboard')) return 'Dashboard'; if(url.includes('hi-island')) return 'Hi Island'; if(url.includes('hi-muscle')) return 'Hi Muscle'; if(url.includes('hi-calendar')) return 'Calendar'; if(url.includes('hi-hiffirmations')) return 'Hiffirmations'; if(url.includes('hi-stats')) return 'Hi Stats'; return 'Previous Page'; }
  updateBackButton(text,destination){ if(this.backText) this.backText.textContent=text; this.backBtn.setAttribute('data-destination', destination); this.backBtn.setAttribute('title', text); }
  handleBackNavigation(e){ e.preventDefault(); const destination=this.backBtn.getAttribute('data-destination'); try { this.backBtn.classList.add('loading'); if(destination==='history'){ if(history.length>1 && document.referrer){ history.back(); } else { window.location.href=this.defaultDestination; } } else if(destination){ window.location.href=destination; } else { window.location.href=this.defaultDestination; } this.trackNavigation(destination); } catch(err){ window.location.href=this.defaultDestination; } }
  trackNavigation(destination){ try { const navEvent={ from:window.location.href, to:destination, timestamp:Date.now(), type:'smart_back' }; const navHistory=JSON.parse(sessionStorage.getItem('hiNavHistory')||'[]'); navHistory.unshift(navEvent); navHistory.splice(10); sessionStorage.setItem('hiNavHistory', JSON.stringify(navHistory)); } catch(_){} }
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Tesla Profile System Initializing...');
  try { const currentPage={ url:window.location.href, name:'Profile', timestamp:Date.now() }; const navHistory=JSON.parse(sessionStorage.getItem('hiNavHistory')||'[]'); const filtered=navHistory.filter(page=> page.url!==currentPage.url); filtered.unshift(currentPage); filtered.splice(10); sessionStorage.setItem('hiNavHistory', JSON.stringify(filtered)); } catch(_){ }
  const smartNav=new SmartNavigation();
  setTimeout(async () => { if (typeof AnonymousAccessModal !== 'undefined'){ let authReady=false; let attempts=0; while(!authReady && attempts<30){ if(window.supabaseClient || window.supabase || window.sb){ authReady=true; break; } await new Promise(r=>setTimeout(r,200)); attempts++; } if(authReady){ if(!window.anonymousAccessModal){ window.anonymousAccessModal=new AnonymousAccessModal(); console.log('🔒 Anonymous access modal initialized after auth ready'); } } else { console.log('⚠️ Auth systems not ready, skipping anonymous modal'); } } else { console.warn('⚠️ AnonymousAccessModal not loaded'); } },2000);
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
  setTimeout(()=>{ if(window.HiMembership && window.HiMembership.isInitialized()){ const user=window.HiMembership.getCurrentUser(); const tierIndicator=document.getElementById('hi-tier-indicator'); if(tierIndicator && user){ const tierText=tierIndicator.querySelector('.tier-text'); tierText.textContent=user.tierInfo.name; tierIndicator.style.color=user.tierInfo.color || '#6B7280'; if(user.membershipTier==='ADMIN'){ const adminSection=document.getElementById('adminSection'); if(adminSection) adminSection.style.display='block'; } console.log('🎫 [Profile] Membership tier displayed:', user.tierInfo.name); } } },1000);
});
