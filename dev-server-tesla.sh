#!/bin/bash

# 🚀 Tesla-Grade Stay Hi Development Server
# Solves: Directory persistence, consistent environment, bulletproof startup

set -e  # Exit on any error

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PUBLIC_DIR="${PROJECT_ROOT}/public"
DEFAULT_PORT=8099

# Logging
log() {
    echo "🚀 [$(date '+%H:%M:%S')] $1"
}

error() {
    echo "❌ [$(date '+%H:%M:%S')] ERROR: $1" >&2
}

# Validate environment
validate_environment() {
    log "Validating Stay Hi development environment..."
    
    if [[ ! -d "$PUBLIC_DIR" ]]; then
        error "Public directory not found: $PUBLIC_DIR"
        exit 1
    fi
    
    if [[ ! -f "$PUBLIC_DIR/index.html" ]]; then
        error "Main index.html not found in public directory"
        exit 1
    fi
    
    if [[ ! -f "$PUBLIC_DIR/welcome.html" ]]; then
        error "Welcome page not found in public directory"
        exit 1
    fi
    
    log "✅ Environment validation passed"
}

# Find available port
find_available_port() {
    local port=$DEFAULT_PORT
    while lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; do
        log "Port $port is busy, trying $(($port + 1))..."
        port=$(($port + 1))
    done
    echo $port
}

# Kill existing servers on Stay Hi ports
cleanup_existing_servers() {
    log "Cleaning up any existing Stay Hi servers..."
    
    for port in {8090..8110}; do
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
            log "Stopping server on port $port"
            lsof -ti :$port | xargs kill -9 2>/dev/null || true
        fi
    done
    
    sleep 1
    log "✅ Server cleanup completed"
}

# Start server
start_server() {
    local port=$(find_available_port)
    
    log "Starting Stay Hi development server..."
    log "📁 Serving from: $PUBLIC_DIR"
    log "🌐 URL: http://localhost:$port"
    log "🎯 Dashboard: http://localhost:$port/index.html"
    log "👋 Welcome: http://localhost:$port/welcome.html"
    
    cd "$PUBLIC_DIR"
    
    # Start server with proper error handling
    if command -v python3 >/dev/null 2>&1; then
        log "Using Python 3 HTTP server on port $port"
        python3 -m http.server $port
    elif command -v python >/dev/null 2>&1; then
        log "Using Python 2 HTTP server on port $port"
        python -m SimpleHTTPServer $port
    else
        error "Python not found. Please install Python to run the development server."
        exit 1
    fi
}

# Main execution
main() {
    log "🚀 Tesla-Grade Stay Hi Development Server Starting..."
    log "Project root: $PROJECT_ROOT"
    
    validate_environment
    cleanup_existing_servers
    start_server
}

# Handle interrupts gracefully
trap 'log "Server stopped by user"; exit 0' INT TERM

# Run if executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi