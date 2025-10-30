#!/bin/bash

# Tesla-Grade Server Manager
# Handles server lifecycle robustly

PORT=${1:-3001}
PROJECT_DIR="/Users/joeatang/Documents/GitHub/Stay-hi/public"

echo "🚀 Tesla-Grade Server Manager"
echo "================================"

# Function to kill existing servers on port
kill_existing_server() {
    local port=$1
    echo "🔍 Checking for existing servers on port $port..."
    
    # Kill any existing Python servers on this port
    lsof -ti:$port | xargs -r kill -9 2>/dev/null
    
    # Kill any processes using this port
    pkill -f "python.*http.server.*$port" 2>/dev/null
    pkill -f "Python.*http.server.*$port" 2>/dev/null
    
    # Wait a moment for cleanup
    sleep 1
    
    # Check if port is still in use
    if lsof -i:$port >/dev/null 2>&1; then
        echo "⚠️  Port $port still in use, trying alternative ports..."
        return 1
    else
        echo "✅ Port $port is clear"
        return 0
    fi
}

# Function to find available port
find_available_port() {
    local start_port=$1
    local port=$start_port
    
    while [ $port -lt $((start_port + 50)) ]; do
        if ! lsof -i:$port >/dev/null 2>&1; then
            echo $port
            return 0
        fi
        port=$((port + 1))
    done
    
    echo "3333" # Fallback port
    return 1
}

# Main server startup
start_server() {
    local port=$1
    
    echo "📁 Server directory: $PROJECT_DIR"
    echo "🌐 Target port: $port"
    
    # Change to project directory
    if [ ! -d "$PROJECT_DIR" ]; then
        echo "❌ Directory not found: $PROJECT_DIR"
        exit 1
    fi
    
    cd "$PROJECT_DIR"
    
    # Try to kill existing server
    if ! kill_existing_server $port; then
        # Find alternative port
        port=$(find_available_port $port)
        echo "🔄 Using alternative port: $port"
    fi
    
    echo "🚀 Starting server on port $port..."
    echo "🌐 URL: http://localhost:$port"
    echo "📄 Available pages:"
    echo "   • http://localhost:$port/profile.html"
    echo "   • http://localhost:$port/profile-working.html"
    echo "   • http://localhost:$port/profile-debug.html"
    echo "   • http://localhost:$port/hi-island-NEW.html"
    echo ""
    echo "🛑 Press Ctrl+C to stop server"
    echo "================================"
    
    # Start server with better error handling
    trap 'echo "🛑 Server stopped"; exit 0' INT
    
    # Try Python 3 first
    if command -v python3 >/dev/null 2>&1; then
        python3 -m http.server $port 2>&1 | while IFS= read -r line; do
            # Filter out excessive log noise
            if [[ "$line" == *"GET"* ]] && [[ "$line" == *"200"* ]]; then
                echo "✅ $line"
            elif [[ "$line" == *"Serving HTTP"* ]]; then
                echo "🌐 $line"
            elif [[ "$line" == *"ERROR"* ]] || [[ "$line" == *"404"* ]] || [[ "$line" == *"500"* ]]; then
                echo "❌ $line"
            else
                echo "$line"
            fi
        done
    else
        echo "❌ Python 3 not found"
        exit 1
    fi
}

# Handle command line arguments
case "${1:-start}" in
    "start"|"")
        start_server ${2:-3001}
        ;;
    "stop")
        echo "🛑 Stopping all Stay-Hi servers..."
        pkill -f "python.*http.server" 2>/dev/null
        pkill -f "Python.*http.server" 2>/dev/null
        lsof -ti:3000,3001,8000 | xargs -r kill -9 2>/dev/null
        echo "✅ All servers stopped"
        ;;
    "status")
        echo "🔍 Server Status:"
        lsof -i :3000 -i :3001 -i :8000 2>/dev/null || echo "No servers running on common ports"
        ;;
    "restart")
        $0 stop
        sleep 2
        $0 start ${2:-3001}
        ;;
    *)
        echo "Usage: $0 {start|stop|status|restart} [port]"
        echo "Default port: 3001"
        exit 1
        ;;
esac