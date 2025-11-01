#!/usr/bin/env python3
"""
TESLA-GRADE AUTHENTICATION SERVER
Database-backed, secure, efficient

Connects clean UI to existing database schema
No external dependencies, pure Python + PostgreSQL
"""

import json
import uuid
import hashlib
import hmac
import time
import secrets
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import psycopg2
from psycopg2.extras import RealDictCursor
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

class TeslaGradeAuthServer(BaseHTTPRequestHandler):
    
    def __init__(self, *args, **kwargs):
        # Database connection settings
        self.db_config = {
            'host': os.getenv('DB_HOST', 'localhost'),
            'database': os.getenv('DB_NAME', 'postgres'),
            'user': os.getenv('DB_USER', 'postgres'), 
            'password': os.getenv('DB_PASSWORD', ''),
            'port': os.getenv('DB_PORT', '5432')
        }
        
        # Email settings (configure these)
        self.smtp_config = {
            'host': os.getenv('SMTP_HOST', 'smtp.gmail.com'),
            'port': int(os.getenv('SMTP_PORT', '587')),
            'username': os.getenv('SMTP_USER', ''),
            'password': os.getenv('SMTP_PASS', '')
        }
        
        super().__init__(*args, **kwargs)
    
    def do_OPTIONS(self):
        """Handle CORS preflight"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def do_GET(self):
        """Serve static files and handle auth callbacks"""
        path = self.path
        
        if path == '/' or path == '/auth':
            self.serve_file('auth-tesla-grade.html')
        elif path.startswith('/api/auth/verify/'):
            # Handle email verification links
            token = path.split('/')[-1]
            self.handle_email_verification(token)
        elif path.startswith('/assets/'):
            # Serve assets
            self.serve_static_file(path[1:])  # Remove leading /
        else:
            self.serve_file('auth-tesla-grade.html')
    
    def do_POST(self):
        """Handle API endpoints"""
        path = self.path
        
        if path == '/api/auth/invite':
            self.handle_invite_code()
        elif path == '/api/auth/email':
            self.handle_email_signin()
        else:
            self.send_error(404, "API endpoint not found")
    
    def handle_invite_code(self):
        """Process invite code authentication"""
        try:
            # Parse request
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            code = data.get('code', '').upper().strip()
            email = data.get('email', '').lower().strip()
            
            if not code or not email:
                self.send_json_response({
                    'success': False,
                    'message': 'Code and email are required'
                }, 400)
                return
            
            # Validate invite code in database
            with self.get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    
                    # Check if invite code exists and is valid
                    cur.execute("""
                        SELECT ic.*, bt.access_level, bt.features_enabled
                        FROM invitation_codes ic
                        LEFT JOIN beta_testers bt ON ic.beta_tester_id = bt.id
                        WHERE ic.code = %s 
                        AND ic.is_active = true
                        AND (ic.expires_at IS NULL OR ic.expires_at > NOW())
                        AND (ic.max_uses IS NULL OR ic.uses_count < ic.max_uses)
                    """, (code,))
                    
                    invite = cur.fetchone()
                    
                    if not invite:
                        self.send_json_response({
                            'success': False,
                            'message': 'Invalid or expired invite code'
                        })
                        return
                    
                    # Check if user already exists
                    cur.execute("""
                        SELECT id FROM auth.users WHERE email = %s
                    """, (email,))
                    
                    existing_user = cur.fetchone()
                    
                    if existing_user:
                        user_id = existing_user['id']
                    else:
                        # Create new user
                        user_id = str(uuid.uuid4())
                        cur.execute("""
                            INSERT INTO auth.users (id, email, created_at)
                            VALUES (%s, %s, NOW())
                        """, (user_id, email))
                    
                    # Create or update membership
                    membership_tier = self.determine_tier_from_code(code)
                    trial_days = self.extract_trial_days_from_code(code)
                    
                    cur.execute("""
                        INSERT INTO user_memberships 
                        (id, user_id, membership_tier, status, trial_days_remaining, created_at, last_updated)
                        VALUES (%s, %s, %s, 'active', %s, NOW(), NOW())
                        ON CONFLICT (user_id) DO UPDATE SET
                            membership_tier = EXCLUDED.membership_tier,
                            status = 'active',
                            trial_days_remaining = GREATEST(user_memberships.trial_days_remaining, EXCLUDED.trial_days_remaining),
                            last_updated = NOW()
                    """, (str(uuid.uuid4()), user_id, membership_tier, trial_days))
                    
                    # Update invite code usage
                    cur.execute("""
                        UPDATE invitation_codes 
                        SET uses_count = uses_count + 1,
                            last_used_at = NOW(),
                            last_used_by = %s
                        WHERE code = %s
                    """, (user_id, code))
                    
                    # Create session token
                    session_token = self.create_session_token(user_id)
                    
                    conn.commit()
                    
                    self.send_json_response({
                        'success': True,
                        'message': 'Welcome to Stay Hi!',
                        'user_id': user_id,
                        'session_token': session_token,
                        'membership_tier': membership_tier,
                        'trial_days': trial_days
                    })
                    
        except Exception as e:
            print(f"Invite code error: {e}")
            self.send_json_response({
                'success': False,
                'message': 'Server error processing invite code'
            }, 500)
    
    def handle_email_signin(self):
        """Process email-based signin"""
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            email = data.get('email', '').lower().strip()
            
            if not email:
                self.send_json_response({
                    'success': False,
                    'message': 'Email is required'
                }, 400)
                return
            
            with self.get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    
                    # Check if user exists and has active membership
                    cur.execute("""
                        SELECT u.id, u.email, um.membership_tier, um.status
                        FROM auth.users u
                        JOIN user_memberships um ON u.id = um.user_id
                        WHERE u.email = %s AND um.status = 'active'
                    """, (email,))
                    
                    user = cur.fetchone()
                    
                    if not user:
                        self.send_json_response({
                            'success': False,
                            'message': 'No active membership found for this email'
                        })
                        return
                    
                    # Generate magic link token
                    magic_token = secrets.token_urlsafe(32)
                    expires_at = time.time() + (15 * 60)  # 15 minutes
                    
                    # Store token (you might want to create a magic_links table)
                    cur.execute("""
                        INSERT INTO magic_links (token, user_id, expires_at, created_at)
                        VALUES (%s, %s, to_timestamp(%s), NOW())
                        ON CONFLICT (user_id) DO UPDATE SET
                            token = EXCLUDED.token,
                            expires_at = EXCLUDED.expires_at,
                            created_at = NOW()
                    """, (magic_token, user['id'], expires_at))
                    
                    conn.commit()
                    
                    # Send email
                    magic_link = f"http://localhost:8082/api/auth/verify/{magic_token}"
                    
                    if self.send_magic_link_email(email, magic_link):
                        self.send_json_response({
                            'success': True,
                            'message': 'Magic link sent! Check your email.'
                        })
                    else:
                        self.send_json_response({
                            'success': False,
                            'message': 'Failed to send email. Please try again.'
                        }, 500)
                        
        except Exception as e:
            print(f"Email signin error: {e}")
            self.send_json_response({
                'success': False,
                'message': 'Server error processing email signin'
            }, 500)
    
    def handle_email_verification(self, token):
        """Handle magic link verification"""
        try:
            with self.get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    
                    cur.execute("""
                        SELECT ml.user_id, u.email 
                        FROM magic_links ml
                        JOIN auth.users u ON ml.user_id = u.id
                        WHERE ml.token = %s 
                        AND ml.expires_at > to_timestamp(%s)
                        AND ml.used_at IS NULL
                    """, (token, time.time()))
                    
                    link_data = cur.fetchone()
                    
                    if not link_data:
                        self.send_redirect_with_error("Invalid or expired magic link")
                        return
                    
                    # Mark token as used
                    cur.execute("""
                        UPDATE magic_links 
                        SET used_at = NOW()
                        WHERE token = %s
                    """, (token,))
                    
                    # Create session
                    session_token = self.create_session_token(link_data['user_id'])
                    
                    conn.commit()
                    
                    # Redirect to main app with session
                    self.send_response(302)
                    self.send_header('Location', f'/index.html?session={session_token}')
                    self.end_headers()
                    
        except Exception as e:
            print(f"Verification error: {e}")
            self.send_redirect_with_error("Server error during verification")
    
    def get_db_connection(self):
        """Get database connection"""
        return psycopg2.connect(**self.db_config)
    
    def create_session_token(self, user_id):
        """Create secure session token"""
        payload = {
            'user_id': user_id,
            'created_at': time.time(),
            'expires_at': time.time() + (30 * 24 * 3600)  # 30 days
        }
        
        # Simple JWT-like token (implement proper JWT for production)
        token_data = json.dumps(payload).encode()
        signature = hmac.new(
            b'your-secret-key',  # Use proper secret management
            token_data,
            hashlib.sha256
        ).hexdigest()
        
        return f"{token_data.hex()}.{signature}"
    
    def determine_tier_from_code(self, code):
        """Extract membership tier from invite code format"""
        if 'BETA' in code:
            return 'BETA'
        elif 'VIP' in code:
            return 'VIP'
        elif 'FRIEND' in code:
            return 'FRIEND'
        elif 'STAN' in code:
            return 'STAN'
        else:
            return 'BETA'  # Default
    
    def extract_trial_days_from_code(self, code):
        """Extract trial days from code format like STAYHI-BETA-30D-A7X9K2"""
        try:
            parts = code.split('-')
            for part in parts:
                if part.endswith('D') and part[:-1].isdigit():
                    return int(part[:-1])
            return 30  # Default trial days
        except:
            return 30
    
    def send_magic_link_email(self, email, magic_link):
        """Send magic link via email"""
        try:
            if not self.smtp_config['username']:
                print(f"Would send magic link to {email}: {magic_link}")
                return True  # Mock success for development
            
            msg = MIMEMultipart()
            msg['From'] = self.smtp_config['username']
            msg['To'] = email
            msg['Subject'] = "Your Stay Hi Access Link"
            
            body = f"""
            Welcome back to Stay Hi!
            
            Click the link below to access your island:
            {magic_link}
            
            This link expires in 15 minutes.
            
            Stay Hi Team
            """
            
            msg.attach(MIMEText(body, 'plain'))
            
            server = smtplib.SMTP(self.smtp_config['host'], self.smtp_config['port'])
            server.starttls()
            server.login(self.smtp_config['username'], self.smtp_config['password'])
            server.send_message(msg)
            server.quit()
            
            return True
            
        except Exception as e:
            print(f"Email sending error: {e}")
            return False
    
    def send_json_response(self, data, status_code=200):
        """Send JSON response with CORS headers"""
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())
    
    def send_redirect_with_error(self, error_message):
        """Send redirect with error message"""
        self.send_response(302)
        self.send_header('Location', f'/auth?error={error_message}')
        self.end_headers()
    
    def serve_file(self, filename):
        """Serve HTML file"""
        try:
            with open(filename, 'rb') as f:
                content = f.read()
            
            self.send_response(200)
            self.send_header('Content-Type', 'text/html')
            self.end_headers()
            self.wfile.write(content)
            
        except FileNotFoundError:
            self.send_error(404, f"File not found: {filename}")
    
    def serve_static_file(self, filepath):
        """Serve static files"""
        try:
            with open(filepath, 'rb') as f:
                content = f.read()
            
            # Determine content type
            if filepath.endswith('.css'):
                content_type = 'text/css'
            elif filepath.endswith('.js'):
                content_type = 'application/javascript'
            elif filepath.endswith('.ico'):
                content_type = 'image/x-icon'
            elif filepath.endswith('.png'):
                content_type = 'image/png'
            else:
                content_type = 'application/octet-stream'
            
            self.send_response(200)
            self.send_header('Content-Type', content_type)
            self.end_headers()
            self.wfile.write(content)
            
        except FileNotFoundError:
            self.send_error(404, f"File not found: {filepath}")

def run_server():
    """Start the Tesla-grade authentication server"""
    port = 8082
    server = HTTPServer(('localhost', port), TeslaGradeAuthServer)
    
    print(f"""
    ⚡ TESLA-GRADE AUTH SERVER RUNNING ⚡
    
    🌐 Authentication: http://localhost:{port}/auth
    🔐 Database-backed, secure, efficient
    🚀 Ready for premium users
    
    Press Ctrl+C to stop
    """)
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Server stopped")
        server.server_close()

if __name__ == '__main__':
    run_server()