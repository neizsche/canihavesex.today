# Frontend Application

Astro-based frontend for the fertility tracking app. Connects to a Fastify backend API.

## Features

- ✅ **React Components** - Modern UI with TypeScript
- ✅ **Progressive Web App** - Offline-capable with service worker
- ✅ **Responsive Design** - Works on mobile and desktop
- ✅ **Authentication** - Google OAuth integration
- ✅ **Real-time Data** - Fertility tracking and charting

## Environment Configuration

Create a `.env` file in this directory with the following variables:

```bash
# Backend API URL (required)
# For production with Vercel proxy: use /api (relative path)
# For direct backend: use full URL
PUBLIC_BACKEND_BASE=/api

# Google Analytics (optional)
PUBLIC_GA_TRACKING_ID=your_tracking_id

# App configuration
PUBLIC_APP_NAME="Can I Have Sex Today"
PUBLIC_APP_BASE=https://canihavesex.today
```

## Building and Deployment

### Local Development
```bash
npm install
npm run dev
```

### Production Build
```bash
npm run build
```

### Deployment Options

#### Vercel (Recommended)
```bash
# Install Vercel CLI
npm install -g vercel

# Login and deploy
vercel login
cd apps/frontend
vercel --yes

# Add custom domain
vercel domains add canihavesex.today
```

#### Netlify
```bash
# Drag & drop the dist/ folder to Netlify dashboard
# Or use Netlify CLI
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

#### Other Platforms
The app is configured to work with:
- Railway
- Render
- Fly.io
- Digital Ocean App Platform

## API Integration

The frontend connects directly to the Fastify backend API:

- **Authentication**: Google OAuth via backend
- **Data Storage**: PostgreSQL via backend
- **Real-time Updates**: Direct API calls for all operations

## Configuration Reference

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PUBLIC_BACKEND_BASE` | `/api` (production) or `http://localhost:1299` (dev) | Backend API URL |
| `PUBLIC_GA_TRACKING_ID` | - | Google Analytics tracking ID |
| `PUBLIC_APP_NAME` | `"Can I Have Sex Today"` | App display name |
| `PUBLIC_APP_BASE` | `https://canihavesex.today` | Frontend base URL |

## Development

### File Structure
```
src/
├── components/     # React components
├── hooks/          # Custom React hooks (e.g. useNavigation)
├── layouts/        # Astro page layouts
├── lib/           # Utilities and API clients
│   ├── api.ts         # API fetch utilities
│   ├── domain.ts      # Shared domain logic and types
│   ├── apiWrapper.ts  # High-level API interface
│   └── config.ts      # Environment configuration
├── pages/         # Astro pages/routes
└── styles/        # Global styles
```

### Key Files
- `src/lib/config.ts` - Environment configuration
- `src/lib/apiWrapper.ts` - Main API interface
- `astro.config.mjs` - Build configuration

## Testing

```bash
# Run tests
npm run test

# Run tests with coverage
npm run test:coverage

# E2E tests (if configured)
npm run test:e2e
```