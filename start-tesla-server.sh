#!/bin/bash

# 🚀 Tesla-Grade Server Startup Script
# Always starts from the correct directory, no matter where you run it from

echo "🔧 Tesla Server Starting..."

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PUBLIC_DIR="$SCRIPT_DIR/public"

echo "📁 Script location: $SCRIPT_DIR"
echo "📁 Public directory: $PUBLIC_DIR"

# Kill any existing servers on common ports
echo "🛑 Stopping existing servers..."
for port in 8200 8201 8202 8203 8204 8205 8206; do
    if lsof -ti:$port > /dev/null 2>&1; then
        echo "   Killing server on port $port"
        kill $(lsof -ti:$port) 2>/dev/null || true
    fi
done

# Verify public directory exists
if [ ! -d "$PUBLIC_DIR" ]; then
    echo "❌ Error: Public directory not found at $PUBLIC_DIR"
    exit 1
fi

# Verify key files exist
if [ ! -f "$PUBLIC_DIR/82815_stayhi_index.html" ]; then
    echo "❌ Error: Dashboard file not found"
    exit 1
fi

if [ ! -f "$PUBLIC_DIR/tesla-wozniak-diagnostic.html" ]; then
    echo "❌ Error: Diagnostic file not found"
    exit 1
fi

echo "✅ All files verified"

# Change to public directory
cd "$PUBLIC_DIR" || {
    echo "❌ Error: Could not change to public directory"
    exit 1
}

echo "📍 Current directory: $(pwd)"
echo "📋 Key files:"
ls -la 82815_stayhi_index.html tesla-wozniak-diagnostic.html 2>/dev/null || echo "   Files not found!"

# Start the server
echo ""
echo "🚀 Starting Tesla Server on port 8205..."
echo "🌐 Dashboard: http://localhost:8205/82815_stayhi_index.html"
echo "🔬 Diagnostic: http://localhost:8205/tesla-wozniak-diagnostic.html"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

python3 -m http.server 8205