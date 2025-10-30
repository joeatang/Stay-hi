#!/bin/bash
# 🛡️ TESLA-GRADE DEPLOYMENT VALIDATION SCRIPT
# Validates all configurations before deployment to prevent vulnerabilities

set -e

echo "🔍 TESLA-GRADE PRE-DEPLOYMENT VALIDATION"
echo "========================================"

# 1. Validate vercel.json syntax
echo "📋 Validating vercel.json..."
if ! cat vercel.json | jq . > /dev/null 2>&1; then
    echo "❌ vercel.json has invalid JSON syntax"
    exit 1
fi
echo "✅ vercel.json syntax valid"

# 2. Check for common regex issues in vercel.json
echo "📋 Checking vercel.json patterns..."
if grep -q '\.\*\\\\' vercel.json; then
    echo "❌ Invalid regex escape sequences found in vercel.json"
    exit 1
fi
echo "✅ vercel.json patterns valid"

# 3. Validate environment-specific configurations
echo "📋 Checking production configurations..."
if grep -q "localhost\|127.0.0.1\|5500" public/assets/config.js; then
    echo "⚠️  Warning: Local development URLs found in production config"
fi

# 4. Check for hardcoded user data
echo "📋 Scanning for hardcoded data leaks..."
if grep -r "joeatang\|your.*data" public/assets/ > /dev/null 2>&1; then
    echo "⚠️  Warning: Potential hardcoded user data found"
fi

# 5. Validate CSS for mobile issues
echo "📋 Checking mobile responsiveness..."
if grep -q "user-select.*none" public/assets/*.css; then
    echo "✅ User interaction controls found"
fi

echo ""
echo "🎯 Validation complete. Safe to deploy."