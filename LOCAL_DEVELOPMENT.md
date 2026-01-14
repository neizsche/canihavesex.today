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

The app uses environment-specific configuration files:
- **`.env.development`** - Auto-loaded in development mode
- **`.env.production`** - Template for production (set in hosting platform)
- **`.env`** - Your local secrets (overrides environment files)

### Setup Instructions

1. Copy the example file to create your local secrets file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your secrets:
   ```bash
   # OAuth credentials (from Step 2)
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   
   # Security (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
   COOKIE_SECRET=your_very_long_random_secret_minimum_32_characters
   

   
   # Optional: Override any development defaults from .env.development
   # DATABASE_URL=postgresql://postgres.[PROJECT]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```

3. **That's it!** The `.env.development` file already has all the development configuration:
   - Local URLs (localhost:3112 for frontend, localhost:1299 for backend)
   - Debug logging enabled
   - SQLite database for quick local testing
   
   You only need to add your secrets to `.env`.

### Environment File Loading

The app automatically loads the correct configuration based on `NODE_ENV`:

```
NODE_ENV=development → loads .env.development, then .env
NODE_ENV=production  → loads .env.production, then .env
```

Platform env vars always take precedence over file-based config.


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
- **Auto-load `.env.development`** (confirmed in console)
- Load your secrets from `.env` file
- Connect to your PostgreSQL database (or SQLite if not configured)
- Run database migrations automatically
- Enable hot-reload with `tsx watch`
- Show "🚀 Backend starting in DEVELOPMENT mode" in the console


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
- Connect to local backend at `http://localhost:1299` (from `.env.development`)
- Enable hot-reload
- Show "🎨 Frontend running in DEVELOPMENT mode" in browser console


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

### Environment File Structure

- **`.env.development`** - Development defaults (auto-loaded, committed to git)
- **`.env.production`** - Production template (not used locally, reference only)
- **`.env`** - Your local secrets (never committed, overrides above files)

### Required Secrets (add to `.env`)

- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret  
- `COOKIE_SECRET` - Random 32+ character string for cookie signing

### Development Defaults (from `.env.development`)

These are pre-configured for local development:

- `NODE_ENV=development`
- `PUBLIC_BACKEND_BASE=http://localhost:1299`
- `PUBLIC_APP_BASE=http://localhost:3112`
- `FRONTEND_URL=http://localhost:3112`
- `BACKEND_PORT=1299`
- `FRONTEND_PORT=3112`
- `LOG_LEVEL=debug`
- `PRETTY_LOGS=1`
- `SQLITE_PATH=dev.db`

You can override any of these in your local `.env` file if needed.

### Frontend Environment Variables

Frontend variables must be prefixed with `PUBLIC_` to be available in the browser:

- `PUBLIC_BACKEND_BASE` - Backend API URL
- `PUBLIC_APP_BASE` - App base URL

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

## Switching Between Environments

The app automatically switches based on `NODE_ENV`:

### Development (Local)
```bash
NODE_ENV=development  # Auto-loads .env.development
```
- Backend: `http://localhost:1299`
- Frontend: `http://localhost:3112`
- Database: SQLite (`dev.db`) or PostgreSQL if configured
- Logging: Debug level, pretty printed

### Production (Deployed)
```bash
NODE_ENV=production  # Auto-loads .env.production
```
- Backend: Railway deployment (e.g., `https://api.canihavesex.today`)
- Frontend: Vercel deployment (e.g., `https://canihavesex.today`)
- Database: Production PostgreSQL
- Logging: Info level, JSON format

**No manual toggling needed!** Just set `NODE_ENV` and the correct config loads automatically.

## Next Steps

1. ✅ Set up `.env` file
2. ✅ Configure Google OAuth for localhost
3. ✅ Run `npm install`
4. ✅ Start backend: `npm run dev:backend`
5. ✅ Start frontend: `npm run dev:frontend`
6. ✅ Visit `http://localhost:3112` and test!
