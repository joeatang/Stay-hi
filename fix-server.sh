#!/bin/bash
# Stay Hi Server Fix - Bulletproof Server Management

echo "🔧 Stay Hi Server Fix Tool"
echo "=========================="

# Kill ALL Python HTTP servers
echo "🔪 Killing all Python HTTP servers..."
pkill -f "python.*http.server" 2>/dev/null
pkill -f "Python.*http.server" 2>/dev/null
sleep 2

# Check for any remaining processes
REMAINING=$(ps aux | grep -E "python.*http|Python.*http" | grep -v grep | wc -l)
if [ $REMAINING -gt 0 ]; then
    echo "⚠️  Found $REMAINING remaining processes, force killing..."
    ps aux | grep -E "python.*http|Python.*http" | grep -v grep | awk '{print $2}' | xargs kill -9 2>/dev/null
    sleep 2
fi

# Navigate to correct directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PUBLIC_DIR="$SCRIPT_DIR/public"

echo "📂 Navigating to: $PUBLIC_DIR"
cd "$PUBLIC_DIR"

# Verify we're in the right place
PWD_CHECK=$(pwd)
echo "✅ Current directory: $PWD_CHECK"

if [ ! -f "index.html" ]; then
    echo "❌ ERROR: Not in the right directory! index.html not found."
    echo "Expected: $PUBLIC_DIR"
    echo "Actual: $PWD_CHECK"
    exit 1
fi

# Start server on a clean port
echo "🚀 Starting server on port 3000..."
echo "🌐 Access your app at: http://127.0.0.1:3000/"
echo "⚡ Press Ctrl+C to stop"
echo ""

python3 -m http.server 3000