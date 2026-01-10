/**
 * Comprehensive Platform Data
 * All deployment service providers with detailed information
 */

export interface PlatformPricing {
  free: boolean;
  freeTier?: string; // e.g., "100GB bandwidth/month"
  paid?: string; // Starting price, e.g., "$20/month"
  link: string;
}

export interface Platform {
  id: string;
  name: string;
  logo: string; // URL or emoji
  category: 'static' | 'fullstack' | 'serverless' | 'container' | 'database';
  tier: 1 | 2 | 3; // Priority tier
  pricing: PlatformPricing;
  features: string[]; // e.g., ["CDN", "Edge Functions", "DDoS Protection"]
  frameworks: string[]; // Best for these frameworks
  pros: string[];
  cons: string[];
  deploymentTime: string; // e.g., "1-3 minutes"
  popularity: 'high' | 'medium' | 'low';
  bestFor: string[]; // Use cases
  apiEndpoint: string;
  authMethod: 'oauth' | 'token' | 'both';
  docsUrl: string;
  status: 'supported' | 'planned' | 'coming-soon';
  description: string;
  regions?: string[]; // Available regions
  customDomains: boolean;
  ssl: boolean;
  analytics: boolean;
  environmentVariables: boolean;
  previewDeployments: boolean;
  rollback: boolean;
  monitoring: boolean;
}

/**
 * Comprehensive list of all deployment platforms
 */
