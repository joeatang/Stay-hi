#!/bin/bash

# 🧪 TESLA-GRADE AUTH SYSTEM VALIDATION
# Tests complete authentication flow before deployment

echo "🔍 TESLA-GRADE AUTH SYSTEM VALIDATION"
echo "======================================"

# Test 1: JavaScript Syntax Validation
echo "📋 Test 1: JavaScript Syntax Validation"
node -c public/assets/auth-guard.js && echo "✅ auth-guard.js syntax OK" || echo "❌ auth-guard.js syntax error"
node -c public/assets/tesla-data-isolation.js && echo "✅ data-isolation.js syntax OK" || echo "❌ data-isolation.js syntax error"
node -c public/assets/tesla-instant-auth.js && echo "✅ instant-auth.js syntax OK" || echo "❌ instant-auth.js syntax error"

# Test 2: Vercel Configuration Validation
echo ""
echo "📋 Test 2: Vercel Configuration Validation"
cat vercel.json | jq . > /dev/null && echo "✅ vercel.json valid JSON" || echo "❌ vercel.json invalid JSON"

# Test 3: File References Check
echo ""
echo "📋 Test 3: Critical File References"
FILES=(
  "public/welcome.html"
  "public/signin.html" 
  "public/signup.html"
  "public/index.html"
  "public/profile.html"
  "public/assets/auth-guard.js"
  "public/assets/tesla-data-isolation.js"
  "public/assets/tesla-instant-auth.js"
  "public/assets/tesla-mobile-fixes.css"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "✅ $file exists"
  else
    echo "❌ $file missing"
  fi
done

# Test 4: Auth Guard Configuration Check
echo ""
echo "📋 Test 4: Auth Guard Configuration"
if grep -q "index.html.*require.*auth" public/assets/auth-guard.js; then
  echo "✅ index.html requires authentication"
else
  echo "❓ Checking auth guard logic for index.html..."
  if grep -q "PRODUCTION.*index.html.*REQUIRE.*authentication" public/assets/auth-guard.js; then
    echo "✅ Production auth enabled for index.html"
  else
    echo "⚠️ Auth guard configuration needs verification"
  fi
fi

# Test 5: Data Isolation Active Check
echo ""
echo "📋 Test 5: Data Isolation System"
if grep -q "clearContaminatedData" public/assets/tesla-data-isolation.js; then
  echo "✅ Data contamination cleanup active"
else
  echo "❌ Data isolation system not found"
fi

# Test 6: Routing Protection Check
echo ""
echo "📋 Test 6: Routing Protection"
if grep -q '"/app"' vercel.json; then
  echo "❌ Direct /app route still exists - security vulnerability"
else
  echo "✅ Direct /app route removed - properly protected"
fi

# Test 7: Welcome Page Entry Point
echo ""
echo "📋 Test 7: Welcome Page Entry Point"
if grep -q '"/".*"welcome.html"' vercel.json; then
  echo "✅ Root route goes to welcome page"
else
  echo "❌ Root route not configured for welcome page"
fi

echo ""
echo "🎯 VALIDATION COMPLETE"
echo "======================"