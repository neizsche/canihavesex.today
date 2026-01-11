# Fix Vercel "No GitHub account found" Error

## Problem
Vercel check is failing with: "No GitHub account was found matching the commit author email address"

## Solution

### Option 1: Update Git Config (Recommended)

1. Check your current git email:
   ```bash
   git config user.email
   ```

2. Update it to match your GitHub account email:
   ```bash
   git config user.email "nevin.joshy.work@gmail.com"
   git config user.name "Your Name"
   ```

3. For this repository only:
   ```bash
   git config --local user.email "nevin.joshy.work@gmail.com"
   git config --local user.name "Your Name"
   ```

### Option 2: Add Email to GitHub Account

If you want to keep using a different email:

1. Go to GitHub → Settings → Emails
2. Add the email address you're using for commits
3. Verify the email address
4. Make it primary or keep it as a secondary verified email

### Option 3: Amend the Last Commit

If the last commit has the wrong email:

```bash
# Amend the last commit with correct author
git commit --amend --author="Your Name <nevin.joshy.work@gmail.com>"

# Force push (be careful if others are working on this branch)
git push --force
```

**Note**: Only force push if you're the only one working on this branch!

### Option 4: Update Future Commits

For all future commits, set your git config:

```bash
# Global (all repositories)
git config --global user.email "nevin.joshy.work@gmail.com"
git config --global user.name "Your Name"

# Or local (this repository only)
git config --local user.email "nevin.joshy.work@gmail.com"
git config --local user.name "Your Name"
```

## Verify

1. Check your git config:
   ```bash
   git config user.email
   git config user.name
   ```

2. Make a new commit and push:
   ```bash
   git commit --allow-empty -m "test: verify email"
   git push
   ```

3. Check Vercel - the check should pass now

## Quick Fix

Run these commands in your repository:

```bash
git config --local user.email "nevin.joshy.work@gmail.com"
git config --local user.name "Nevin Joshy"
```

Then make a new commit and push.
