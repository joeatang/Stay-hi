const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://gfcubvroxgfvjhacinic.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmY3VidnJveGdmdmpoYWNpbmljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODkxMjI2NiwiZXhwIjoyMDc0NDg4MjY2fQ.44tm7g1OdioyN4EFk7LspWGOwpqQXzYcSLxONeL8iLk'
);
(async () => {
  console.log('🔍 Testing get_share_wave_count RPC...\n');
  
  const { data: shares } = await supabase
    .from('public_shares')
    .select('id')
    .limit(1);
  
  if (!shares || shares.length === 0) {
    console.log('No shares found');
    return;
  }
  
  const shareId = shares[0].id;
  console.log('Testing with share ID:', shareId.substring(0, 8));
  
  const { data, error } = await supabase.rpc('get_share_wave_count', { p_share_id: shareId });
  
  if (error) {
    console.log('❌ RPC DOES NOT EXIST:', error.message);
    console.log('\nThis is why first share loses count on navigation!');
    console.log('The async RPC call fails silently and may clear button text.');
  } else {
    console.log('✅ RPC exists, returned:', data);
  }
})();
