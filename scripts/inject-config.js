#!/usr/bin/env node
// Inject Supabase environment variables into config.js at build time
// This makes env vars available to the browser as static values

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// For Vercel builds, output must go to public/ directory (distDir)
const configPath = path.join(__dirname, '../public/assets/config.js');
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

console.log('🔧 [BUILD] Injecting Supabase config into config.js...');
console.log('📍 [BUILD] Config path:', configPath);
console.log('📍 [BUILD] Working directory:', process.cwd());
console.log('🔑 [BUILD] SUPABASE_URL:', SUPABASE_URL ? SUPABASE_URL.substring(0, 40) + '...' : 'NOT SET');
console.log('🔑 [BUILD] SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? 'SET (length: ' + SUPABASE_ANON_KEY.length + ')' : 'NOT SET');

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ [BUILD] CRITICAL: Environment variables not set in Vercel!');
  console.error('    SUPABASE_URL:', SUPABASE_URL ? 'SET' : 'MISSING');
  console.error('    SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? 'SET' : 'MISSING');
  console.error('    Check Vercel dashboard → Settings → Environment Variables');
  console.error('    Required for production builds!');
  console.error('');
  console.error('    For local dev: this is expected, use config-local.js instead');
  
  // Check if this is a Vercel build (CI environment)
  if (process.env.VERCEL || process.env.CI) {
    console.error('');
    console.error('🚨 FAILING BUILD: This is a production build and env vars are required!');
    process.exit(1);  // Fail the build on Vercel if env vars missing
  }
  
  console.warn('    Exiting with success for local dev build...');
  process.exit(0);
}

try {
  let content = fs.readFileSync(configPath, 'utf8');
  
  // Replace placeholders with actual values
  content = content.replace(/'__SUPABASE_URL__'/g, `'${SUPABASE_URL}'`);
  content = content.replace(/'__SUPABASE_ANON_KEY__'/g, `'${SUPABASE_ANON_KEY}'`);
  
  fs.writeFileSync(configPath, content, 'utf8');
  
  console.log('✅ [BUILD] Successfully injected config into config.js');
} catch (error) {
  console.error('❌ [BUILD] Failed to inject config:', error.message);
  process.exit(1);
}
