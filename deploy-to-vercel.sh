#!/bin/bash
# 🚀 TESLA-GRADE VERCEL DEPLOYMENT SCRIPT
# Production-ready deployment with safety checks and monitoring

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 TESLA-GRADE VERCEL DEPLOYMENT STARTING...${NC}"
echo "======================================================="

# 1. PRE-DEPLOYMENT SAFETY CHECKS
echo -e "${YELLOW}📋 Step 1: Pre-deployment Safety Checks${NC}"

# Check if we're on the right branch
CURRENT_BRANCH=$(git branch --show-current)
echo "Current branch: $CURRENT_BRANCH"

if [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "master" ]; then
    read -p "⚠️  You're not on main branch. Continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}❌ Deployment cancelled${NC}"
        exit 1
    fi
fi

# Check if working directory is clean
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${RED}❌ Working directory not clean. Commit changes first.${NC}"
    git status --short
    exit 1
fi

echo -e "${GREEN}✅ Git status clean${NC}"

# 2. RUN LOCAL TESTS
echo -e "${YELLOW}📋 Step 2: Running Local Tests${NC}"

# Start local server for testing
echo "Starting local server for testing..."
pkill -f "python3 -m http.server" 2>/dev/null || true
sleep 2

# Start server in background
cd "$(dirname "$0")"
python3 -m http.server 8000 --directory public > /dev/null 2>&1 &
SERVER_PID=$!
sleep 3

# Health check function
health_check() {
    local url=$1
    local name=$2
    local status_code=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    if [ "$status_code" -eq 200 ]; then
        echo -e "${GREEN}✅ $name: OK${NC}"
        return 0
    else
        echo -e "${RED}❌ $name: FAILED (HTTP $status_code)${NC}"
        return 1
    fi
}

# Test critical pages
echo "Testing critical pages..."
FAILED_TESTS=0

health_check "http://localhost:8000/welcome.html" "Welcome Page" || ((FAILED_TESTS++))
health_check "http://localhost:8000/signin.html" "Sign In Page" || ((FAILED_TESTS++))
health_check "http://localhost:8000/signup.html" "Sign Up Page" || ((FAILED_TESTS++))
health_check "http://localhost:8000/hi-island-NEW.html" "Hi Island" || ((FAILED_TESTS++))
health_check "http://localhost:8000/assets/auth-guard.js" "Auth Guard" || ((FAILED_TESTS++))
health_check "http://localhost:8000/components/hi-share-sheet/share-sheet.js" "Share Sheet" || ((FAILED_TESTS++))

# Stop local server
kill $SERVER_PID 2>/dev/null || true

if [ $FAILED_TESTS -gt 0 ]; then
    echo -e "${RED}❌ $FAILED_TESTS tests failed. Fix issues before deployment.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All local tests passed${NC}"

# 3. CHECK VERCEL CLI
echo -e "${YELLOW}📋 Step 3: Vercel CLI Check${NC}"

if ! command -v vercel &> /dev/null; then
    echo -e "${RED}❌ Vercel CLI not found. Install with: npm i -g vercel${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Vercel CLI ready${NC}"

# 4. DEPLOYMENT CONFIRMATION
echo -e "${YELLOW}📋 Step 4: Deployment Confirmation${NC}"
echo "About to deploy to Vercel:"
echo "  • Branch: $CURRENT_BRANCH"
echo "  • Directory: $(pwd)"
echo "  • Files: $(find public -name "*.html" | wc -l) HTML files"
echo "  • Assets: $(find public/assets -name "*.js" | wc -l) JS files"

read -p "🚀 Deploy to production? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}❌ Deployment cancelled${NC}"
    exit 1
fi

# 5. DEPLOY TO VERCEL
echo -e "${YELLOW}📋 Step 5: Deploying to Vercel${NC}"

# Deploy with production flag
vercel --prod

# 6. POST-DEPLOYMENT CHECKS
echo -e "${YELLOW}📋 Step 6: Post-deployment Verification${NC}"

echo "Waiting for deployment to propagate..."
sleep 10

# Get deployment URL (this would need to be customized based on your domain)
DEPLOYMENT_URL="https://stayhi.vercel.app"  # Update with your actual domain

echo "Testing production deployment..."

# Test production endpoints
production_health_check() {
    local path=$1
    local name=$2
    local url="${DEPLOYMENT_URL}${path}"
    local status_code=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    if [ "$status_code" -eq 200 ]; then
        echo -e "${GREEN}✅ Production $name: OK${NC}"
        return 0
    else
        echo -e "${RED}❌ Production $name: FAILED (HTTP $status_code)${NC}"
        echo "URL: $url"
        return 1
    fi
}

PROD_FAILED=0
production_health_check "/" "Root" || ((PROD_FAILED++))
production_health_check "/welcome.html" "Welcome" || ((PROD_FAILED++))
production_health_check "/signin.html" "Sign In" || ((PROD_FAILED++))
production_health_check "/assets/auth-guard.js" "Auth Guard" || ((PROD_FAILED++))

if [ $PROD_FAILED -gt 0 ]; then
    echo -e "${RED}❌ Production validation failed. Check deployment.${NC}"
    echo "You may need to:"
    echo "  • Check Vercel dashboard for deployment status"
    echo "  • Verify DNS settings"
    echo "  • Review deployment logs"
    exit 1
fi

# 7. SUCCESS SUMMARY
echo -e "${GREEN}🎉 TESLA-GRADE DEPLOYMENT SUCCESSFUL!${NC}"
echo "======================================================="
echo -e "${GREEN}✅ All systems operational${NC}"
echo -e "${GREEN}✅ Production validation passed${NC}"
echo -e "${GREEN}✅ Stay Hi is live and ready!${NC}"
echo ""
echo "🔗 Production URL: $DEPLOYMENT_URL"
echo "📊 Vercel Dashboard: https://vercel.com/dashboard"
echo "🐛 Issues? Check: https://vercel.com/docs/troubleshooting"
echo ""
echo -e "${BLUE}📈 Monitor your app:${NC}"
echo "  • Vercel Analytics for performance"
echo "  • Supabase Dashboard for database"
echo "  • Browser DevTools for client issues"
echo ""
echo -e "${YELLOW}🚨 Emergency rollback:${NC}"
echo "  vercel rollback [deployment-url]"
echo ""
echo -e "${GREEN}🌟 Happy launching! 🚀${NC}"