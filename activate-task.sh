#!/bin/bash
# HI-DEV JR TASK ACTIVATION SCRIPT
# Enforces Tesla-Grade discipline and progress measurement

set -e

echo "🚀 HI-DEV JR PREFLIGHT ACTIVATION"
echo "=================================="

# Check if we're in the right directory
if [ ! -f "plans/HI-DEV-JR-PREFLIGHT.md" ]; then
    echo "❌ ERROR: Must run from Stay-hi root directory"
    exit 1
fi

# Prompt for task details
echo ""
echo "📝 TASK DECLARATION:"
read -p "Task Description: " TASK_DESC
echo ""
echo "Priority Levels:"
echo "  P0 (Critical)  - 85% threshold - Production issues, security, core failures"
echo "  P1 (Valuable)  - 75% threshold - Performance, UX, architecture improvements"  
echo "  P2 (Bonus)     - 65% threshold - Code org, docs, future-proofing"
echo ""
read -p "Priority [P0/P1/P2]: " PRIORITY

# Set target based on priority
case $PRIORITY in
    P0) TARGET=85 ;;
    P1) TARGET=75 ;;
    P2) TARGET=65 ;;
    *) echo "❌ Invalid priority. Use P0, P1, or P2"; exit 1 ;;
esac

echo ""
read -p "Files to modify (≤2, comma-separated): " FILES
echo ""
echo "🎯 PREFLIGHT CHECKLIST:"
echo ""

# Critical thinking audit
echo "PHASE 1: CRITICAL THINKING AUDIT"
read -p "✅ Problem Definition (what specific issue does this solve?): " PROBLEM
read -p "✅ Hi-OS Alignment (how does this advance unified Hi-OS vision?): " ALIGNMENT
read -p "✅ Two-File Discipline confirmed? [y/n]: " TWOFILE
read -p "✅ Rollback plan (git revert HEAD sufficient?): " ROLLBACK

if [ "$TWOFILE" != "y" ]; then
    echo "❌ PREFLIGHT FAILED: Must stay within ≤2 files discipline"
    exit 1
fi

echo ""
echo "PHASE 2: PROGRESS MEASUREMENT SETUP"
read -p "✅ Success metrics (E/N/V/B/T criteria): " METRICS
read -p "✅ Measurement method (how will you track progress?): " MEASUREMENT
read -p "✅ 100% definition (what does complete look like?): " COMPLETE

echo ""
echo "PHASE 3: RISK ASSESSMENT"
read -p "✅ Dependency impact assessment: " DEPENDENCIES
read -p "✅ Production safety confirmed? [y/n]: " PRODSAFE
read -p "✅ Attempt 2 pivot plan if <50% progress: " PIVOT

if [ "$PRODSAFE" != "y" ]; then
    echo "⚠️  WARNING: Non-production-safe task detected"
    read -p "Continue anyway? [y/n]: " CONTINUE
    if [ "$CONTINUE" != "y" ]; then
        echo "❌ PREFLIGHT ABORTED: Production safety required"
        exit 1
    fi
fi

# Generate timestamp
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

# Create task tracking file
TASK_FILE="plans/tasks/$(date +%Y%m%d-%H%M%S)-$(echo "$TASK_DESC" | tr ' ' '-' | tr '[:upper:]' '[:lower:]' | head -c 20).md"
mkdir -p plans/tasks

cat > "$TASK_FILE" << EOF
# HI-DEV JR TASK: $TASK_DESC
**Started:** $TIMESTAMP  
**Priority:** $PRIORITY (Target: $TARGET%)  
**Files:** $FILES  

## 📋 PREFLIGHT RESULTS

### Critical Thinking Audit
- **Problem:** $PROBLEM
- **Hi-OS Alignment:** $ALIGNMENT  
- **Two-File Discipline:** ✅ Confirmed
- **Rollback Plan:** $ROLLBACK

### Progress Measurement
- **Success Metrics:** $METRICS
- **Measurement Method:** $MEASUREMENT
- **100% Definition:** $COMPLETE

### Risk Assessment  
- **Dependencies:** $DEPENDENCIES
- **Production Safe:** $PRODSAFE
- **Pivot Plan:** $PIVOT

## 🔄 EXECUTION LOG

### ATTEMPT 1
- **Status:** IN_PROGRESS
- **Progress:** _% / $TARGET%
- **Evidence:** 
- **Notes:** 

### ATTEMPT 2 (if needed)
- **Status:** 
- **Progress:** _% / $TARGET%  
- **Evidence:**
- **Notes:**

## 📊 FINAL RESULTS
- **Final Progress:** _% 
- **Outcome:** [SUCCESS/PIVOT/DEFER]
- **Lessons Learned:**
- **Next Steps:**
EOF

echo ""
echo "✅ PREFLIGHT COMPLETE"
echo "===================="
echo "Task file created: $TASK_FILE"
echo "Target threshold: $TARGET%"
echo "Max attempts: 2"
echo ""
echo "🚀 CLEARED FOR EXECUTION"
echo "Remember: Perfect is the enemy of shipped!"
echo "Focus on Hi-OS ecosystem advancement over individual task perfection."
echo ""

# Open the task file for editing
if command -v code > /dev/null; then
    code "$TASK_FILE"
    echo "📝 Task file opened in VS Code for progress tracking"
fi