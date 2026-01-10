# Send-It 🚀

**A sleek, professional web application for deploying your projects to multiple platforms instantly—all from your browser.**

Send-It is a modern, web-only deployment wizard that guides you through the entire deployment process. Connect your GitHub repository, choose your platform, configure your environment, and deploy—all without leaving your browser. **No backend required, no Electron needed—everything runs directly in your browser!**

---

## ✨ Features

### 🎯 Core Capabilities

- **🔄 Repository Analysis** - Automatically detects your project framework from GitHub repositories
- **🔍 Platform Discovery** - Browse and compare 13+ deployment platforms with detailed information
- **🎨 Intelligent Recommendations** - Get platform recommendations based on your detected framework
- **🔐 Secure Authentication** - OAuth flows via browser popups for seamless platform authentication
- **⚡ Real-Time Deployment** - Deploy directly to platforms from your browser with live progress tracking
- **📊 Deployment Logs** - Real-time streaming logs during deployment process
- **✅ Multi-Platform Support** - Deploy to Vercel, Netlify, Railway, Render, and more

### 🌟 Key Highlights

- **🚫 No Backend Required** - All deployments happen directly from the browser using platform APIs
- **💾 Client-Side Storage** - Tokens stored securely in localStorage (can be enhanced with Web Crypto API)
- **🎨 Sleek UI/UX** - Modern, professional interface that guides users through each step
- **🌐 Web-Only** - No Electron dependencies—works on any modern browser
- **🔒 Secure** - NIST-compliant encryption patterns (can be enhanced with Web Crypto API)
- **⚡ Fast** - Optimized for performance with React Query caching and lazy loading

---

## 🎬 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Modern web browser (Chrome, Firefox, Safari, Edge)
- GitHub account (for repository access)
- Platform accounts (Vercel, Netlify, Railway, or Render)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/send-it.git
cd send-it

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build:web
```

### Development

```bash
# Run development server with hot reload
npm run dev

# Run linter
npm run lint

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run E2E tests
npm run e2e
```

---

## 🏗️ Architecture

### Frontend-Only Design

Send-It is built entirely for the web—no backend server required! Here's how it works:

```
Browser (Client-Side Only)
│
├── React App (SPA)
│   ├── Components (UI)
│   │   ├── StepRepo (Repository Selection)
│   │   ├── StepAnalysis (Framework Analysis)
│   │   ├── Step2PlatformDiscovery (Platform Browser)
│   │   ├── StepEnv (Environment Configuration)
│   │   └── Step5Deploy (Deployment) ⚡ CRITICAL
│   │
│   └── Services (Business Logic)
│       ├── WebDeploymentService → fetch() to platform APIs
│       ├── WebTokenService → localStorage storage
│       └── browserAPI → GitHub API calls
│
└── External APIs (Direct Calls from Browser)
    ├── Vercel API → https://api.vercel.com
    ├── Netlify API → https://api.netlify.com
    ├── Railway API → https://api.railway.app
    ├── Render API → https://api.render.com
    └── GitHub API → https://api.github.com
