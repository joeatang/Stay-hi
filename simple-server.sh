#!/bin/bash

# Simple persistent server for Stay-Hi
cd /Users/joeatang/Documents/GitHub/Stay-hi/public

# Kill any existing servers quietly
lsof -ti:3002 | xargs kill -9 2>/dev/null || true
sleep 1

echo "🚀 Starting Stay-Hi server on http://localhost:3002"
echo "📄 Pages available:"
echo "   • http://localhost:3002/profile.html"
echo "   • http://localhost:3002/profile-working.html"
echo "   • http://localhost:3002/hi-island-NEW.html"
echo ""

# Start server with minimal logging
exec python3 -m http.server 3002