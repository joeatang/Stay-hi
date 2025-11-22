// 🎬 SIMPLE AUTH CHECK (No Loading Screen Conflicts)
// Redirect authenticated users without fancy loading experience
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
      console.log('Welcome: User authenticated - redirecting to dashboard');
      sessionStorage.setItem('from-welcome', 'true');
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
