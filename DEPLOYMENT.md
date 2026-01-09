# Deployment Guide

## Frontend (Astro/Vite)

### Environment Variables

Create `.env` file in `/apps/frontend/`:

```bash
# Backend API URL (required for production)
PUBLIC_API_BASE=https://your-backend-domain.com

# Optional: Google Analytics, etc.
# GA_TRACKING_ID=your_google_analytics_id
```

**Important**: The frontend configuration now automatically handles multiple hosting platforms (Vercel, Netlify, Railway, Render, Fly.io, Digital Ocean) to prevent "domain blocked" errors.

### Hosting Platforms

The configuration supports multiple hosting platforms:

- **Vercel**: Automatically detected
- **Netlify**: Automatically detected
- **Railway**: Automatically detected
- **Render**: Automatically detected
- **Fly.io**: Automatically detected
- **Digital Ocean**: Automatically detected

### Build Command

```bash
cd apps/frontend
npm run build
```

## Backend (Fastify)

### Environment Variables

Create `.env` file in `/apps/backend/`:

```bash
# Database (required)
DATABASE_URL=postgresql://username:password@host:port/database

# OAuth (required for authentication)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Security (required - generate a long random string)
COOKIE_SECRET=your_very_long_random_secret_minimum_32_characters

# Frontend URL (required for production CORS)
FRONTEND_URL=https://your-frontend-domain.com

# Admin (optional)
ADMIN_TOKEN=your_admin_token

# Server (optional - defaults provided)
PORT=8787
HOST=0.0.0.0
NODE_ENV=production
LOG_LEVEL=info
PRETTY_LOGS=0

# Public URLs (for email links, etc.)
PUBLIC_BACKEND_BASE=https://your-backend-domain.com
PUBLIC_APP_BASE=https://your-frontend-domain.com
```

### CORS Configuration

The backend automatically handles CORS based on `NODE_ENV`:

- **Development**: `origin: true` (allows all origins)
- **Production**: `origin: FRONTEND_URL` (only allows your frontend domain)

### Build and Deploy

```bash
cd apps/backend
npm run build
npm start
```

## Common Issues & Solutions

### 1. "Domain is blocked" Vite Error

**Problem**: Vite blocks requests from unknown domains in production, causing "domain blocked" errors.

**Solution**: The configuration now includes support for major hosting platforms:
- Vercel (.vercel.app)
- Netlify (.netlify.app, .netlify.dev)
- Railway (.railway.app)
- Render (.onrender.com)
- Fly.io (.fly.dev)
- Digital Ocean (.ondigitalocean.app)

If using a different hosting platform, add your domain to the `allowedHosts` array in `astro.config.mjs`:

```javascript
allowedHosts: [
  'canihavesex.today',
  'www.canihavesex.today',
  'your-custom-domain.com',
  // ... existing platforms
],
```

### 2. Backend CORS Issues

**Problem**: Backend rejects requests with CORS errors.

**Solution**:
- Ensure `FRONTEND_URL` environment variable matches your frontend domain exactly
- Include `https://` protocol
- For development: CORS allows all origins
- For production: Only the specified `FRONTEND_URL` is allowed

### 2. CORS Errors

**Problem**: Backend rejects requests from frontend.

**Solution**:
- Ensure `FRONTEND_URL` environment variable is set correctly in backend
- Make sure the frontend domain matches exactly (including https://)
- Check that cookies are being sent (`credentials: true`)

### 3. Authentication Issues

**Problem**: Google OAuth or session cookies not working.

**Solution**:
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
- Check `COOKIE_SECRET` is set (minimum 32 characters)
- Ensure OAuth redirect URIs include your production domain
- Verify `PUBLIC_APP_BASE` is set correctly for email links

### 4. Environment Variables Not Loading

**Problem**: `.env` file not being read.

**Solution**:
- Ensure `.env` file exists in the correct directory (`/apps/backend/`)
- Check that environment variables are prefixed correctly (no `PUBLIC_` for backend)
- Restart the application after adding new variables

## Hosting Platform Specific Setup

### Vercel

**Frontend**:
- Set `PUBLIC_API_BASE` to your backend URL
- Vercel automatically handles the build

**Backend**:
- Use Vercel Serverless Functions or deploy to Railway/Render
- Set all required environment variables

### Netlify

**Frontend**:
- Set `PUBLIC_API_BASE` in Netlify environment variables
- Use Netlify's build settings

**Backend**:
- Deploy backend separately (Railway, Render, etc.)
- Set `FRONTEND_URL` to your Netlify domain

### Railway/Render

**Full Stack**:
- Deploy both frontend and backend to the same platform
- Set `FRONTEND_URL` to your frontend domain
- Set `PUBLIC_API_BASE` to your backend domain (may be same if using Railway)

## Domain Configuration

### DNS Setup

Ensure your domain points to your hosting provider:

```
canihavesex.today     -> Frontend hosting (Vercel/Netlify/etc.)
api.canihavesex.today -> Backend hosting (Railway/Render/etc.)
```

### SSL Certificates

Most hosting platforms provide automatic SSL certificates. Ensure your domains have valid certificates.

## Testing Production Build

Before deploying, test locally with production settings:

```bash
# Frontend
cd apps/frontend
PUBLIC_API_BASE=https://your-backend-domain.com npm run build

# Backend
cd apps/backend
NODE_ENV=production FRONTEND_URL=https://your-frontend-domain.com npm run build
```

## Monitoring & Logs

- Check application logs for errors
- Monitor CORS headers in browser dev tools
- Verify API endpoints are accessible
- Test authentication flow end-to-end

## Support

If you encounter issues not covered here, check:
1. Environment variables are set correctly
2. Domains are properly configured
3. SSL certificates are valid
4. CORS headers are present in API responses