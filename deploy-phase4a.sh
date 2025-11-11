#!/bin/bash

# ========================================
# 🚀 Phase 4A Deployment Script  
# Tesla-Grade Tier System Direct Upload
# ========================================

echo "🚀 Deploying Phase 4A: Tesla-Grade Tier System"
echo "Database: gfcubvroxgfvjhacinic.supabase.co"
echo "=================================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

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

# Step 1: Verify files exist
print_status "Verifying deployment files..."
if [ ! -f "deploy-phase4a-tesla.sql" ]; then
    print_error "deploy-phase4a-tesla.sql not found!"
    exit 1
fi
print_success "Deployment SQL found"

# Step 2: Create backup of current state
print_status "Creating backup script..."
cat > backup-current-state.sql << 'EOF'
-- Backup existing hi_members structure before Phase 4A
CREATE TABLE IF NOT EXISTS hi_members_backup_phase4a AS 
SELECT * FROM hi_members;

-- Log deployment start
INSERT INTO deployment_log (phase, status, timestamp, notes) 
VALUES ('4A', 'started', now(), 'Tesla-grade tier system deployment initiated');
EOF

# Step 3: Show deployment summary
print_status "Deployment Summary:"
echo "  📊 Enhancing hi_members table with tier system"
echo "  🎫 Adding hi_access_codes table for temporal access"
echo "  🔄 Creating Stan integration with hi_pending_memberships"
echo "  📈 Adding analytics views and tier management functions"
echo ""

# Step 4: Manual deployment instructions
print_warning "MANUAL DEPLOYMENT REQUIRED"
echo "Automated CLI deployment not available. Follow these steps:"
echo ""
echo "1. 🌐 Open Supabase Dashboard:"
echo "   https://app.supabase.com/project/gfcubvroxgfvjhacinic"
echo ""
echo "2. 📝 Navigate to SQL Editor"
echo ""
echo "3. 📋 Copy the contents of deploy-phase4a-tesla.sql"
echo "4. 🚀 Paste and execute in SQL Editor"
echo ""
echo "5. ✅ Verify deployment with this test:"

# Create verification script
cat > verify-phase4a-deployment.sql << 'EOF'
-- Verification Script for Phase 4A Deployment
SELECT 'Phase 4A Deployment Verification' as test_name;

-- Check 1: Verify hi_members enhancements
SELECT 
  'hi_members tier columns' as check_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'hi_members' AND column_name = 'access_tier'
  ) THEN '✅ PASS' ELSE '❌ FAIL' END as status;

-- Check 2: Verify access codes table
SELECT 
  'hi_access_codes table' as check_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'hi_access_codes'
  ) THEN '✅ PASS' ELSE '❌ FAIL' END as status;

-- Check 3: Verify Stan integration
SELECT 
  'hi_pending_memberships table' as check_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'hi_pending_memberships'
  ) THEN '✅ PASS' ELSE '❌ FAIL' END as status;

-- Check 4: Verify functions
SELECT 
  'tier management functions' as check_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'check_user_access_tier'
  ) THEN '✅ PASS' ELSE '❌ FAIL' END as status;

-- Check 5: Test access code generation
SELECT 'Testing 24hr code generation:' as test_name;
SELECT * FROM generate_24hr_discovery_code('TEST', 1);

-- Show current tier distribution
SELECT 'Current Tier Distribution:' as summary;
SELECT * FROM hi_tier_distribution;
EOF

echo "6. 🔍 Run verification script (verify-phase4a-deployment.sql) to confirm"
echo ""

# Step 5: Show what to expect
print_success "Expected Results After Deployment:"
echo "  🏗️  Enhanced hi_members table with 4-tier system (0,1,2,3)"
echo "  🎫 Access codes for 24hr discovery and temporal upgrades"  
echo "  🔄 Stan webhook integration for seamless purchases"
echo "  📊 Analytics views for tier distribution and conversions"
echo "  🛡️  Row Level Security policies for data protection"
echo ""

# Step 6: Create deployment checklist
print_status "Creating deployment checklist..."
cat > phase4a-deployment-checklist.md << 'EOF'
# Phase 4A Deployment Checklist

## Pre-Deployment
- [x] SQL script generated (deploy-phase4a-tesla.sql)
- [x] Verification script ready (verify-phase4a-deployment.sql)
- [x] Backup strategy confirmed

## Deployment Steps
- [ ] 1. Open Supabase Dashboard
- [ ] 2. Navigate to SQL Editor  
- [ ] 3. Execute deploy-phase4a-tesla.sql
- [ ] 4. Run verification script
- [ ] 5. Check all tests pass
- [ ] 6. Update frontend to use new tier system

## Post-Deployment Verification
- [ ] hi_members table enhanced with tier columns
- [ ] hi_access_codes table created and functional
- [ ] Stan integration tables ready (hi_pending_memberships)
- [ ] All RPC functions working (check_user_access_tier, etc.)
- [ ] Analytics views operational
- [ ] 24hr access code generation working
- [ ] Row Level Security policies active

## Success Criteria
- [ ] All verification tests pass (✅ PASS)
- [ ] No SQL errors in deployment
- [ ] Existing data preserved and enhanced
- [ ] New tier system fully operational

## Rollback Plan
If issues arise:
1. Check deployment_log table for errors
2. Restore from hi_members_backup_phase4a if needed
3. Contact deployment team for assistance
EOF

print_success "Deployment files created:"
echo "  📄 deploy-phase4a-tesla.sql (main deployment)"
echo "  🔍 verify-phase4a-deployment.sql (verification)"
echo "  📋 phase4a-deployment-checklist.md (checklist)"
echo ""

print_warning "⚠️  IMPORTANT: This is a production deployment"
echo "   Execute during low-traffic hours"
echo "   Monitor for any SQL errors during execution"
echo "   Run verification immediately after deployment"
echo ""

print_success "🚀 Ready for Phase 4A deployment!"
echo "   Follow the manual steps above to complete."

# Step 7: Open verification in browser for easy access
if command -v open >/dev/null 2>&1; then
    print_status "Opening deployment checklist..."
    open phase4a-deployment-checklist.md 2>/dev/null || true
fi

echo "=============================================="
echo "Phase 4A deployment preparation complete! 🎯"