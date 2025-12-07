#!/bin/bash
# Verification script for mobile authentication solution
# Run this after deployment to verify everything is working

echo "🔍 Stay Hi Mobile Auth Verification"
echo "===================================="
echo ""

# 1. Check production config.js
echo "1️⃣  Checking production config.js..."
PROD_CONFIG=$(curl -s https://stay-hi.vercel.app/assets/config.js)

if echo "$PROD_CONFIG" | grep -q "__SUPABASE_URL__"; then
  echo "❌ FAIL: Production still has placeholders!"
  echo "   Build command may not be running on Vercel"
  echo "   Check: vercel.json has 'buildCommand': 'npm run build'"
  exit 1
elif echo "$PROD_CONFIG" | grep -q "https://gfcubvroxgfvjhacinic.supabase.co"; then
  echo "✅ PASS: Production has real Supabase URL"
else
  echo "⚠️  WARNING: Could not verify config"
fi

# 2. Check for ANON_KEY
if echo "$PROD_CONFIG" | grep -q "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"; then
  echo "✅ PASS: Production has real ANON_KEY"
else
  echo "❌ FAIL: ANON_KEY not found in production config"
  exit 1
fi

# 3. Check source code has placeholders
echo ""
echo "2️⃣  Checking source code has placeholders..."
SOURCE_CONFIG=$(cat public/assets/config.js)

if echo "$SOURCE_CONFIG" | grep -q "'__SUPABASE_URL__'"; then
  echo "✅ PASS: Source code has placeholder for URL"
else
  echo "❌ FAIL: Source code has real URL (should be placeholder)"
  echo "   Run: git checkout public/assets/config.js"
  exit 1
fi

if echo "$SOURCE_CONFIG" | grep -q "'__SUPABASE_ANON_KEY__'"; then
  echo "✅ PASS: Source code has placeholder for ANON_KEY"
else
  echo "❌ FAIL: Source code has real ANON_KEY (should be placeholder)"
  exit 1
fi

# 4. Check build script exists
echo ""
echo "3️⃣  Checking build script..."
if [ -f "scripts/inject-config.js" ]; then
  echo "✅ PASS: Build script exists"
else
  echo "❌ FAIL: scripts/inject-config.js not found"
  exit 1
fi

# 5. Check package.json has build command
echo ""
echo "4️⃣  Checking package.json..."
if grep -q '"build": "node scripts/inject-config.js"' package.json; then
  echo "✅ PASS: Build command configured in package.json"
else
  echo "❌ FAIL: Build command not found in package.json"
  exit 1
fi

# 6. Check vercel.json has buildCommand
echo ""
echo "5️⃣  Checking vercel.json..."
if grep -q '"buildCommand"' vercel.json; then
  echo "✅ PASS: buildCommand configured in vercel.json"
else
  echo "❌ FAIL: buildCommand not in vercel.json"
  echo "   Add: \"buildCommand\": \"npm run build\""
  exit 1
fi

# 7. Check Vercel environment variables
echo ""
echo "6️⃣  Checking Vercel environment variables..."
if command -v vercel &> /dev/null; then
  if vercel env ls 2>&1 | grep -q "SUPABASE_URL"; then
    echo "✅ PASS: SUPABASE_URL set in Vercel"
  else
    echo "❌ FAIL: SUPABASE_URL not set in Vercel"
    echo "   Set at: https://vercel.com/joeatang/stay-hi/settings/environment-variables"
    exit 1
  fi
  
  if vercel env ls 2>&1 | grep -q "SUPABASE_ANON_KEY"; then
    echo "✅ PASS: SUPABASE_ANON_KEY set in Vercel"
  else
    echo "❌ FAIL: SUPABASE_ANON_KEY not set in Vercel"
    exit 1
  fi
else
  echo "⚠️  Vercel CLI not found - skipping env var check"
  echo "   Install: npm i -g vercel"
fi

# 8. Test build locally
echo ""
echo "7️⃣  Testing build script locally..."
if SUPABASE_URL="https://gfcubvroxgfvjhacinic.supabase.co" \
   SUPABASE_ANON_KEY="test-key-for-build-verification" \
   npm run build > /tmp/build-test.log 2>&1; then
  
  if grep -q "Successfully injected" /tmp/build-test.log; then
    echo "✅ PASS: Build script runs successfully"
  else
    echo "⚠️  WARNING: Build ran but injection may have failed"
    cat /tmp/build-test.log
  fi
  
  # Restore placeholders after test
  git checkout public/assets/config.js 2>/dev/null
else
  echo "❌ FAIL: Build script failed"
  cat /tmp/build-test.log
  exit 1
fi

echo ""
echo "===================================="
echo "✅ ALL CHECKS PASSED!"
echo ""
echo "🎯 Next Steps:"
echo "1. Wait 2-3 minutes for Vercel deployment to complete"
echo "2. Test sign-in on mobile device: https://stay-hi.vercel.app/signin.html"
echo "3. Check browser console for: '✅ Supabase configuration loaded'"
echo ""
echo "📱 Devices to test:"
echo "   - iPhone (Safari)"
echo "   - iPad (Safari)"  
echo "   - Android phone (Chrome)"
echo "   - Android tablet (Chrome)"
echo ""
echo "If sign-in works on all devices, configuration is correct! ✨"
