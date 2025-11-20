(function(){
  async function getClient(){
    if(!window.supabaseClient){ throw new Error('Supabase client not ready'); }
    return window.supabaseClient;
  }
  async function getBalance(){
    const client = await getClient();
    const { data: userData } = await client.auth.getUser();
    const uid = userData?.user?.id; if(!uid) return { balance: 0 };
    const { data, error } = await client.from('hi_points').select('balance').eq('user_id', uid).maybeSingle();
    if(error){ throw new Error(error.message); }
    return { balance: data?.balance || 0 };
  }
  async function getLedger(limit=20){
    const client = await getClient();
    const { data: userData } = await client.auth.getUser();
    const uid = userData?.user?.id; if(!uid) return [];
    const { data, error } = await client.from('hi_points_ledger').select('*').eq('user_id', uid).order('ts', { ascending: false }).limit(limit);
    if(error){ throw new Error(error.message); }
    return data || [];
  }
  window.HiPoints = { getBalance, getLedger };
  document.dispatchEvent(new CustomEvent('hi:points-ready'));
})();
