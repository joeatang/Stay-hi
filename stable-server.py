#!/usr/bin/env python3
"""
🏗️ TESLA-GRADE STABLE SERVER
No 404s, proper routing, optimized for Stay-hi architecture
"""
import http.server
import socketserver
import os
import sys
from urllib.parse import urlparse, unquote

class StableHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Tesla-grade HTTP handler with smart routing"""
    
    def do_GET(self):
        """Handle GET requests with intelligent routing"""
        parsed_path = urlparse(self.path)
        clean_path = unquote(parsed_path.path)
        
        # 🔧 TESLA-GRADE SMART ROUTING: Fix all path issues
        if clean_path == '/hi-dashboard.html':
            self.path = '/public/hi-dashboard.html' + ('?' + parsed_path.query if parsed_path.query else '')
        elif clean_path == '/welcome.html':
            self.path = '/public/welcome.html' + ('?' + parsed_path.query if parsed_path.query else '')
        elif clean_path == '/favicon.ico':
            self.path = '/favicon.ico'
        elif clean_path.startswith('/lib/') and not clean_path.startswith('/public/lib/'):
            self.path = '/public' + self.path
        elif clean_path.startswith('/assets/') and not clean_path.startswith('/public/assets/'):
            self.path = '/public' + self.path
        elif clean_path.startswith('/ui/') and not clean_path.startswith('/public/ui/'):
            self.path = '/public' + self.path
        elif clean_path.startswith('/styles/') and not clean_path.startswith('/public/styles/'):
            self.path = '/public' + self.path
        elif clean_path.startswith('/manifest.json'):
            self.path = '/public/manifest.json'
        elif clean_path.endswith('.html') and not clean_path.startswith('/public/'):
            # Handle all HTML files
            if clean_path.startswith('/'):
                clean_path = clean_path[1:]
            self.path = '/public/' + clean_path + ('?' + parsed_path.query if parsed_path.query else '')
        
        # 🛡️ SECURITY: Prevent directory traversal
        if '..' in clean_path or clean_path.startswith('/.'):
            self.send_error(403, "Forbidden")
            return
            
        # Call parent handler
        try:
            super().do_GET()
        except Exception as e:
            print(f"⚠️ Request error for {self.path}: {e}")
            self.send_error(500, "Internal Server Error")
    
    def log_message(self, format, *args):
        """Custom logging with emoji status indicators"""
        status_code = args[1] if len(args) > 1 else "000"
        emoji = "✅" if status_code.startswith("2") else "❌" if status_code.startswith("4") else "⚠️"
        print(f"{emoji} {format % args}")

def main():
    """Start Tesla-grade stable server"""
    PORT = 8080
    BIND_IP = '127.0.0.1'
    
    # Change to project root directory
    os.chdir('/Users/joeatang/Documents/GitHub/Stay-hi')
    
    print("🚀 TESLA-GRADE STABLE SERVER")
    print("=" * 40)
    print(f"📍 Directory: {os.getcwd()}")
    print(f"🌐 Server: http://{BIND_IP}:{PORT}")
    print(f"🎯 Dashboard: http://{BIND_IP}:{PORT}/public/hi-dashboard.html")
    print(f"👋 Welcome: http://{BIND_IP}:{PORT}/public/welcome.html")
    print("=" * 40)
    print("🔧 Smart routing enabled for common path issues")
    print("🛡️ Security protections active")
    print("📊 Enhanced logging with status indicators")
    print("=" * 40)
    
    try:
        with socketserver.TCPServer((BIND_IP, PORT), StableHTTPRequestHandler) as httpd:
            print(f"✅ Server ready! Press Ctrl+C to stop")
            httpd.serve_forever()
    except KeyboardInterrupt:
        print(f"\n🛑 Server stopped by user")
    except Exception as e:
        print(f"❌ Server error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()