// 🎬 TESLA-GRADE LOADING EXPERIENCE V2.0
// Tesla-grade auth check with beautiful loading experience
async function checkAuthWithLoadingExperience() {
  try {
    const supa = window.supabaseClient;
    if (!supa) return;
    
    const { data: { session }, error } = await supa.auth.getSession();
    if (error) {
      console.log('Welcome: Auth check error:', error);
      return;
    }
    
    if (session) {
      console.log('Welcome: User authenticated - starting loading experience');
      sessionStorage.setItem('from-welcome', 'true');
      
      await window.hiLoadingExperience.start('Welcome back! Loading your Hi space...');
      await window.hiLoadingExperience.hide();
      window.location.replace('./hi-dashboard.html?source=welcome');
    }
  } catch (error) {
    console.log('Welcome: Auth check failed:', error);
  }
}

// Initialize when ready
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(checkAuthWithLoadingExperience, 500);
});
