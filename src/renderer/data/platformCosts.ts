/**
 * Platform cost estimation data
 * Simplified tier indicators for deployment platforms
 */

import type { Platform } from '../contexts/WizardContext';

export interface PlatformCost {
  platform: Platform;
  freeTier: string;
  paidStartsAt: string;
  bestFor: string;
  costRating: 1 | 2 | 3 | 4 | 5; // 1 = most expensive, 5 = most affordable
}

export const platformCosts: Record<Platform, PlatformCost> = {
  vercel: {
    platform: 'vercel',
    freeTier: 'Unlimited for personal projects',
    paidStartsAt: '$20/month (Pro)',
    bestFor: 'Startups & small teams',
    costRating: 4,
  },
  netlify: {
    platform: 'netlify',
    freeTier: '100GB bandwidth, 300 build minutes',
    paidStartsAt: '$19/month (Pro)',
    bestFor: 'JAMstack projects',
    costRating: 4,
  },
  cloudflare: {
    platform: 'cloudflare',
    freeTier: 'Unlimited requests, 100k reads/day',
    paidStartsAt: '$5/month (Workers Paid)',
    bestFor: 'High-traffic sites',
    costRating: 5,
  },
  aws: {
    platform: 'aws',
    freeTier: '12 months free tier (limited)',
    paidStartsAt: 'Pay-as-you-go',
    bestFor: 'Enterprise & complex apps',
    costRating: 2,
  },
  azure: {
    platform: 'azure',
    freeTier: '100GB bandwidth/month',
    paidStartsAt: 'Pay-as-you-go',
    bestFor: 'Microsoft ecosystem',
    costRating: 2,
  },
  gcp: {
    platform: 'gcp',
    freeTier: '$300 credit (90 days)',
    paidStartsAt: 'Pay-as-you-go',
    bestFor: 'Google ecosystem',
    costRating: 3,
  },
};

export function getCostRatingLabel(rating: number): string {
  switch (rating) {
    case 5:
      return 'Most Affordable';
    case 4:
      return 'Affordable';
    case 3:
      return 'Moderate';
    case 2:
      return 'Premium';
    case 1:
      return 'Enterprise';
    default:
      return 'Unknown';
  }
}

export function getCostRatingColor(rating: number): string {
  switch (rating) {
    case 5:
    case 4:
      return 'text-green-600 dark:text-green-400';
    case 3:
      return 'text-yellow-600 dark:text-yellow-400';
    case 2:
    case 1:
      return 'text-orange-600 dark:text-orange-400';
    default:
      return 'text-gray-600 dark:text-gray-400';
  }
}
