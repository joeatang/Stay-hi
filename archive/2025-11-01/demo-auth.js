/**
 * Demo Mode Authentication
 * Creates a persistent demo session for development/testing
 * This allows profile updates without requiring actual Supabase auth
 */

(async function() {
  console.log('🔐 Initializing Demo Auth...');
  
  // Wait for Supabase to be ready
  await new Promise(resolve => {
    if (window.supabaseClient) {
      resolve();
    } else {
      window.addEventListener('supabase-ready', resolve);
    }
  });
  
  try {
    // Check if already authenticated
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    
    if (user) {
      console.log('✅ Already authenticated:', user.id);
      return;
    }
    
    // Check for demo session in localStorage
    const demoSession = localStorage.getItem('stayhi_demo_session');
    
    if (demoSession) {
      console.log('📦 Found existing demo session');
      const session = JSON.parse(demoSession);
      
      // Verify session is still valid
      const { data: { user: existingUser } } = await window.supabaseClient.auth.getUser();
      if (existingUser) {
        console.log('✅ Demo session valid:', existingUser.id);
        return;
      }
    }
    
    // Create new demo user
    console.log('🆕 Creating demo user account...');
    
    const demoEmail = `demo_${Date.now()}@stayhi.local`;
    const demoPassword = 'Demo123!@#Password';
    
    const { data, error } = await window.supabaseClient.auth.signUp({
      email: demoEmail,
      password: demoPassword,
      options: {
        data: {
          display_name: 'Demo User',
          username: 'demo_user'
        }
      }
    });
    
    if (error) {
      console.warn('⚠️ Demo signup failed:', error.message);
      
      // Try signing in instead (maybe already exists)
      const { data: signInData, error: signInError } = await window.supabaseClient.auth.signInWithPassword({
        email: demoEmail,
        password: demoPassword
      });
      
      if (signInError) {
        console.error('❌ Demo auth failed completely:', signInError);
        return;
      }
      
      if (signInData?.session) {
        localStorage.setItem('stayhi_demo_session', JSON.stringify(signInData.session));
        console.log('✅ Demo user signed in:', signInData.user?.id);
        window.location.reload();
      }
      return;
    }
    
    if (data?.session) {
      localStorage.setItem('stayhi_demo_session', JSON.stringify(data.session));
      console.log('✅ Demo user created:', data.user?.id);
      console.log('🔄 Reloading to apply session...');
      
      // Reload page to apply new session
      setTimeout(() => window.location.reload(), 1000);
    }
    
  } catch (error) {
    console.error('❌ Demo auth error:', error);
  }
})();