export const ALL_PLATFORMS: Platform[] = [
  // Tier 1: High Priority - Must Support
  {
    id: 'vercel',
    name: 'Vercel',
    logo: '▲',
    category: 'static',
    tier: 1,
    pricing: {
      free: true,
      freeTier: '100GB bandwidth, unlimited deployments',
      paid: '$20/month (Pro)',
      link: 'https://vercel.com/pricing',
    },
    features: ['CDN', 'Edge Functions', 'Serverless Functions', 'Preview Deployments', 'Analytics', 'Web Analytics'],
    frameworks: ['Next.js', 'React', 'Vue', 'Angular', 'Svelte', 'Nuxt', 'Remix'],
    pros: ['Best Next.js support', 'Instant global CDN', 'Zero-config deployments', 'Excellent DX', 'Fast builds'],
    cons: ['Can be expensive at scale', 'Limited serverless function runtime'],
    deploymentTime: '1-2 minutes',
    popularity: 'high',
    bestFor: ['JAMstack apps', 'Next.js projects', 'Static sites', 'Serverless APIs'],
    apiEndpoint: 'https://api.vercel.com',
    authMethod: 'oauth',
    docsUrl: 'https://vercel.com/docs',
    status: 'supported',
    description: 'The platform for frontend developers. Deploy instantly with zero configuration.',
    regions: ['Global Edge Network'],
    customDomains: true,
    ssl: true,
    analytics: true,
    environmentVariables: true,
    previewDeployments: true,
    rollback: true,
    monitoring: true,
  },
  {
    id: 'netlify',
    name: 'Netlify',
    logo: '🟢',
    category: 'static',
    tier: 1,
    pricing: {
      free: true,
      freeTier: '100GB bandwidth, 300 build minutes/month',
      paid: '$19/month (Pro)',
      link: 'https://www.netlify.com/pricing/',
    },
    features: ['CDN', 'Edge Functions', 'Forms', 'Identity', 'Split Testing', 'Analytics'],
    frameworks: ['React', 'Vue', 'Angular', 'Jekyll', 'Hugo', 'Gatsby'],
    pros: ['Great free tier', 'Built-in forms & identity', 'Split testing', 'Continuous deployment'],
    cons: ['Function runtime limitations', 'Less Next.js optimization than Vercel'],
    deploymentTime: '2-3 minutes',
    popularity: 'high',
    bestFor: ['Static sites', 'JAMstack apps', 'Forms-heavy sites', 'Marketing sites'],
    apiEndpoint: 'https://api.netlify.com',
    authMethod: 'oauth',
    docsUrl: 'https://docs.netlify.com',
    status: 'planned',
    description: 'Build, deploy, and manage modern web projects with Netlify.',
    regions: ['Global CDN'],
    customDomains: true,
    ssl: true,
    analytics: true,
    environmentVariables: true,
    previewDeployments: true,
    rollback: true,
    monitoring: true,
  },
  {
    id: 'railway',
    name: 'Railway',
    logo: '🚂',
    category: 'fullstack',
    tier: 1,
    pricing: {
      free: true,
      freeTier: '$5 free credit/month',
      paid: 'Pay-as-you-go',
      link: 'https://railway.app/pricing',
    },
    features: ['PostgreSQL', 'Redis', 'MySQL', 'MongoDB', 'Docker', 'GitHub Integration'],
    frameworks: ['Any framework', 'Docker', 'Node.js', 'Python', 'Go', 'Rust'],
    pros: ['Database included', 'Simple pricing', 'Docker support', 'One-click deploy'],
    cons: ['Smaller ecosystem', 'Newer platform'],
    deploymentTime: '2-4 minutes',
    popularity: 'medium',
    bestFor: ['Full-stack apps', 'Databases', 'Docker containers', 'APIs'],
    apiEndpoint: 'https://api.railway.app',
    authMethod: 'oauth',
    docsUrl: 'https://docs.railway.app',
    status: 'supported',
    description: 'Deploy anything with minimal configuration. Database included.',
    regions: ['US', 'EU'],
    customDomains: true,
    ssl: true,
    analytics: false,
    environmentVariables: true,
    previewDeployments: true,
    rollback: true,
    monitoring: true,
  },
  {
    id: 'render',
    name: 'Render',
    logo: '🔷',
    category: 'fullstack',
    tier: 1,
    pricing: {
      free: true,
      freeTier: '512MB RAM, spins down after inactivity',
      paid: '$7/month (Starter)',
      link: 'https://render.com/pricing',
    },
    features: ['PostgreSQL', 'Redis', 'Docker', 'Auto-SSL', 'Zero-downtime deploys'],
    frameworks: ['Any framework', 'Docker', 'Node.js', 'Python', 'Ruby', 'Go'],
    pros: ['Good free tier', 'Database included', 'Auto-scaling', 'Private networking'],
    cons: ['Free tier spins down', 'Limited regions'],
    deploymentTime: '3-5 minutes',
    popularity: 'medium',
    bestFor: ['Full-stack apps', 'Backend APIs', 'Databases', 'Docker apps'],
    apiEndpoint: 'https://api.render.com',
    authMethod: 'token',
    docsUrl: 'https://render.com/docs',
    status: 'supported',
    description: 'Modern cloud platform to build and run all your apps and websites.',
    regions: ['US East', 'US West', 'EU'],
    customDomains: true,
    ssl: true,
    analytics: false,
    environmentVariables: true,
    previewDeployments: false,
    rollback: true,
    monitoring: true,
  },
  {
    id: 'fly-io',
    name: 'Fly.io',
    logo: '✈️',
    category: 'container',
    tier: 1,
    pricing: {
      free: false,
      paid: 'Pay-as-you-go (starting ~$2/month)',
      link: 'https://fly.io/docs/about/pricing/',
    },
    features: ['Global Edge Network', 'Docker', 'PostgreSQL', 'Redis', 'Multi-region', 'Fly Machines'],
    frameworks: ['Any framework', 'Docker', 'Node.js', 'Python', 'Go', 'Elixir'],
    pros: ['Global edge network', 'Fast cold starts', 'Multi-region', 'Great for APIs'],
    cons: ['No free tier', 'Learning curve', 'Smaller community'],
    deploymentTime: '1-2 minutes',
    popularity: 'medium',
    bestFor: ['Global APIs', 'Real-time apps', 'Latency-sensitive apps', 'Multi-region'],
    apiEndpoint: 'https://api.machines.dev',
    authMethod: 'token',
    docsUrl: 'https://fly.io/docs',
    status: 'planned',
    description: 'Run your apps close to users, at the edge, anywhere in the world.',
    regions: ['30+ regions globally'],
    customDomains: true,
    ssl: true,
    analytics: false,
    environmentVariables: true,
    previewDeployments: true,
    rollback: true,
    monitoring: true,
  },
  {
    id: 'cloudflare-pages',
    name: 'Cloudflare Pages',
    logo: '☁️',
    category: 'static',
    tier: 1,
    pricing: {
      free: true,
      freeTier: 'Unlimited bandwidth, unlimited requests',
      paid: '$20/month (Bundled with Workers)',
      link: 'https://developers.cloudflare.com/pages/platform/pricing/',
    },
    features: ['Global CDN', 'Cloudflare Workers', 'DDoS Protection', 'Analytics', 'Image Optimization'],
    frameworks: ['React', 'Vue', 'Angular', 'Hugo', 'Next.js', 'Gatsby'],
    pros: ['Free unlimited bandwidth', 'Best DDoS protection', 'Fast CDN', 'Workers integration'],
    cons: ['Less framework optimization', 'Newer platform'],
    deploymentTime: '1-2 minutes',
    popularity: 'medium',
    bestFor: ['Static sites', 'JAMstack apps', 'High-traffic sites', 'Global audiences'],
    apiEndpoint: 'https://api.cloudflare.com',
    authMethod: 'token',
    docsUrl: 'https://developers.cloudflare.com/pages',
    status: 'planned',
    description: 'JAMstack platform for frontend developers to collaborate and deploy websites.',
    regions: ['Global Edge Network (200+ cities)'],
    customDomains: true,
    ssl: true,
    analytics: true,
    environmentVariables: true,
    previewDeployments: true,
    rollback: true,
    monitoring: true,
  },
  // Tier 2: Medium Priority
  {
    id: 'aws-amplify',
    name: 'AWS Amplify',
    logo: '☁️',
    category: 'fullstack',
    tier: 2,
    pricing: {
      free: false,
      paid: 'Pay-as-you-go (varies by service)',
      link: 'https://aws.amazon.com/amplify/pricing/',
    },
    features: ['Auth', 'API', 'Storage', 'Hosting', 'Analytics', 'AI/ML'],
    frameworks: ['React', 'Vue', 'Angular', 'Next.js', 'Flutter'],
    pros: ['Enterprise-grade', 'Full AWS ecosystem', 'Powerful features', 'Scalable'],
    cons: ['Complex setup', 'Can be expensive', 'AWS knowledge required'],
    deploymentTime: '3-5 minutes',
    popularity: 'medium',
    bestFor: ['Enterprise apps', 'Full-stack apps', 'AWS ecosystem', 'Complex requirements'],
    apiEndpoint: 'https://amplify.amazonaws.com',
    authMethod: 'token',
    docsUrl: 'https://docs.amplify.aws',
    status: 'planned',
    description: 'Full-stack cloud application platform with AWS backend.',
    regions: ['All AWS regions'],
    customDomains: true,
    ssl: true,
    analytics: true,
    environmentVariables: true,
    previewDeployments: true,
    rollback: true,
    monitoring: true,
  },
  {
    id: 'azure-static-web-apps',
    name: 'Azure Static Web Apps',
    logo: '🔵',
    category: 'static',
    tier: 2,
    pricing: {
      free: true,
      freeTier: '100GB bandwidth, custom domains',
      paid: '$9/month (Standard)',
      link: 'https://azure.microsoft.com/pricing/details/app-service/static/',
    },
    features: ['Azure Functions', 'Auth', 'Custom domains', 'Staging environments'],
    frameworks: ['React', 'Vue', 'Angular', 'Blazor', 'Next.js'],
    pros: ['Azure integration', 'Free tier', 'Auth built-in', 'Enterprise support'],
    cons: ['Less popular', 'Azure ecosystem required'],
    deploymentTime: '2-4 minutes',
    popularity: 'low',
    bestFor: ['Azure ecosystem', 'Enterprise apps', 'Static sites with Functions'],
    apiEndpoint: 'https://management.azure.com',
    authMethod: 'token',
    docsUrl: 'https://docs.microsoft.com/azure/static-web-apps',
    status: 'planned',
    description: 'Modern web app host with serverless API and global distribution.',
    regions: ['All Azure regions'],
    customDomains: true,
    ssl: true,
    analytics: false,
    environmentVariables: true,
    previewDeployments: true,
    rollback: true,
    monitoring: true,
  },
  {
    id: 'gcp-cloud-run',
    name: 'Google Cloud Run',
    logo: '🔴',
    category: 'serverless',
    tier: 2,
    pricing: {
      free: false,
      paid: 'Pay-as-you-go ($0.40/million requests)',
      link: 'https://cloud.google.com/run/pricing',
    },
    features: ['Serverless containers', 'Auto-scaling', 'HTTPS', 'Cloud SQL', 'Pub/Sub'],
    frameworks: ['Any framework', 'Docker', 'Node.js', 'Python', 'Go', 'Java'],
    pros: ['True serverless', 'Auto-scaling', 'GCP integration', 'Pay-per-use'],
    cons: ['Cold starts', 'GCP knowledge required', 'Can be expensive'],
    deploymentTime: '2-3 minutes',
    popularity: 'medium',
    bestFor: ['Serverless APIs', 'Container apps', 'GCP ecosystem', 'Auto-scaling needs'],
    apiEndpoint: 'https://cloudbuild.googleapis.com',
    authMethod: 'token',
    docsUrl: 'https://cloud.google.com/run/docs',
    status: 'planned',
    description: 'Fully managed serverless platform for running containers.',
    regions: ['All GCP regions'],
    customDomains: true,
    ssl: true,
    analytics: false,
    environmentVariables: true,
    previewDeployments: false,
    rollback: true,
    monitoring: true,
  },
  {
    id: 'deno-deploy',
    name: 'Deno Deploy',
    logo: '🦕',
    category: 'serverless',
    tier: 2,
    pricing: {
      free: true,
      freeTier: '100K requests/month',
      paid: '$10/month (Pro)',
      link: 'https://deno.com/deploy/pricing',
    },
    features: ['Edge computing', 'Deno runtime', 'Zero config', 'TypeScript native'],
    frameworks: ['Deno', 'TypeScript', 'Fresh'],
    pros: ['TypeScript native', 'Fast edge', 'Modern runtime', 'Simple'],
    cons: ['Deno only', 'Smaller ecosystem', 'Limited regions'],
    deploymentTime: '30-60 seconds',
    popularity: 'low',
    bestFor: ['Deno apps', 'TypeScript projects', 'Edge functions', 'Modern web apps'],
    apiEndpoint: 'https://dash.deno.com/api',
    authMethod: 'token',
    docsUrl: 'https://deno.com/deploy/docs',
    status: 'planned',
    description: 'Global edge runtime for Deno. Deploy TypeScript to the edge.',
    regions: ['Global Edge Network'],
    customDomains: true,
    ssl: true,
    analytics: false,
    environmentVariables: true,
    previewDeployments: false,
    rollback: true,
    monitoring: true,
  },
  {
    id: 'supabase',
    name: 'Supabase',
    logo: '⚡',
    category: 'database',
    tier: 2,
    pricing: {
      free: true,
      freeTier: '500MB database, 1GB storage',
      paid: '$25/month (Pro)',
      link: 'https://supabase.com/pricing',
    },
    features: ['PostgreSQL', 'Auth', 'Storage', 'Realtime', 'Edge Functions', 'Vector'],
    frameworks: ['Any framework', 'Next.js', 'React', 'Vue'],
    pros: ['Open source Firebase', 'PostgreSQL', 'Great DX', 'Real-time'],
    cons: ['Newer platform', 'Smaller than Firebase'],
    deploymentTime: 'N/A (Database + Hosting)',
    popularity: 'medium',
    bestFor: ['Full-stack apps', 'Real-time apps', 'PostgreSQL apps', 'Firebase alternative'],
    apiEndpoint: 'https://api.supabase.com',
    authMethod: 'token',
    docsUrl: 'https://supabase.com/docs',
    status: 'planned',
    description: 'Open source Firebase alternative with PostgreSQL.',
    regions: ['US', 'EU', 'Asia'],
    customDomains: true,
    ssl: true,
    analytics: false,
    environmentVariables: true,
    previewDeployments: false,
    rollback: true,
    monitoring: true,
  },
  // Tier 3: Nice-to-Have
  {
    id: 'github-pages',
    name: 'GitHub Pages',
    logo: '🐙',
    category: 'static',
    tier: 3,
    pricing: {
      free: true,
      freeTier: 'Unlimited for public repos',
      paid: 'Free for private repos (GitHub Pro)',
      link: 'https://pages.github.com',
    },
    features: ['Free hosting', 'Custom domains', 'HTTPS', 'Jekyll support'],
    frameworks: ['Jekyll', 'Any static site', 'React (with build)'],
    pros: ['Free', 'Simple', 'GitHub integration'],
    cons: ['Static only', 'No serverless functions', 'Limited customization'],
    deploymentTime: '1-2 minutes',
    popularity: 'high',
    bestFor: ['Documentation', 'Personal sites', 'Open source projects', 'Simple static sites'],
    apiEndpoint: 'https://api.github.com',
    authMethod: 'oauth',
    docsUrl: 'https://docs.github.com/pages',
    status: 'planned',
    description: 'Free static site hosting directly from GitHub repository.',
    regions: ['Global CDN'],
    customDomains: true,
    ssl: true,
    analytics: false,
    environmentVariables: false,
    previewDeployments: false,
    rollback: true,
    monitoring: false,
  },
  {
    id: 'heroku',
    name: 'Heroku',
    logo: '🟣',
    category: 'container',
    tier: 3,
    pricing: {
      free: false,
      paid: '$7/month (Eco)',
      link: 'https://www.heroku.com/pricing',
    },
    features: ['Add-ons', 'PostgreSQL', 'Redis', 'Docker', 'Git integration'],
    frameworks: ['Any framework', 'Docker', 'Node.js', 'Ruby', 'Python'],
    pros: ['Mature platform', 'Large ecosystem', 'Simple deployment'],
    cons: ['No free tier', 'Expensive', 'Legacy platform'],
    deploymentTime: '3-5 minutes',
    popularity: 'medium',
    bestFor: ['Legacy apps', 'Enterprise', 'Full-stack apps'],
    apiEndpoint: 'https://api.heroku.com',
    authMethod: 'token',
    docsUrl: 'https://devcenter.heroku.com',
    status: 'coming-soon',
    description: 'Cloud platform for deploying and managing apps.',
    regions: ['US', 'EU'],
    customDomains: true,
    ssl: true,
    analytics: false,
    environmentVariables: true,
    previewDeployments: false,
    rollback: true,
    monitoring: true,
  },
];