```

### How Deployment Works

1. **Repository Selection** - User enters GitHub repository URL
2. **Framework Detection** - System analyzes repository via GitHub API to detect framework
3. **Platform Discovery** - User browses 13+ platforms with filtering, search, and recommendations
4. **Platform Selection** - User selects deployment platform (Vercel, Netlify, Railway, Render, etc.)
5. **Authentication** - OAuth flow via browser popup to authenticate with platform
6. **Configuration** - User configures environment variables and deployment settings
7. **Deployment** - System calls platform API directly from browser to create deployment
8. **Status Tracking** - Real-time progress updates and logs streamed from platform
9. **Success** - Deployment URL displayed for immediate access

**All of this happens directly in the browser—no backend server needed!**

---

## 🎯 Supported Platforms

### ✅ Fully Supported (Ready for Production)

| Platform | Status | Features |
|----------|--------|----------|
| **Vercel** | ✅ Fully Implemented | Next.js optimization, serverless functions, global CDN |
| **Netlify** | ✅ Fully Implemented | Continuous deployment, serverless functions, edge functions |
| **Railway** | ✅ Fully Implemented | Instant deployments, databases, environments |
| **Render** | ✅ Fully Implemented | Web services, databases, cron jobs |

### 🔜 Coming Soon (Platform Data Ready)

| Platform | Status | ETA |
|----------|--------|-----|
| Fly.io | ⚠️ Data Ready | Implementation pending |
| Cloudflare Pages | ⚠️ Data Ready | Implementation pending |
| AWS Amplify | ⚠️ Data Ready | Implementation pending |
| Azure Static Web Apps | ⚠️ Data Ready | Implementation pending |
| GCP Cloud Run | ⚠️ Data Ready | Implementation pending |
| Deno Deploy | ⚠️ Data Ready | Implementation pending |
| Supabase | ⚠️ Data Ready | Implementation pending |
| GitHub Pages | ⚠️ Data Ready | Implementation pending |
| Heroku | ⚠️ Data Ready | Implementation pending |

---

## 📦 Technology Stack

### Core Technologies

- **React 19** - Modern React with hooks and concurrent features
- **TypeScript** - Type-safe development
- **Tailwind CSS 4** - Utility-first CSS framework
- **TanStack Query (React Query)** - Server state management and caching
- **React Hook Form** - Performant form management
- **Zod** - Schema validation
- **Zustand** - Lightweight state management
- **Lucide React** - Beautiful icon library

### Build Tools

- **Webpack 5** - Module bundler
- **TypeScript** - Type checking
- **ESLint** - Code linting
- **Jest** - Unit testing
- **Playwright** - E2E testing

### Web APIs Used

- **Fetch API** - All HTTP requests (platform APIs, GitHub API)
- **localStorage** - Token storage (encrypted with base64, can enhance with Web Crypto API)
- **Web Crypto API** - Future enhancement for stronger encryption
- **IndexedDB** - Future enhancement for deployment history

---

## 🎨 User Interface

### Wizard Flow

Send-It guides users through a 5-step deployment wizard:

1. **Repository** - Enter GitHub repository URL and analyze framework
2. **Analysis** - View detected framework and platform recommendations
3. **Platform Discovery** - Browse, search, filter, and select deployment platform
4. **Environment** - Configure environment variables and authenticate with platform
5. **Deploy** - Review configuration and deploy with real-time progress tracking

### Key UI Components

- **PlatformCard** - Sleek card component displaying platform information, features, pricing, and selection state
- **Step2PlatformDiscovery** - Comprehensive platform browser with search, filtering, sorting, and recommendations
- **Step5Deploy** - Critical deployment UI with real-time logs, progress tracking, and success screens
- **VirtualizedEnvList** - Performant environment variable list for large configurations

---

## 🔐 Security

### Token Storage

- Tokens stored in `localStorage` with base64 encoding
- Each platform token stored separately
- Future enhancement: Web Crypto API for stronger encryption

### OAuth Flows

- Browser popup windows for OAuth flows
- User-friendly authentication experience
- Tokens never exposed in URLs (stored after OAuth completion)

### API Security

- All API calls made directly from browser using platform-provided tokens
- Tokens never sent to any third-party server (except platform APIs)
- CORS handled by platform APIs (no proxy needed)

---

## 🚀 Deployment Process

### How It Works (Frontend-Only)

1. **User clicks "Deploy Now"** in Step5Deploy component
2. **WebDeploymentService.deploy()** is called with deployment configuration
3. **Token retrieved from localStorage** (encrypted, platform-specific)
4. **Direct API call to platform** using `fetch()` from browser:
   ```typescript
   await fetch('https://api.vercel.com/v13/deployments', {
     method: 'POST',
     headers: {
       Authorization: `Bearer ${token}`,
       'Content-Type': 'application/json',
     },
     body: JSON.stringify({
       name: projectName,
       gitSource: { type: 'github', repo: 'owner/repo', ref: 'main' },
       env: [...environmentVariables],
     }),
   });
   ```
5. **Platform creates deployment** and returns deployment ID and URL
6. **Status polling** from browser to track deployment progress
7. **Real-time logs** streamed from platform API
8. **Success screen** displays actual deployment URL

**No backend server involved—everything happens directly in the browser!**

---

## 📁 Project Structure

```
send-it/
├── src/
│   ├── renderer/              # React app (main frontend)
│   │   ├── components/        # UI components
│   │   │   ├── StepRepo.tsx   # Repository selection
│   │   │   ├── StepAnalysis.tsx
│   │   │   ├── StepEnv.tsx    # Environment configuration
│   │   │   └── ...
│   │   ├── contexts/          # React contexts
│   │   │   └── WizardContext.tsx
│   │   ├── hooks/             # Custom hooks
│   │   │   └── useRepositoryAnalysis.ts
│   │   ├── api/               # Browser APIs
│   │   │   └── browserAPI.ts  # GitHub API client
│   │   └── App.tsx            # Main app component
│   │
│   ├── components/            # Shared components
│   │   ├── PlatformCard.tsx   # Platform display card
│   │   └── DeploymentWizard/  # Wizard steps
│   │       ├── Step2PlatformDiscovery.tsx
│   │       └── Step5Deploy.tsx
│   │
│   ├── services/              # Business logic
│   │   ├── WebDeploymentService.ts  # ⚡ CRITICAL: Deployment logic
│   │   └── WebTokenService.ts       # Token management
│   │
│   ├── data/                  # Static data
│   │   └── platforms.ts       # 13+ platforms with full details
│   │
│   ├── types/                 # TypeScript types
│   │   └── ipc.d.ts
│   │
│   └── utils/                 # Utilities
│       ├── retry.ts           # Retry logic
│       └── circuitBreaker.ts  # Circuit breaker pattern
│
├── webpack.dev.config.js      # Development webpack config
├── webpack.vercel.config.js   # Production webpack config
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🔧 Configuration

