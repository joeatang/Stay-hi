// ProfileMerge - Seamless transition from anonymous demo profile to authenticated profile
// Woz-grade principle: user never loses edits made before sign-up.
(function(){
  const MERGE_FLAG = '__hiProfileMerged';
  function log(...a){ try{ console.log('[ProfileMerge]', ...a); }catch(_){} }
  function safeGet(key){ try{ return JSON.parse(localStorage.getItem(key)||'null'); }catch(_){ return null; } }
  function safeSet(key,val){ try{ localStorage.setItem(key, JSON.stringify(val)); }catch(_){} }
  function getSessionUser(){
    try{
      const client = window.supabaseClient || window.sb || window.HiSupabase?.client || window.getSupabase?.();
      if(!client?.auth) return null;
      const s = client.auth.getSession?.();
      if (s && typeof s.then === 'function') {
        // async promise path (v2/v3 client)
        return null; // will be handled after auth-ready event
      }
    }catch(_){ }
    return null;
  }
  function mergeProfiles(authDetail){
    if (sessionStorage.getItem(MERGE_FLAG)==='1'){ return; }
    const userId = authDetail?.session?.user?.id;
    if(!userId){ return; }
    const demo = safeGet('stayhi_profile_demo');
    const existing = safeGet(`stayhi_profile_${userId}`);
    if(!demo){ log('No demo profile to merge'); return; }
    // Build merged profile prioritizing authenticated existing values
    const merged = Object.assign({}, demo, existing || {});
    // Prefer existing values; only fill blanks from demo
    ['display_name','username','bio','location','avatar_url'].forEach(k=>{
      if((!existing || !existing[k] || existing[k].length===0) && demo[k]){
        merged[k] = demo[k];
      }
    });
    merged.id = userId;
    merged.is_demo = false;
    merged.merged_at = new Date().toISOString();
    safeSet(`stayhi_profile_${userId}`, merged);
    // Attempt Supabase upsert if available
    try{
      const client = window.supabaseClient || window.sb;
      if(client){
        client.from('profiles').upsert({
          user_id: userId,
          username: merged.username?.replace('@','') || `user_${userId.slice(-6)}`,
          display_name: merged.display_name || merged.username || 'Stay Hi User',
          bio: merged.bio || '',
          location: merged.location || '',
          avatar_url: merged.avatar_url || '',
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' }).then(()=>{
          log('Supabase profile upsert after merge complete');
        }).catch(err=> log('Supabase upsert error', err.message));
      }
    }catch(e){ log('Supabase merge upsert failed', e.message); }
    sessionStorage.setItem(MERGE_FLAG,'1');
    window.dispatchEvent(new CustomEvent('hi:profile-merged', { detail:{ userId, merged } }));
    if (merged.avatar_url) {
      // Emit avatar-precache event for service worker / precache system
      window.dispatchEvent(new CustomEvent('hi:avatar-precache', { detail: { userId, avatarUrl: merged.avatar_url } }));
    }
    log('Merged anonymous demo profile into authenticated profile.', { userId, fields: Object.keys(merged) });
  }
  window.addEventListener('hi:auth-ready', (e)=>{
    try { if(e.detail?.session?.user){ mergeProfiles(e.detail); } } catch(_){ }
  });
})();
