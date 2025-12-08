// Serverless function to expose environment variables to the browser
// Vercel API route: https://stay-hi.vercel.app/api/config

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Return Supabase config from environment variables
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
  
  return res.status(200).json({
    supabaseUrl,
    supabaseAnonKey,
    ready: !!(supabaseUrl && supabaseAnonKey)
  });
}
