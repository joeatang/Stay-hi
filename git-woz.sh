#!/bin/bash
# 🎯 WOZNIAK-GRADE: Git Workflow Helper
# Usage: ./git-woz.sh "Your commit message"

set -e  # Exit on any error

echo "🔍 WOZNIAK GIT WORKFLOW STARTING..."

# 1. Check git status first
echo "📊 Checking repository status..."
git status --porcelain

# 2. Stage all changes
echo "📦 Staging all changes..."
git add .

# 3. Show what will be committed
echo "🎯 Files to be committed:"
git diff --cached --name-only

# 4. Commit with provided message or default
COMMIT_MSG="${1:-"WIP: Automated commit $(date +%Y%m%d-%H%M)"}"
echo "💾 Committing with message: $COMMIT_MSG"
git commit -m "$COMMIT_MSG"

# 5. Show recent commits
echo "✅ Recent commits:"
git log --oneline -5

echo "🚀 WOZNIAK GIT WORKFLOW COMPLETE!"
echo "💡 Next step: Run 'git push' when ready to sync"