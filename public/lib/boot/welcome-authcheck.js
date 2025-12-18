// � SMOOTH AUTH CHECK - Invisible to user
// Returning users: Redirect BEFORE page shows
// New users: Fade in welcome page
async function checkAuthWithLoadingExperience() {
  try {
    const supa = window.supabaseClient;
    if (!supa) {
      // No Supabase = show welcome page
      document.body.classList.add('ready');
      return;
    }
    
    const { data: { session }, error } = await supa.auth.getSession();
    
    if (error) {
      console.log('Welcome: Auth check error:', error);
      document.body.classList.add('ready');
      return;
    }
    
    if (session) {
      // Returning user - redirect IMMEDIATELY (page still invisible)
      console.log('✅ Returning user - redirecting to dashboard');
      sessionStorage.setItem('from-welcome', 'true');
      window.location.replace('./hi-dashboard.html?source=welcome');
    } else {
      // New user - fade in welcome page
      console.log('👋 New user - showing welcome page');
      document.body.classList.add('ready');
    }
  } catch (error) {
    console.log('Welcome: Auth check failed:', error);
    // On error, show welcome page
    document.body.classList.add('ready');
  }
}

// Initialize IMMEDIATELY on load (no delay)
document.addEventListener('DOMContentLoaded', () => {
  checkAuthWithLoadingExperience();
});
