// � SMOOTH AUTH CHECK - Invisible to user
// Returning users: Redirect BEFORE page shows
// New users: Fade in welcome page
async function checkAuthWithLoadingExperience() {
  const splashOverlay = document.querySelector('.hi-loading-overlay');
  
  try {
    const supa = window.supabaseClient;
    if (!supa) {
      // No Supabase = show welcome page
      if (splashOverlay) splashOverlay.classList.add('hide');
      return;
    }
    
    const { data: { session }, error } = await supa.auth.getSession();
    
    if (error) {
      console.log('Welcome: Auth check error:', error);
      if (splashOverlay) splashOverlay.classList.add('hide');
      return;
    }
    
    if (session) {
      // Returning user - redirect while splash still visible (smooth!)
      console.log('✅ Returning user - redirecting to dashboard');
      sessionStorage.setItem('from-welcome', 'true');
      window.location.replace('./hi-dashboard.html?source=welcome');
    } else {
      // New user - fade out splash, reveal welcome page
      console.log('👋 New user - showing welcome page');
      if (splashOverlay) {
        splashOverlay.classList.add('hide');
        setTimeout(() => splashOverlay.remove(), 300);
      }
    }
  } catch (error) {
    console.log('Welcome: Auth check failed:', error);
    // On error, show welcome page
    if (splashOverlay) splashOverlay.classList.add('hide');
  }
}

// Initialize IMMEDIATELY on load (no delay)
document.addEventListener('DOMContentLoaded', () => {
  checkAuthWithLoadingExperience();
});