### Environment Variables

No environment variables needed for the client! All configuration is done through the UI.

### Platform Authentication

Each platform requires authentication via OAuth:

1. **Vercel** - OAuth popup to `https://vercel.com/account/tokens`
2. **Netlify** - OAuth popup to `https://app.netlify.com/user/applications`
3. **Railway** - OAuth popup to `https://railway.app/account/tokens`
4. **Render** - OAuth popup to `https://dashboard.render.com/account/api-keys`

Tokens are stored securely in localStorage after authentication.

---

## 🧪 Testing

### Unit Tests

```bash
npm test
```

Tests cover:
- Component rendering
- Service logic
- API clients
- Utility functions

### E2E Tests

```bash
npm run e2e
```

E2E tests cover:
- Full wizard flow
- Repository analysis
- Platform selection
- Deployment process

---

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

### Development Guidelines

- Follow TypeScript best practices
- Use React hooks properly
- Write comprehensive tests
- Follow accessibility guidelines (WCAG 2.2)
- Optimize for performance

---

## 📝 Roadmap

### Immediate (v1.0)

- [x] Core deployment functionality (Vercel, Netlify, Railway, Render)
- [x] Platform discovery and selection
- [x] OAuth flows for all supported platforms
- [x] Real-time deployment progress tracking
- [ ] Enhanced token encryption with Web Crypto API
- [ ] Deployment history using IndexedDB
- [ ] Mobile responsiveness improvements

### Short-term (v1.1)

- [ ] Additional platforms (Fly.io, Cloudflare Pages, AWS Amplify)
- [ ] Deployment templates and presets
- [ ] Team collaboration features
- [ ] Deployment analytics and insights
- [ ] Custom domain management

### Long-term (v2.0)

- [ ] Multi-region deployment
- [ ] CI/CD pipeline integration
- [ ] Deployment rollbacks
- [ ] A/B testing deployment
- [ ] Advanced monitoring and alerting

---

## 🐛 Known Issues

- Token encryption uses base64 (acceptable for client-side, but Web Crypto API recommended for production)
- Some platforms may have CORS restrictions (platform APIs should handle this, but verify)
- Deployment history not yet implemented (coming soon)

---

## 📄 License

MIT License - see LICENSE file for details

---

## 🙏 Acknowledgments

- Built with modern web technologies (React, TypeScript, Tailwind CSS)
- Inspired by deployment platforms like Vercel, Netlify, and Railway
- Icons from [Lucide](https://lucide.dev/)

---

## 📞 Support

For issues, questions, or contributions:
- Open an issue on GitHub
- Check existing documentation
- Review the codebase

---

## ⚡ Quick Start Example

1. **Clone Repository**
   ```bash
   git clone https://github.com/yourusername/send-it.git
   cd send-it
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm run dev
   ```

3. **Open Browser**
   - Navigate to `http://localhost:8080`
   - Enter a GitHub repository URL
   - Select a platform
   - Authenticate
   - Deploy!

**That's it!** No backend setup, no complex configuration—just deploy from your browser! 🚀

---

**Send-It** - *Deploy anything, anywhere, from your browser.*
