// Serverless function to expose environment variables to the browser
// Vercel API route: https://stay-hi.vercel.app/api/config

module.exports = (req, res) => {
  // Set CORS headers to allow requests from any origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Return Supabase config from environment variables
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
  
  res.status(200).json({
    supabaseUrl,
    supabaseAnonKey,
    ready: !!(supabaseUrl && supabaseAnonKey)
  });
};
