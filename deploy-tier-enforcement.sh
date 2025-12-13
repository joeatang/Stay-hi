#!/bin/bash

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 🚀 HI-OS TIER ENFORCEMENT DEPLOYMENT
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 HI-OS TIER ENFORCEMENT - DEPLOYMENT SCRIPT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if we're in the right directory
if [ ! -f "sql/migrations/tier_enforcement_share_validation.sql" ]; then
  echo "❌ Error: Run this script from the Stay-hi repository root"
  exit 1
fi

echo "✅ Repository location verified"
echo ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# STEP 1: Frontend Changes Summary
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo "📦 STEP 1: Frontend Changes"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Modified files (already saved):"
echo "  ✓ public/ui/HiShareSheet/HiShareSheet.js"
echo "  ✓ public/lib/boot/profile-main.js"
echo "  ✓ public/lib/boot/muscle-main.js"
echo ""
echo "Changes:"
echo "  ✓ Share creation tier enforcement ENABLED"
echo "  ✓ Avatar upload tier check ADDED"
echo "  ✓ Hi Muscle access control ADDED"
echo "  ✓ Client-side quota tracking ADDED"
echo ""
read -p "👉 Press ENTER to continue to database deployment..."
echo ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# STEP 2: Database Migrations
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo "🗄️  STEP 2: Database Migrations"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  IMPORTANT: You need to run these SQL migrations in Supabase:"
echo ""
echo "1. Open Supabase Dashboard → SQL Editor"
echo "2. Create new query"
echo "3. Copy/paste ENTIRE contents of:"
echo ""
echo "   📄 sql/migrations/tier_enforcement_share_validation.sql"
echo ""
echo "4. Click 'Run'"
echo "5. Verify output shows:"
echo "   ✓ user_share_tracking table created"
echo "   ✓ get_user_share_count() created"
echo "   ✓ validate_share_creation() created"
echo "   ✓ track_share_submission() created"
echo ""
echo "6. Repeat for:"
echo "   📄 sql/migrations/tier_enforcement_tap_limiting.sql"
echo ""
echo "7. Verify output shows:"
echo "   ✓ user_tap_counts table created"
echo "   ✓ get_user_tap_count() created"
echo "   ✓ record_medallion_tap() created"
echo "   ✓ reset_daily_tap_counts() created"
echo ""
read -p "👉 Press ENTER after running BOTH migrations..."
echo ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# STEP 3: Verification
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo "🔍 STEP 3: Verification"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Run these queries in Supabase SQL Editor to verify:"
echo ""
echo "-- Check tables exist:"
echo "SELECT tablename FROM pg_tables"
echo "WHERE tablename IN ('user_share_tracking', 'user_tap_counts');"
echo ""
echo "Expected: 2 rows"
echo ""
echo "-- Check RPCs exist:"
echo "SELECT proname FROM pg_proc"
echo "WHERE proname LIKE '%share%' OR proname LIKE '%tap%';"
echo ""
echo "Expected: 8 functions"
echo ""
read -p "👉 Press ENTER after verification..."
echo ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# STEP 4: Testing Checklist
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo "✅ STEP 4: Testing Checklist"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Test with different tier accounts:"
echo ""
echo "FREE TIER ($0):"
echo "  [ ] Try to create share → Should be BLOCKED"
echo "  [ ] Try to upload avatar → Should be BLOCKED"
echo "  [ ] Navigate to Hi Muscle → Should be BLOCKED"
echo ""
echo "BRONZE TIER ($5.55):"
echo "  [ ] Create 10 shares → Counter shows '10/10'"
echo "  [ ] Try 11th share → BLOCKED with upgrade modal"
echo "  [ ] Upload avatar → ALLOWED"
echo "  [ ] Access Hi Muscle → ALLOWED"
echo ""
echo "GOLD TIER ($25.55):"
echo "  [ ] Create 50+ shares → All ALLOWED"
echo "  [ ] No counter shown (unlimited)"
echo ""
echo "SERVER-SIDE SECURITY:"
echo "  [ ] Direct API call with quota exceeded → REJECTED by server"
echo "  [ ] Manipulate localStorage → Server count overrides"
echo ""
echo ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# COMPLETION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 DEPLOYMENT GUIDE COMPLETE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📚 Documentation:"
echo "  • WOZ_GRADE_TIER_VALIDATION_FINAL.md (Complete audit)"
echo "  • TIER_ENFORCEMENT_PHASE1_COMPLETE.md (Implementation summary)"
echo ""
echo "📁 SQL Migrations:"
echo "  • sql/migrations/tier_enforcement_share_validation.sql"
echo "  • sql/migrations/tier_enforcement_tap_limiting.sql"
echo ""
echo "🎯 Modified Frontend Files:"
echo "  • public/ui/HiShareSheet/HiShareSheet.js"
echo "  • public/lib/boot/profile-main.js"
echo "  • public/lib/boot/muscle-main.js"
echo ""
echo "✅ Status: READY FOR PRODUCTION"
echo ""
echo "💡 Next Steps:"
echo "  1. Deploy to staging environment"
echo "  2. Test with bronze account"
echo "  3. Verify server-side validation"
echo "  4. Launch to beta users"
echo ""
echo "🎉 Built with Woz-grade precision!"
echo ""
