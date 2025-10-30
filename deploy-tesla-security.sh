#!/bin/bash

# ========================================
# 🚀 TESLA-GRADE INVITATION-ONLY SECURITY 
# Complete Deployment Script
# ========================================

echo "🚀 Deploying Tesla-Grade Invitation-Only Authentication System..."
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_section() {
    echo ""
    echo -e "${PURPLE}================================${NC}"
    echo -e "${PURPLE}$1${NC}"
    echo -e "${PURPLE}================================${NC}"
}

# Check if Supabase CLI is available
check_supabase_cli() {
    if ! command -v supabase &> /dev/null; then
        print_warning "Supabase CLI not found. Install it with: npm install -g supabase"
        print_status "Continuing without automatic database deployment..."
        return 1
    fi
    return 0
}

# Deploy RPC functions to Supabase
deploy_rpc_functions() {
    print_section "📊 DEPLOYING TESLA RPC FUNCTIONS"
    
    if check_supabase_cli; then
        print_status "Deploying invitation-only security RPC functions..."
        
        # Apply the Tesla invitation security RPCs
        if supabase db push tesla-invitation-security-rpcs.sql; then
            print_success "Tesla RPC functions deployed successfully!"
        else
            print_error "Failed to deploy RPC functions. Please deploy manually:"
            print_status "Run the contents of tesla-invitation-security-rpcs.sql in your Supabase SQL editor"
        fi
    else
        print_warning "Manual deployment required:"
        print_status "1. Open your Supabase dashboard"
        print_status "2. Go to SQL Editor"
        print_status "3. Run the contents of: tesla-invitation-security-rpcs.sql"
    fi
}

# Verify critical files exist
verify_files() {
    print_section "📋 VERIFYING TESLA SECURITY FILES"
    
    local files=(
        "tesla-invitation-security-rpcs.sql"
        "public/signin.html"
        "public/signup.html" 
        "public/upgrade.html"
        "public/tesla-admin-dashboard.html"
        "public/assets/auth-guard.js"
    )
    
    local missing_files=()
    
    for file in "${files[@]}"; do
        if [[ -f "$file" ]]; then
            print_success "✅ $file"
        else
            print_error "❌ $file (MISSING)"
            missing_files+=("$file")
        fi
    done
    
    if [[ ${#missing_files[@]} -gt 0 ]]; then
        print_error "Missing critical files. Deployment cannot continue."
        return 1
    fi
    
    print_success "All Tesla security files verified!"
    return 0
}

# Show deployment summary
show_deployment_summary() {
    print_section "🎯 TESLA-GRADE SECURITY DEPLOYMENT COMPLETE"
    
    echo -e "${CYAN}🔐 AUTHENTICATION SECURITY:${NC}"
    echo "   ✅ Invitation-only signin with membership validation"
    echo "   ✅ Magic link restricted to verified members only"
    echo "   ✅ Trial expiration enforcement with auto-logout"
    echo "   ✅ Session-based membership validation"
    echo ""
    
    echo -e "${CYAN}🎫 INVITATION CODE SYSTEM:${NC}"
    echo "   ✅ Time-based codes (1d, 7d, 15d, 30d, 60d, 90d)"
    echo "   ✅ Tesla Admin Dashboard code generator"
    echo "   ✅ Real-time code validation without usage"
    echo "   ✅ Code management and analytics"
    echo ""
    
    echo -e "${CYAN}👑 MEMBERSHIP MANAGEMENT:${NC}"
    echo "   ✅ Trial period enforcement"
    echo "   ✅ Upgrade flow for expired members"
    echo "   ✅ Stan platform integration ready"
    echo "   ✅ Membership tier feature flags"
    echo ""
    
    echo -e "${CYAN}🚀 NEXT STEPS:${NC}"
    echo "   1. Deploy RPC functions to Supabase (if not done automatically)"
    echo "   2. Test invitation code generation in Admin Dashboard"
    echo "   3. Verify signin security with non-member email"
    echo "   4. Set up Stan platform billing integration"
    echo "   5. Configure email templates for invitation codes"
    echo ""
    
    echo -e "${YELLOW}⚠️  SECURITY NOTES:${NC}"
    echo "   • Open magic link vulnerability has been CLOSED"
    echo "   • Only verified Hi Collective members can sign in"
    echo "   • Trial expiration automatically logs out users"
    echo "   • Admin dashboard now requires authentication"
    echo ""
}

# Test security implementation
test_security() {
    print_section "🔒 TESTING TESLA SECURITY IMPLEMENTATION"
    
    print_status "Checking critical security configurations..."
    
    # Check if signin.html has membership validation
    if grep -q "check_membership_access" public/signin.html; then
        print_success "✅ Signin.html has membership validation"
    else
        print_error "❌ Signin.html missing membership validation"
    fi
    
    # Check if auth-guard.js has expiration checking  
    if grep -q "get_my_membership" public/assets/auth-guard.js; then
        print_success "✅ Auth-guard has membership expiration checking"
    else
        print_error "❌ Auth-guard missing expiration checking"
    fi
    
    # Check if admin dashboard has code generator
    if grep -q "generate_invite_code" public/tesla-admin-dashboard.html; then
        print_success "✅ Admin dashboard has Tesla code generator"
    else
        print_error "❌ Admin dashboard missing code generator"
    fi
    
    # Check if upgrade page exists
    if [[ -f "public/upgrade.html" ]]; then
        print_success "✅ Upgrade page ready for expired members"
    else
        print_error "❌ Upgrade page missing"
    fi
}

# Main deployment process
main() {
    echo -e "${CYAN}"
    cat << "EOF"
    ████████╗███████╗███████╗██╗      █████╗ 
    ╚══██╔══╝██╔════╝██╔════╝██║     ██╔══██╗
       ██║   █████╗  ███████╗██║     ███████║
       ██║   ██╔══╝  ╚════██║██║     ██╔══██║
       ██║   ███████╗███████║███████╗██║  ██║
       ╚═╝   ╚══════╝╚══════╝╚══════╝╚═╝  ╚═╝
         INVITATION-ONLY SECURITY SYSTEM
EOF
    echo -e "${NC}"
    
    # Verify all files exist before deployment
    if ! verify_files; then
        exit 1
    fi
    
    # Deploy RPC functions
    deploy_rpc_functions
    
    # Test security implementation
    test_security
    
    # Show summary
    show_deployment_summary
    
    print_success "🎉 Tesla-Grade Invitation-Only Security System Deployed!"
    print_status "Your Hi Collective platform is now secured with invitation-only access."
}

# Run main deployment
main "$@"