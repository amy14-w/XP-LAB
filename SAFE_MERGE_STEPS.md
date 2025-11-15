# Safe Merge: Backend + Frontend (Step-by-Step)

## ⚠️ IMPORTANT: Backup First!

Before doing anything, backup your backend code:
```bash
# Create a backup folder
cd ..
mkdir XP_Lab_Backup
xcopy /E /I XP_Lab XP_Lab_Backup
```

## Step-by-Step Safe Merge

### Step 1: Initialize Git (if not already done)
```bash
cd C:\Python_Codes\XP_Lab
git init
```

### Step 2: Add Remote Repository
```bash
git remote add origin https://github.com/amy14-w/XP-LAB.git
```

### Step 3: Fetch (see what's on GitHub without changing anything)
```bash
git fetch origin
```

### Step 4: Check What's on GitHub
```bash
# See what branches exist
git branch -r

# See what files are on GitHub
git ls-tree -r origin/main --name-only
```

### Step 5: Commit Your Backend Code FIRST
```bash
# Add all your backend files
git add .

# Commit with descriptive message
git commit -m "Add FastAPI backend: authentication, lectures, questions, badges, gamification"
```

### Step 6: Create a Backup Branch (Safety Net)
```bash
# Create a branch with your current work
git branch backend-backup
```

### Step 7: Pull Frontend Code (Merge Strategy)
```bash
# Pull and merge frontend code
git pull origin main --allow-unrelated-histories
```

The `--allow-unrelated-histories` flag is important because your backend and their frontend have separate histories.

### Step 8: Handle Conflicts (if any)

If Git says there are conflicts:
1. Git will list the conflicted files
2. Open each file and look for conflict markers:
   ```
   <<<<<<< HEAD
   Your backend code
   =======
   Their frontend code
   >>>>>>> origin/main
   ```
3. **Keep both** - frontend and backend should coexist
4. Remove the conflict markers
5. Save files

Then:
```bash
git add .
git commit -m "Merge frontend and backend code"
```

### Step 9: Verify Everything is Good
```bash
# Check status
git status

# See what files you have
ls -la

# Make sure both frontend (src/) and backend (app/) exist
```

### Step 10: Push Everything Back
```bash
git push origin main
```

## Alternative: Safer Approach Using a Branch

If you want to be extra safe, use a branch:

```bash
# After Step 5 (committing your backend)
git checkout -b backend-integration

# Pull frontend
git pull origin main --allow-unrelated-histories

# Resolve conflicts if any
# Then push your branch
git push origin backend-integration
```

Then on GitHub:
1. Create a Pull Request
2. Review changes
3. Merge via GitHub UI

## What Files Should Coexist

Your backend structure:
```
XP_Lab/
├── app/              # Your FastAPI backend
├── requirements.txt
├── database_schema.sql
└── ...
```

Their frontend structure:
```
XP_Lab/
├── src/              # Their React frontend
├── package.json
├── vite.config.js
└── ...
```

These should NOT conflict - they're in different directories!

## If Something Goes Wrong

### Undo the pull (before committing merge):
```bash
git merge --abort
```

### Go back to your backup branch:
```bash
git checkout backend-backup
```

### Start over:
```bash
git reset --hard HEAD~1  # Undo last commit
```

## Quick Command Sequence (Copy-Paste)

```bash
# 1. Initialize
git init

# 2. Add remote
git remote add origin https://github.com/amy14-w/XP-LAB.git

# 3. Commit your backend
git add .
git commit -m "Add FastAPI backend"

# 4. Create backup branch
git branch backend-backup

# 5. Pull frontend
git pull origin main --allow-unrelated-histories

# 6. If conflicts, resolve them, then:
git add .
git commit -m "Merge frontend and backend"

# 7. Push
git push origin main
```

