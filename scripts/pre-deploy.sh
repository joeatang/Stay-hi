#!/bin/bash
# 🚀 Pre-Deployment Safety Check
# Run this BEFORE every deployment to prevent regressions

set -e

echo "🚀 Stay Hi - Pre-Deployment Safety Check"
echo "========================================"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

FAILED=0

# Check 1: Git status
echo "📋 Checking git status..."
if [[ -n $(git status -s) ]]; then
  echo -e "${YELLOW}⚠️  Uncommitted changes detected${NC}"
  git status -s
  echo ""
  read -p "Commit changes before deploying? (yes/no): " COMMIT_NOW
  if [[ "$COMMIT_NOW" == "yes" ]]; then
    git add -A
    read -p "Commit message: " COMMIT_MSG
    git commit -m "$COMMIT_MSG"
    echo -e "${GREEN}✅ Changes committed${NC}"
  else
    echo -e "${RED}❌ Cannot deploy with uncommitted changes${NC}"
    FAILED=1
  fi
else
  echo -e "${GREEN}✅ Git status clean${NC}"
fi
echo ""

# Check 2: Verify vercel.json
echo "📋 Validating vercel.json..."
if python3 -m json.tool vercel.json > /dev/null 2>&1; then
  echo -e "${GREEN}✅ vercel.json is valid JSON${NC}"
else
  echo -e "${RED}❌ vercel.json is invalid JSON${NC}"
  FAILED=1
fi
echo ""

# Check 3: Check for console.error or debugger statements
echo "📋 Checking for debug code..."
DEBUG_FILES=$(grep -r "console\.error\|debugger" public --include="*.js" --exclude-dir=node_modules | wc -l)
if [[ $DEBUG_FILES -gt 0 ]]; then
  echo -e "${YELLOW}⚠️  Found $DEBUG_FILES debug statements (check if intentional)${NC}"
  echo "Run: grep -r 'console\.error\|debugger' public --include='*.js'"
else
  echo -e "${GREEN}✅ No debug code found${NC}"
fi
echo ""

# Check 4: Local server running check
echo "📋 Checking if local server is accessible..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3030 | grep -q "200"; then
  echo -e "${GREEN}✅ Local server is running on port 3030${NC}"
else
  echo -e "${RED}❌ Local server not running on port 3030${NC}"
  echo "Start with: cd public && python3 -m http.server 3030"
  FAILED=1
fi
echo ""

# Check 5: Critical files exist
echo "📋 Verifying critical files..."
CRITICAL_FILES=(
  "public/hi-dashboard.html"
  "public/hi-island-NEW.html"
  "public/hi-muscle.html"
  "public/lib/config/TIER_CONFIG.js"
  "public/assets/feature-flags.js"
  "public/lib/boot/dashboard-main.js"
)

for file in "${CRITICAL_FILES[@]}"; do
  if [[ -f "$file" ]]; then
    echo -e "${GREEN}✅${NC} $file"
  else
    echo -e "${RED}❌${NC} $file (MISSING)"
    FAILED=1
  fi
done
echo ""

# Check 6: Create deployment tag
echo "📋 Creating deployment tag..."
TAG_NAME="deploy-$(date +%Y%m%d-%H%M%S)"
if git tag -a "$TAG_NAME" -m "Pre-deployment checkpoint"; then
  echo -e "${GREEN}✅ Created tag: $TAG_NAME${NC}"
  echo "Rollback command: git checkout $TAG_NAME"
else
  echo -e "${YELLOW}⚠️  Could not create tag${NC}"
fi
echo ""

# Manual Testing Checklist
echo "========================================"
echo "🧪 MANUAL TESTING REQUIRED"
echo "========================================"
echo ""
echo "Before deploying, test these on localhost:3030:"
echo ""
echo "  [ ] Dashboard loads without errors"
echo "  [ ] Streak pill shows number (not 0)"
echo "  [ ] Click medallion (wave counter increments)"
echo "  [ ] Hi Island loads with shares"
echo "  [ ] Filter buttons work (Hi5, HiGym, Island)"
echo "  [ ] Hi-Gym emotion selector loads"
echo "  [ ] Create a share (submit works)"
echo "  [ ] No console errors (open DevTools)"
echo ""
echo "========================================"
echo ""

# Final decision
if [[ $FAILED -eq 1 ]]; then
  echo -e "${RED}❌ PRE-DEPLOYMENT CHECKS FAILED${NC}"
  echo "Fix the issues above before deploying"
  exit 1
fi

echo -e "${GREEN}✅ PRE-DEPLOYMENT CHECKS PASSED${NC}"
echo ""
echo "⚠️  IMPORTANT: Complete manual testing above before deploying"
echo ""
read -p "Have you completed ALL manual tests? (yes/no): " TESTS_DONE

if [[ "$TESTS_DONE" != "yes" ]]; then
  echo -e "${YELLOW}⏸️  Deployment paused. Complete tests first.${NC}"
  exit 1
fi

echo ""
echo "🚀 Ready to deploy!"
echo ""
echo "Choose deployment type:"
echo "  1) Preview (staging)"
echo "  2) Production"
echo "  3) Cancel"
echo ""
read -p "Enter choice (1-3): " DEPLOY_CHOICE

case $DEPLOY_CHOICE in
  1)
    echo "Deploying to preview..."
    npm run deploy:preview
    ;;
  2)
    echo "⚠️  DEPLOYING TO PRODUCTION"
    read -p "Type 'DEPLOY' to confirm: " CONFIRM
    if [[ "$CONFIRM" == "DEPLOY" ]]; then
      git push origin main
      git push --tags
      npm run deploy:prod
      echo ""
      echo -e "${GREEN}✅ Deployed to production${NC}"
      echo ""
      echo "🔍 POST-DEPLOYMENT: Test these immediately on production URL:"
      echo "  1. Dashboard loads"
      echo "  2. No console errors"
      echo "  3. Streak pill works"
      echo "  4. Filter buttons work"
    else
      echo "Deployment cancelled"
    fi
    ;;
  3)
    echo "Deployment cancelled"
    ;;
  *)
    echo "Invalid choice"
    exit 1
    ;;
esac
