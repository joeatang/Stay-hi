# 🎯 WOZNIAK-GRADE Git Standards for Hi Island Project

## Commit Message Format
```
TYPE: Brief description (50 chars max)

- Detailed bullet points if needed
- Keep lines under 72 characters
- Use present tense ("Add feature" not "Added feature")
```

## Commit Types
- `FEAT`: New features
- `FIX`: Bug fixes  
- `REFACTOR`: Code restructuring
- `DOCS`: Documentation updates
- `TEST`: Testing improvements
- `CHORE`: Maintenance tasks

## Example Good Commits
```bash
git commit -m "FEAT: Add auth-required HiShareSheet

- Replace anonymous sharing with auth prompts
- Add HiGoldStandardModal for consistent UX
- Implement cache-busting for reliable updates"
```

## Recovery Commands
```bash
# If commit hangs or fails:
git reset --soft HEAD~1    # Undo last commit, keep changes staged
git status                 # Check what's happening
git add .                  # Re-stage if needed
git commit -m "New message"  # Try again with shorter message

# If completely stuck:
git stash                  # Save work temporarily  
git reset --hard HEAD      # Nuclear option - start clean
git stash pop              # Restore your work
```

## Automation Tools
```bash
# Use the Wozniak helper:
./git-woz.sh "Your commit message"

# For quick WIP commits:
./git-woz.sh  # Uses auto-generated timestamp message
```

## Branch Protection
```bash
# Always work on feature branches for big changes:
git checkout -b feature/modal-system
# Make changes...
./git-woz.sh "FEAT: New modal system"
git checkout main
git merge feature/modal-system
```