# Branch Structure

## Main Branch (`main`)
**Purpose**: Electron desktop application

**Contains**:
- ✅ TanStack integration (React Query, Table, Virtual)
- ✅ All Electron app functionality
- ✅ Original useElectron hook (works with Electron preload)
- ❌ No Vercel configuration files
- ❌ No browser compatibility layer

**Last Commit**: `dce3f80` - fix: Restore original useElectron hook and fix API connections

## Vercel Deployment Branch (`vercel-deployment`)
**Purpose**: Web deployment on Vercel

**Contains**:
- ✅ TanStack integration (React Query, Table, Virtual)
- ✅ Vercel configuration (`vercel.json`)
- ✅ Webpack build config for web (`webpack.vercel.config.js`)
- ✅ Browser compatibility layer (`electron.browser.ts`)
- ✅ Browser warning component
- ✅ Web build scripts in package.json

**Last Commit**: `0694239` - fix: Restore original useElectron hook and fix API connections

## Setup Instructions

### For Electron Development (main branch)
```bash
git checkout main
npm install --legacy-peer-deps
npm start
```

### For Vercel Deployment (vercel-deployment branch)
```bash
git checkout vercel-deployment
npm install --legacy-peer-deps
npm run vercel-build  # Test build locally
```

### Vercel Configuration
In your Vercel dashboard:
1. Connect the repository
2. Set **Production Branch** to `vercel-deployment`
3. Build command: `npm run vercel-build`
4. Output directory: `dist`

## Differences

| Feature | main | vercel-deployment |
|---------|------|-------------------|
| Electron API | ✅ Direct from preload | ✅ Mock API for browser |
| Build Output | `.webpack/` (Electron) | `dist/` (Static web) |
| Vercel Config | ❌ | ✅ |
| Browser Warning | ❌ | ✅ |
| Webpack Config | Electron Forge | Custom web build |

## Notes

- Both branches share the TanStack integration
- The `vercel-deployment` branch includes browser compatibility
- Main branch is optimized for Electron desktop app
- Vercel branch is optimized for static web hosting
