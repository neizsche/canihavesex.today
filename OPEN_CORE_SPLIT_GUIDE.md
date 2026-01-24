# Open Core Migration Guide: Splitting Repositories

This guide provides the instructions (and scripts) to split this single codebase into two separate Git repositories:
1.  **`canihavesex-core` (Public)**: The Open Source foundation.
2.  **`canihavesex-premium` (Private)**: The proprietary overlay (Premium features).

## The Strategy: "Upstream Remote"
We will not create two divergent codebases. Instead, **Premium will be a downstream fork of Core**.
- **Core** is a standard repo.
- **Premium** is a repo that *additionally* tracks the files in `apps/backend/src/features/`.

---

## Phase 1: Prepare the Core (Public)
*You are currently in the Core repository.*

1.  **Verify `.gitignore`**: Ensure strict exclusion of premium files.
    *   `apps/backend/src/features/` must be ignored.
    *   `apps/backend/src/server-premium.ts` must be ignored.
    *   *Status: Already configured in your current workspace.*

2.  **Push Core**:
    ```bash
    git remote add origin https://github.com/your-org/canihavesex-core.git
    git push -u origin main
    ```

---

## Phase 2: Initialize Premium (Private)
*Run these commands in your terminal, passing the path where you want the new repo to live.*

### 1. Verification Script
Copy and save this script as `create_premium_repo.sh` in your CURRENT folder, then run it: `bash create_premium_repo.sh`

```bash
#!/bin/bash
set -e

# Configuration
CORE_REPO_URL="https://github.com/your-org/canihavesex-core.git" # REPLACE THIS
PREMIUM_DIR="../canihavesex-premium"

echo "🚀 Creating Premium Repository at $PREMIUM_DIR..."

# 1. Clone Core as the base
git clone . "$PREMIUM_DIR"

# 2. Go to Premium
cd "$PREMIUM_DIR"

# 3. Re-configure Remotes
# 'origin' will be your private repo
# 'upstream' will be the public core
git remote rename origin upstream
# git remote add origin <YOUR_PRIVATE_REPO_URL>

# 4. Un-ignore Premium Files
# We need to modify .gitignore so git tracks the premium features in THIS repo
sed -i '' '/apps\/backend\/src\/features\//d' .gitignore
sed -i '' '/apps\/backend\/src\/server-premium.ts/d' .gitignore

# 5. Commit the config change
git add .gitignore
git commit -m "chore: enable tracking of premium features"

echo "✅ Premium Repo Initialized!"
echo "   Location: $PREMIUM_DIR"
echo "   To fetch core updates: git pull upstream main"
```

---

## Phase 3: Development Workflow

### Developer A: Working on Open Source Core
1.  Clone `canihavesex-core`.
2.  Run `npm run dev`.
3.  Commit changes. **Core files only.**

### Developer B: Working on Premium Logic
1.  Clone `canihavesex-premium`.
2.  **Sync Core:** `git pull upstream main` (Gets latest core engine/UI).
3.  **Write Premium Code:**
    *   Edit `apps/backend/src/features/ai-prediction.ts`.
    *   Edit `apps/backend/src/server-premium.ts` to register it.
4.  **Commit:** `git add . && git commit`.
    *   This pushes purely premium code + the *merge state* with core.

---

## Phase 4: CI/CD Pipeline

### Core Pipeline
*   Builds Docker Image: `canihavesex/core:latest`

### Premium Pipeline
*   **Dockerfile (Premium):**
    ```dockerfile
    # Start from Core
    FROM canihavesex/core:latest

    # Overlay Premium Files
    COPY apps/backend/src/features /app/apps/backend/src/features
    COPY apps/backend/src/server-premium.ts /app/apps/backend/src/server-premium.ts

    # Re-build Backend (if needed for type bundling) or just restart
    CMD ["npm", "run", "start:premium"]
    ```

This ensures your Premium deployment is always Layer 1 (Core) + Layer 2 (Premium Features).
