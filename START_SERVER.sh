#!/bin/bash
# Stay-Hi Profile System Server Startup Script
# Tesla-Grade Profile System Ready for Testing
# Created: October 29, 2025

echo "🚀 Starting Stay-Hi Profile System Server..."
echo "📁 Directory: /Users/joeatang/Documents/GitHub/Stay-hi/public"
echo "🌐 Port: 6666 (stable port, avoids conflicts)"
echo "🔗 Profile URL: http://localhost:6666/profile.html"
echo ""

# Kill any existing servers on port 6666
lsof -ti:6666 | xargs kill -9 2>/dev/null || true

# Navigate to public directory
cd /Users/joeatang/Documents/GitHub/Stay-hi/public

# Verify files exist
if [ ! -f "profile.html" ]; then
    echo "❌ ERROR: profile.html not found in current directory"
    pwd
    ls -la profile*.html
    exit 1
fi

echo "✅ Files verified. Starting server..."
echo "🛑 Press Ctrl+C to stop server"
echo "=================================================="

# Start server
python3 -m http.server 6666