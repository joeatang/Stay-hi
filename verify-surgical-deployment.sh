#!/bin/bash

# 🚀 SURGICAL MEDALLION SYSTEM - PRE-DEPLOYMENT VERIFICATION
# Tesla-Grade verification before deploying the surgical system

echo "🎯 SURGICAL DEPLOYMENT VERIFICATION"
echo "=================================="

# Check critical files exist
CRITICAL_FILES=(
    "public/hi-dashboard.html"
    "public/welcome.html"
    "public/assets/hi-unified-global-stats.js"
    "public/assets/hi-anonymous-onboarding.js"
    "public/assets/supabase-init.js"
    "public/index.html"
    "SURGICAL_SYSTEM_ARCHITECTURE.md"
)

echo "🔍 Checking critical files..."
for file in "${CRITICAL_FILES[@]}"; do
    if [[ -f "$file" ]]; then
        echo "✅ $file"
    else
        echo "❌ $file - MISSING!"
        exit 1
    fi
done

# Check for unified Supabase URLs
echo ""
echo "🔍 Checking Supabase URL consistency..."
OLD_URL_COUNT=$(grep -r "cnqonwsijqzdqahheesx.supabase.co" public/ 2>/dev/null | wc -l)
NEW_URL_COUNT=$(grep -r "gfcubvroxgfvjhacinic.supabase.co" public/ 2>/dev/null | wc -l)

if [[ $OLD_URL_COUNT -gt 0 ]]; then
    echo "⚠️  Found $OLD_URL_COUNT instances of old Supabase URL - this could cause SSL errors"
    echo "   Run: grep -r 'cnqonwsijqzdqahheesx.supabase.co' public/"
else
    echo "✅ No old Supabase URLs found"
fi

echo "✅ Found $NEW_URL_COUNT instances of unified Supabase URL"

# Check JavaScript syntax (basic)
echo ""
echo "🔍 Checking for JavaScript export errors..."
EXPORT_ERRORS=$(grep -r "^export " public/assets/ 2>/dev/null | wc -l)
if [[ $EXPORT_ERRORS -gt 0 ]]; then
    echo "⚠️  Found $EXPORT_ERRORS potential ES6 export issues"
    grep -r "^export " public/assets/
else
    echo "✅ No ES6 export issues found"
fi

# Check medallion system integration
echo ""
echo "🔍 Checking medallion system integration..."
if grep -q "trackMedallionTap" public/hi-dashboard.html && grep -q "trackMedallionTap" public/assets/hi-unified-global-stats.js; then
    echo "✅ Surgical medallion tracking system integrated"
else
    echo "❌ Medallion tracking system not properly integrated"
    exit 1
fi

# Check onboarding system
echo ""
echo "🔍 Checking elite onboarding system..."
if grep -q "hi-anonymous-onboarding.js" public/welcome.html; then
    echo "✅ Elite onboarding system loaded in welcome.html"
else
    echo "❌ Onboarding system not loaded in welcome.html"
    exit 1
fi

# Check routing system
echo ""
echo "🔍 Checking main page routing..."
if grep -q "TESLA-GRADE ROUTING" public/index.html; then
    echo "✅ Tesla-grade routing system in place"
else
    echo "❌ Main page routing system missing"
    exit 1
fi

echo ""
echo "🎯 SURGICAL SYSTEM VERIFICATION COMPLETE!"
echo "✅ All systems ready for deployment"
echo ""
echo "Deploy with: ./deploy-to-vercel.sh"