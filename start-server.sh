#!/bin/bash
# Stay Hi Development Server Launcher
# This script ensures the server ALWAYS starts from the correct directory

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Stay Hi Development Server${NC}"
echo -e "${BLUE}================================${NC}"

# Kill any existing server on port 3000
echo -e "${YELLOW}🔍 Checking for existing server on port 3000...${NC}"
if lsof -ti:3000 >/dev/null 2>&1; then
    echo -e "${RED}❌ Killing existing server on port 3000${NC}"
    lsof -ti:3000 | xargs kill -9
    sleep 2
fi

# Get the absolute path to the Stay-hi directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PUBLIC_DIR="$SCRIPT_DIR/public"

# Verify the public directory exists
if [ ! -d "$PUBLIC_DIR" ]; then
    echo -e "${RED}❌ Error: Public directory not found at $PUBLIC_DIR${NC}"
    exit 1
fi

# Verify key files exist
if [ ! -f "$PUBLIC_DIR/index.html" ]; then
    echo -e "${RED}❌ Error: index.html not found in $PUBLIC_DIR${NC}"
    exit 1
fi

if [ ! -f "$PUBLIC_DIR/hi-dashboard.html" ]; then
    echo -e "${RED}❌ Error: hi-dashboard.html not found in $PUBLIC_DIR${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Public directory verified: $PUBLIC_DIR${NC}"
echo -e "${GREEN}✅ Key files found: index.html, hi-dashboard.html${NC}"

# Change to public directory
cd "$PUBLIC_DIR"

# Verify we're in the right place
echo -e "${BLUE}📂 Current directory: $(pwd)${NC}"
echo -e "${BLUE}📋 Files available:${NC}"
ls -la *.html | head -5

# Start the server
echo -e "${GREEN}🌟 Starting Tesla-Grade Hi Server on port 3000...${NC}"
echo -e "${BLUE}🔗 Server URL: http://localhost:3000${NC}"
echo -e "${BLUE}🚀 Hi Dashboard: http://localhost:3000/hi-dashboard.html${NC}"
echo -e "${BLUE}👋 Welcome Page: http://localhost:3000/welcome.html${NC}"
echo -e "${BLUE}🏝️ Hi Island: http://localhost:3000/hi-island-NEW.html${NC}"
echo -e "${YELLOW}⚠️  Press Ctrl+C to stop the server${NC}"
echo ""

# Start Python server
python3 -m http.server 3000