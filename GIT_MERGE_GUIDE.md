# Safe Git Merge Guide

## Step-by-Step Process

### 1. **Check Current Status**
```bash
git status
```
See what files have changed locally.

### 2. **Commit Your Local Changes** (if not already committed)
```bash
# See what changed
git status

# Add all changes
git add .

# Or add specific files
git add app/ test_ui.html

# Commit with a message
git commit -m "Add badges system, improve audio flow, update participation points"
```

### 3. **Fetch Latest from GitHub** (see what's on remote)
```bash
git fetch origin
```
This downloads changes from GitHub without merging them yet.

### 4. **Check What's Different**
```bash
# See commits on GitHub that you don't have locally
git log HEAD..origin/main

# Or if your branch is called 'master'
git log HEAD..origin/master
```

### 5. **Pull and Merge**
```bash
# Pull latest changes and merge
git pull origin main

# Or if your branch is 'master'
git pull origin master
```

### 6. **Handle Conflicts (if any)**
If there are conflicts, Git will tell you. You'll see:
```
CONFLICT (content): Merge conflict in app/main.py
```

**To resolve:**
1. Open the conflicted file(s)
2. Look for conflict markers:
   ```
   <<<<<<< HEAD
   Your local code
   =======
   Code from GitHub
   >>>>>>> origin/main
   ```
3. Edit to keep what you want (or combine both)
4. Remove the conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`)
5. Save the file

**After resolving conflicts:**
```bash
# Mark conflicts as resolved
git add <resolved-file>

# Complete the merge
git commit -m "Merge remote changes with local updates"
```

### 7. **Push Your Merged Code**
```bash
git push origin main
# Or: git push origin master
```

## Alternative: Using a Branch (Safer)

### Create a branch for your changes:
```bash
# Create and switch to new branch
git checkout -b feature-updates

# Commit your changes
git add .
git commit -m "Your changes"

# Push branch to GitHub
git push origin feature-updates
```

### Then merge on GitHub:
1. Go to GitHub website
2. Create a Pull Request
3. Review changes
4. Merge via GitHub UI

## Quick Safe Method (Recommended)

```bash
# 1. Save your work
git add .
git commit -m "Local changes before merge"

# 2. Get latest from GitHub
git fetch origin

# 3. Merge safely
git pull origin main --no-rebase

# 4. If conflicts, resolve them, then:
git add .
git commit -m "Resolved merge conflicts"

# 5. Push
git push origin main
```

## If Something Goes Wrong

### Undo the merge (before committing):
```bash
git merge --abort
```

### Go back to before pull:
```bash
git reset --hard HEAD~1
```

### See what changed:
```bash
git diff
git log --oneline --graph
```

