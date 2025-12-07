#!/usr/bin/env node
// Inject Supabase environment variables into config.js at build time
// This makes env vars available to the browser as static values

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.join(__dirname, '../public/assets/config.js');
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

console.log('🔧 [BUILD] Injecting Supabase config into config.js...');
console.log('📍 [BUILD] Config path:', configPath);
console.log('🔑 [BUILD] SUPABASE_URL:', SUPABASE_URL ? SUPABASE_URL.substring(0, 40) + '...' : 'NOT SET');
console.log('🔑 [BUILD] SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? 'SET (length: ' + SUPABASE_ANON_KEY.length + ')' : 'NOT SET');

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('⚠️  [BUILD] WARNING: Environment variables not set!');
  console.warn('    Local development should use config-local.js');
  console.warn('    Production builds require SUPABASE_URL and SUPABASE_ANON_KEY in Vercel');
  // Don't fail - local dev will use config-local.js
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
