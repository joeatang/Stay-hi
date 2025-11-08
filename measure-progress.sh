#!/bin/bash
# HI-DEV JR PROGRESS TRACKER
# Quick progress measurement and decision making

set -e

echo "📊 HI-DEV JR PROGRESS MEASUREMENT"
echo "================================="

# Find the most recent task file
LATEST_TASK=$(ls -t plans/tasks/*.md 2>/dev/null | head -1)

if [ -z "$LATEST_TASK" ]; then
    echo "❌ No active tasks found. Run ./activate-task.sh first."
    exit 1
fi

echo "📋 Current Task: $(basename "$LATEST_TASK")"
echo ""

# Get progress measurement
echo "🔢 PROGRESS MEASUREMENT:"
echo "Rate each component (0-100):"
echo ""

read -p "E (Effectiveness - does it work?): " E
read -p "N (Necessity - solves real problem?): " N  
read -p "V (Verifiability - can we prove it works?): " V
read -p "B (Beauty - clean, maintainable code?): " B
read -p "T (Testability - easy to verify/debug?): " T

# Calculate progress using Hi-OS formula
PROGRESS=$(echo "scale=1; (0.30*$E + 0.20*$N + 0.20*$V + 0.20*$B + 0.10*$T)" | bc)

# Extract target from task file
TARGET=$(grep "Target:" "$LATEST_TASK" | sed 's/.*Target: \([0-9]*\)%.*/\1/')

echo ""
echo "📊 RESULTS:"
echo "=========="
echo "Progress: ${PROGRESS}%"
echo "Target: ${TARGET}%"

# Decision logic
if (( $(echo "$PROGRESS >= $TARGET" | bc -l) )); then
    echo "✅ SUCCESS: Target achieved!"
    STATUS="SUCCESS"
elif (( $(echo "$PROGRESS >= 85" | bc -l) )); then
    echo "🎉 EXCELLENT: Above 85% - ship it!"
    STATUS="SHIP"
elif (( $(echo "$PROGRESS >= 50" | bc -l) )); then
    echo "⚠️  ATTEMPT 2 RECOMMENDED: Salvageable with refinement"
    STATUS="ATTEMPT2"
else
    echo "🚨 PIVOT REQUIRED: Fundamental approach needs change"
    STATUS="PIVOT"
fi

echo ""
read -p "Evidence/Notes for this measurement: " EVIDENCE

# Update task file
echo "" >> "$LATEST_TASK"
echo "**Progress Update $(date +"%H:%M:%S"):** ${PROGRESS}% / ${TARGET}%" >> "$LATEST_TASK"
echo "**Evidence:** $EVIDENCE" >> "$LATEST_TASK"
echo "**Status:** $STATUS" >> "$LATEST_TASK"

echo ""
echo "🔄 NEXT STEPS:"
case $STATUS in
    SUCCESS|SHIP)
        echo "1. Complete any final polish"
        echo "2. Commit with Tesla-grade message"
        echo "3. Move to next priority"
        ;;
    ATTEMPT2)
        echo "1. Identify root cause of gaps"
        echo "2. Reduce scope by 50%"
        echo "3. Execute refined approach"
        echo "4. Re-measure progress"
        ;;
    PIVOT)
        echo "1. Step back and reassess problem"
        echo "2. Consider different approach entirely"
        echo "3. May need to defer or redesign"
        echo "4. Consult Hi-OS priorities"
        ;;
esac

echo ""
echo "📝 Task file updated: $LATEST_TASK"