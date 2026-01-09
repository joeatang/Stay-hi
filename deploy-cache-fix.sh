#!/bin/bash
# 🚀 One-Command Deploy: Cache-Busting Fix
# Run this: bash deploy-cache-fix.sh

set -e  # Exit on any error

echo "🎯 Starting deployment..."

# Stage files
git add public/hi-dashboard.html public/hi-island-NEW.html public/hi-muscle.html public/profile.html

# Show what's being deployed
echo ""
echo "📦 Files staged for deployment:"
git diff --cached --name-only

# Commit
git commit -m "Fix: Complete CACHE_VERSION implementation for all pages"

# Push
echo ""
echo "🚀 Pushing to GitHub..."
git push origin main

echo ""
echo "✅ DEPLOYMENT COMPLETE!"
echo ""
echo "⏳ Wait 1-2 minutes for Vercel to deploy, then:"
echo "   1. Visit: https://stay-hi.vercel.app/hi-dashboard.html"
echo "   2. Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)"
echo "   3. Check console for: 🎯 [Universal Tier Listener] Loading..."
echo ""
