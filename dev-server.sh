#!/bin/bash

# Stay Hi - Tesla Grade Development Server
# Gold Standard Local Development Environment
# Author: GitHub Copilot
# Date: October 28, 2025

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="/Users/joeatang/Documents/GitHub/Stay-hi"
PUBLIC_DIR="${PROJECT_ROOT}/public"
PORT=3000
PYTHON_PATH="/usr/bin/python3"  # Apple's signed Python
LOG_FILE="${PUBLIC_DIR}/server.log"

echo -e "${BLUE}🚀 Stay Hi Tesla Grade Development Server${NC}"
echo -e "${BLUE}===========================================${NC}"

# Validate environment
echo -e "${YELLOW}🔍 Validating environment...${NC}"

# Check if project directory exists
if [ ! -d "$PROJECT_ROOT" ]; then
    echo -e "${RED}❌ Project root not found: $PROJECT_ROOT${NC}"
    exit 1
fi

# Check if public directory exists
if [ ! -d "$PUBLIC_DIR" ]; then
    echo -e "${RED}❌ Public directory not found: $PUBLIC_DIR${NC}"
    exit 1
fi

# Check if index.html exists
if [ ! -f "$PUBLIC_DIR/index.html" ]; then
    echo -e "${RED}❌ index.html not found in: $PUBLIC_DIR${NC}"
    exit 1
fi

# Check Python installation
if [ ! -x "$PYTHON_PATH" ]; then
    echo -e "${RED}❌ Python not found at: $PYTHON_PATH${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Environment validation complete${NC}"

# Kill any existing servers
echo -e "${YELLOW}🧹 Cleaning up existing servers...${NC}"
lsof -ti:$PORT | xargs kill -9 2>/dev/null || true
pkill -f "python.*http.server" 2>/dev/null || true
echo -e "${GREEN}✅ Cleanup complete${NC}"

# Navigate to public directory
cd "$PUBLIC_DIR"
echo -e "${YELLOW}📂 Working directory: $(pwd)${NC}"

# Start server
echo -e "${YELLOW}🌟 Starting Tesla Grade server on port $PORT...${NC}"
echo -e "${BLUE}   Server URL: http://127.0.0.1:$PORT${NC}"
echo -e "${BLUE}   Log file: $LOG_FILE${NC}"

# Create log file
touch "$LOG_FILE"

# Start server with proper logging
nohup "$PYTHON_PATH" -m http.server $PORT > "$LOG_FILE" 2>&1 &
SERVER_PID=$!

# Wait for server to start
sleep 2

# Test server
if curl -s -f http://127.0.0.1:$PORT/index.html > /dev/null; then
    echo -e "${GREEN}🎉 Server started successfully!${NC}"
    echo -e "${GREEN}   PID: $SERVER_PID${NC}"
    echo -e "${GREEN}   Status: RUNNING${NC}"
    echo -e "${BLUE}   Access your app: http://127.0.0.1:$PORT${NC}"
else
    echo -e "${RED}❌ Server failed to start properly${NC}"
    exit 1
fi

# Save PID for easy management
echo "$SERVER_PID" > "${PROJECT_ROOT}/.server.pid"

echo -e "${BLUE}===========================================${NC}"
echo -e "${GREEN}🏆 Tesla Grade Development Environment Ready${NC}"
echo -e "${BLUE}===========================================${NC}"
echo -e "${YELLOW}💡 Management Commands:${NC}"
echo -e "   Stop server: kill \$(cat ${PROJECT_ROOT}/.server.pid)"
echo -e "   View logs: tail -f $LOG_FILE"
echo -e "   Server status: lsof -i :$PORT"