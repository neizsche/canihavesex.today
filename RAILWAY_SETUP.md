# Railway + Vercel Setup: Backend at canihavesex.today/api

This guide sets up your backend on Railway and routes it through Vercel at `canihavesex.today/api`.

## Architecture

- **Frontend**: Vercel → `canihavesex.today`
- **Backend**: Railway → Proxied through Vercel → `canihavesex.today/api`
- **Database**: Supabase PostgreSQL

Since frontend and backend are on the same domain, cookies work perfectly with `sameSite: 'lax'` (no cross-domain issues!).

## Step 1: Set Up Supabase Database

1. Go to [supabase.com](https://supabase.com) and create a new project
2. In **Settings** → **Database**, copy the **URI** connection string
3. Replace `[YOUR-PASSWORD]` with your database password:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```

## Step 2: Configure Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create/select a project and enable Google Identity API
3. Create OAuth 2.0 Client ID:
   - **Application type**: Web application
   - **Authorized redirect URIs**: 
     - `https://canihavesex.today/api/auth/oauth/google/callback`
4. Copy **Client ID** and **Client Secret**

## Step 3: Deploy Backend to Railway

1. Go to [railway.app](https://railway.app) and sign up/login
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your repository
4. Railway will detect the repo - click **Add Service**
5. Select **GitHub Repo** again and choose your repo
6. In the service settings:
   - **Root Directory**: Set to `apps/backend`
   - Railway will auto-detect Node.js

## Step 4: Configure Railway Environment Variables

In Railway, go to your service → **Variables** tab and add:

```bash
# Database (from Step 1)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# OAuth (from Step 2)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Security (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
COOKIE_SECRET=your_very_long_random_secret_minimum_32_characters

# Frontend URL
FRONTEND_URL=https://canihavesex.today

# Public URLs (Railway will provide a URL like https://your-app.railway.app)
# We'll use this for the Vercel proxy
PUBLIC_BACKEND_BASE=https://canihavesex.today/api
PUBLIC_APP_BASE=https://canihavesex.today

# Environment
NODE_ENV=production

# Server
PORT=8787
HOST=0.0.0.0

# Logging
LOG_LEVEL=info
PRETTY_LOGS=0

# Proxy (Railway runs behind a proxy)
TRUST_PROXY=1
```

**Important**: 
- Do NOT set `COOKIE_SAMESITE=none` (we're on the same domain!)
- `PUBLIC_BACKEND_BASE` should be `https://canihavesex.today/api` (the Vercel proxy URL)

## Step 5: Get Railway Backend URL

1. In Railway, go to your service
2. Click on the service to open settings
3. Go to **Settings** → **Networking**
4. Railway will provide a URL like: `https://your-app-production.up.railway.app`
5. Copy this URL - this is your **Railway backend URL**

## Step 6: Configure Vercel Rewrites

A `vercel.json` file has been created in your repository root. **Update it** with your Railway URL:

1. Open `vercel.json` in the repo root
2. Replace `https://your-app-production.up.railway.app` with your actual Railway URL from Step 5
3. The file should look like:

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://your-actual-railway-url.up.railway.app/api/:path*"
    }
  ]
}
```

**Important**: Make sure the Railway URL includes `/api/:path*` in the destination (Vercel will forward the path).

## Step 7: Configure Vercel Environment Variables

In your Vercel project settings → **Environment Variables**, add:

```bash
PUBLIC_BACKEND_BASE=https://canihavesex.today/api
PUBLIC_APP_BASE=https://canihavesex.today
```

**Important**: The frontend will use `/api` as the base, which Vercel will proxy to Railway.

## Step 8: Update Frontend Config (if needed)

The frontend should automatically use `PUBLIC_BACKEND_BASE` if set. Verify in `apps/frontend/src/lib/config.ts` that it uses the environment variable.

If `PUBLIC_BACKEND_BASE` is set to `https://canihavesex.today/api`, the frontend will make requests to:
- `/api/session` → Vercel proxies to Railway → `https://your-app.railway.app/api/session`
- `/api/today` → Vercel proxies to Railway → `https://your-app.railway.app/api/today`
- etc.

## Step 9: Deploy and Test

1. **Deploy Railway backend**:
   - Railway will auto-deploy on git push
   - Or manually trigger deployment in Railway dashboard

2. **Deploy Vercel frontend**:
   - Push `vercel.json` to your repo
   - Vercel will auto-deploy

3. **Test the setup**:
   - Visit `https://canihavesex.today`
   - Open browser DevTools → Network tab
   - Click "Sign in with Google"
   - Check that requests go to `canihavesex.today/api/...`
   - After login, check **Application** → **Cookies**
   - Should see `uid` cookie with domain `canihavesex.today`

## Troubleshooting

### Issue: 404 on `/api/*` routes

**Fix**: Check `vercel.json` exists in repo root and Railway URL is correct

### Issue: Backend not responding

**Fix**: 
1. Check Railway service is running
2. Check Railway logs for errors
3. Test Railway URL directly: `https://your-app.railway.app/health`

### Issue: Cookies not working

**Fix**: 
- Since we're on the same domain, cookies should work automatically
- Verify `COOKIE_SAMESITE` is NOT set (should default to 'lax')
- Check browser DevTools → Application → Cookies

### Issue: CORS errors

**Fix**: 
- Since requests go through Vercel proxy, CORS shouldn't be an issue
- But verify `FRONTEND_URL=https://canihavesex.today` in Railway

### Issue: OAuth redirect fails

**Fix**: 
- Verify Google OAuth redirect URI is: `https://canihavesex.today/api/auth/oauth/google/callback`
- Check Railway `PUBLIC_BACKEND_BASE` is set to `https://canihavesex.today/api`

## Benefits of This Setup

✅ **Same-domain cookies** - No cross-domain cookie issues  
✅ **Simple CORS** - No CORS configuration needed  
✅ **Clean URLs** - Backend at `/api` on your main domain  
✅ **Easy to manage** - All traffic through Vercel  

## Next Steps

1. ✅ Set up Supabase database
2. ✅ Configure Google OAuth
3. ✅ Deploy to Railway
4. ✅ Configure Vercel rewrites
5. ✅ Set environment variables
6. ✅ Test login flow
7. ✅ Monitor Railway logs

## Railway Custom Domain (Optional)

If you want to access Railway directly (for debugging), you can:
1. In Railway → Settings → Networking
2. Add a custom domain (e.g., `api.canihavesex.today`)
3. Update DNS to point to Railway
4. But keep using `canihavesex.today/api` for production
