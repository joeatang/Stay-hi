# 🚨 CRITICAL: Vercel Environment Variables Missing

## The Problem
- `config-local.js` is gitignored (not deployed to production)
- Desktop works because you're testing on `localhost:3030` which has `config-local.js`
- Mobile fails because `stay-hi.vercel.app` doesn't have the config file
- `config.js` fallback needs Vercel environment variables that aren't set

## The Solution

### Option 1: Vercel Dashboard (RECOMMENDED - 2 minutes)
1. Go to https://vercel.com/joeatang/stay-hi/settings/environment-variables
2. Add these two variables:

**SUPABASE_URL**
```
https://gfcubvroxgfvjhacinic.supabase.co
```

**SUPABASE_ANON_KEY**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmY3VidnJveGdmdmpoYWNpbmljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MTIyNjYsImV4cCI6MjA3NDQ4ODI2Nn0.5IlxofMPFNdKsEueM_dhgsJP9wI-GnZRUM9hfR0zE1g
```

3. Set both to: **Production, Preview, and Development**
4. Click **Save**
5. Go to **Deployments** → Click **...** on latest → **Redeploy**

### Option 2: Vercel CLI (if installed)
```bash
vercel env add SUPABASE_URL
# Paste: https://gfcubvroxgfvjhacinic.supabase.co
# Select: Production, Preview, Development

vercel env add SUPABASE_ANON_KEY  
# Paste: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmY3VidnJveGdmdmpoYWNpbmljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MTIyNjYsImV4cCI6MjA3NDQ4ODI2Nn0.5IlxofMPFNdKsEueM_dhgsJP9wI-GnZRUM9hfR0zE1g
# Select: Production, Preview, Development

# Redeploy
vercel --prod
```

## Why This Happens
```
Desktop (localhost:3030):
├── config-local.js ✅ (exists locally, has credentials)
└── Sign-in works!

Mobile (stay-hi.vercel.app):
├── config-local.js ❌ (gitignored, not deployed)
├── config.js tries to load
├── process.env.SUPABASE_URL ❌ (not set in Vercel)
└── Error: "Missing Supabase configuration"
```

## After Adding Variables
The next deployment will inject these into `config.js` and mobile will work!

---
**Time to Fix:** 2-3 minutes in Vercel dashboard
**Impact:** Mobile sign-in will work immediately after redeploy
