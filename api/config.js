// Serverless function to expose environment variables to the browser
// Vercel automatically creates API routes from files in /api/

export default function handler(req, res) {
  // Set CORS headers to allow requests from our domain
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  // Return Supabase config from environment variables
  res.status(200).json({
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
    ready: !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY)
  });
}
