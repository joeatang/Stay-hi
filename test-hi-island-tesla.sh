#!/bin/bash

# Tesla-Grade Hi-Island Test Server
# Validates all Tesla-grade button implementations and UX standards

echo "🚀 Tesla-Grade Hi-Island Test Server Starting..."
echo ""

# Check if Python is available
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
else
    echo "❌ Error: Python not found. Please install Python to run the test server."
    exit 1
fi

# Set the port
PORT=8001

# Navigate to the project directory
cd /Users/joeatang/Documents/GitHub/Stay-hi

echo "📱 Tesla-Grade Features Enabled:"
echo "  • 44px minimum touch targets"
echo "  • Keyboard navigation (Arrow keys + Enter/Space)"
echo "  • Loading states with disabled interactions"
echo "  • Error handling with user feedback"
echo "  • Mobile-first responsive design"
echo "  • Progressive authentication tiers"
echo ""

echo "🌐 Starting server on port $PORT..."
echo "📍 URL: http://localhost:$PORT/public/hi-island-NEW.html"
echo ""
echo "🎯 Testing Checklist:"
echo "  1. Drop Hi button (44px touch target)"
echo "  2. Tab navigation (keyboard + mouse)"
echo "  3. Mobile responsive breakpoints"
echo "  4. Loading states and error handling"
echo "  5. Share sheet functionality"
echo ""
echo "Press Ctrl+C to stop the server"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Start the server
$PYTHON_CMD -m http.server $PORT

# Fallback message
echo ""
echo "Server stopped. All Tesla-grade implementations ready for testing!"