# Local Development Setup

This guide helps you set up local development while your production app is deployed on Railway (backend) and Vercel (frontend).

## Prerequisites

1. **Node.js** (v18 or higher)
2. **PostgreSQL Database** - Use Supabase (recommended) or local PostgreSQL
3. **Google OAuth Credentials** - For authentication

## Step 1: Set Up Database

### Option A: Use Supabase (Recommended - Same as Production)

1. Use your existing Supabase project or create a new one
2. Go to **Settings** → **Database** → **Connection Pooling**
3. Copy the **Transaction** mode connection string (port 6543)
4. This is your `DATABASE_URL` for local development

**Benefits**: Same database as production, easy to test with real data

### Option B: Local PostgreSQL

1. Install PostgreSQL locally
2. Create a database: `createdb canihavesex_dev`
3. Use connection string: `postgresql://localhost:5432/canihavesex_dev`

## Step 2: Configure Google OAuth for Local Development

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project
3. Go to **APIs & Services** → **Credentials**
4. Edit your OAuth 2.0 Client ID
5. Add to **Authorized redirect URIs**:
   ```
   http://localhost:1299/api/auth/oauth/google/callback
   ```
6. Save the changes

**Note**: You can have both production and localhost redirect URIs in the same OAuth client.

## Step 3: Set Up Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and fill in your values:

```bash
# Database (from Step 1)
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres

# OAuth (from Step 2)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Security (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
COOKIE_SECRET=your_very_long_random_secret_minimum_32_characters

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3112

# Public URLs (for OAuth redirects)
PUBLIC_BACKEND_BASE=http://localhost:1299
PUBLIC_APP_BASE=http://localhost:3112

# Environment
NODE_ENV=development

# Optional: Logging
LOG_LEVEL=debug
PRETTY_LOGS=1
```

## Step 4: Install Dependencies

From the repository root:

```bash
npm install
```

## Step 5: Run Backend Locally

```bash
# From repo root
npm run dev:backend

# Or from apps/backend directory
cd apps/backend
npm run dev
```

The backend will:
- Start on `http://localhost:1299`
- Load environment variables from `.env` file
- Connect to your PostgreSQL database
- Run database migrations automatically
- Enable hot-reload with `tsx watch`

## Step 6: Run Frontend Locally

In a **new terminal**, from the repository root:

```bash
npm run dev:frontend

# Or from apps/frontend directory
cd apps/frontend
npm run dev
```

The frontend will:
- Start on `http://localhost:3112`
- Connect to local backend at `http://localhost:1299` (default)
- Enable hot-reload

## Step 7: Run Both Together

From the repository root:

```bash
npm run dev
```

This runs both backend and frontend concurrently.

## Development Workflow

### Making Changes

1. **Backend changes**: Edit files in `apps/backend/src/`
   - Changes auto-reload (thanks to `tsx watch`)
   - Check terminal for errors

2. **Frontend changes**: Edit files in `apps/frontend/src/`
   - Changes auto-reload
   - Check browser console for errors

### Testing OAuth Locally

1. Visit `http://localhost:3112`
2. Click "Sign in with Google"
3. Should redirect to Google OAuth
4. After authentication, redirects back to `http://localhost:3112`

### Database Migrations

Migrations run automatically when the backend starts. If you need to reset:

1. Drop and recreate your database (or use Supabase SQL editor)
2. Restart the backend - migrations will run automatically

### Seeding Test Data

To seed test data:

```bash
cd apps/backend
npm run seed:perfect
```

This creates a test user with perfect cycle data for testing.

## Environment Variables Reference

### Required for Backend

- `DATABASE_URL` - PostgreSQL connection string
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `COOKIE_SECRET` - Random 32+ character string for cookie signing

### Optional for Backend

- `PORT` - Backend port (default: 1299)
- `HOST` - Backend host (default: 0.0.0.0)
- `LOG_LEVEL` - Logging level (default: debug in dev)
- `PRETTY_LOGS` - Enable pretty logging (default: 1 in dev)
- `ADMIN_TOKEN` - Admin access token
- `FRONTEND_URL` - Frontend URL for CORS (default: http://localhost:3112)
- `PUBLIC_BACKEND_BASE` - Public backend URL (default: http://localhost:1299)
- `PUBLIC_APP_BASE` - Public app URL (default: http://localhost:3112)

### Frontend Environment Variables

The frontend reads from `.env` file in the repo root. Variables prefixed with `PUBLIC_` are available in the browser:

- `PUBLIC_BACKEND_BASE` - Backend API URL (default: http://localhost:1299 in dev)
- `PUBLIC_APP_BASE` - App base URL (default: http://localhost:3112)

## Troubleshooting

### Backend won't start - "DATABASE_URL is required"

**Fix**: Make sure `.env` file exists in repo root with `DATABASE_URL` set

### Backend won't connect to database

**Fix**: 
- Verify `DATABASE_URL` is correct
- Check database is accessible (Supabase dashboard → check connection)
- For Supabase, use Connection Pooling URL (not direct connection)

### OAuth redirect fails locally

**Fix**:
- Verify `http://localhost:1299/api/auth/oauth/google/callback` is in Google OAuth redirect URIs
- Check `PUBLIC_BACKEND_BASE=http://localhost:1299` in `.env`

### Frontend can't connect to backend

**Fix**:
- Verify backend is running on `http://localhost:1299`
- Check `PUBLIC_BACKEND_BASE` in `.env` (or leave unset for default)
- Check browser console for CORS errors
- Verify `FRONTEND_URL=http://localhost:3112` in backend `.env`

### Port already in use

**Fix**:
- Backend: Change `PORT` in `.env` or kill process using port 1299
- Frontend: Change port in `apps/frontend/package.json` or kill process using port 3112

## Development Tips

1. **Use Supabase for local dev**: Same database as production, easy to test
2. **Keep `.env` in `.gitignore`**: Never commit secrets
3. **Use different OAuth client for dev**: Or add localhost to production client
4. **Check logs**: Backend logs show database queries and errors
5. **Hot reload**: Both frontend and backend support hot reload

## Switching Between Local and Production

### Working Locally
- Backend: `http://localhost:1299`
- Frontend: `http://localhost:3112`
- Database: Your Supabase dev database

### Testing Production
- Backend: Railway deployment
- Frontend: Vercel deployment
- Database: Production Supabase database

You can switch by:
- **Local**: Use `.env` file with localhost URLs
- **Production**: Deploy to Railway/Vercel with production environment variables

## Next Steps

1. ✅ Set up `.env` file
2. ✅ Configure Google OAuth for localhost
3. ✅ Run `npm install`
4. ✅ Start backend: `npm run dev:backend`
5. ✅ Start frontend: `npm run dev:frontend`
6. ✅ Visit `http://localhost:3112` and test!