/**
 * Get platform by ID
 */
export function getPlatform(id: string): Platform | undefined {
  return ALL_PLATFORMS.find(p => p.id === id);
}

/**
 * Get platforms by tier
 */
export function getPlatformsByTier(tier: 1 | 2 | 3): Platform[] {
  return ALL_PLATFORMS.filter(p => p.tier === tier);
}

/**
 * Get platforms by category
 */
export function getPlatformsByCategory(category: Platform['category']): Platform[] {
  return ALL_PLATFORMS.filter(p => p.category === category);
}

/**
 * Get supported platforms (status === 'supported')
 */
export function getSupportedPlatforms(): Platform[] {
  return ALL_PLATFORMS.filter(p => p.status === 'supported');
}

/**
 * Get recommended platforms based on framework
 */
export function getRecommendedPlatforms(framework: string): Platform[] {
  const frameworkLower = framework.toLowerCase();
  return ALL_PLATFORMS
    .filter(p => 
      p.frameworks.some(f => f.toLowerCase().includes(frameworkLower)) ||
      p.status === 'supported'
    )
    .sort((a, b) => {
      // Prioritize supported platforms
      if (a.status === 'supported' && b.status !== 'supported') return -1;
      if (a.status !== 'supported' && b.status === 'supported') return 1;
      // Then by tier
      if (a.tier !== b.tier) return a.tier - b.tier;
      // Then by popularity
      const popularityOrder = { high: 3, medium: 2, low: 1 };
      return popularityOrder[b.popularity] - popularityOrder[a.popularity];
    });
}
