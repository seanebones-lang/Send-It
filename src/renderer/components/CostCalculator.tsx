import React, { useState, useMemo } from 'react';
import { DollarSign, TrendingUp, Users, Zap } from 'lucide-react';
import type { Platform } from '../contexts/WizardContext';

interface CostCalculatorProps {
  platforms: Platform[];
  scores: Record<Platform, number>;
}

interface PlatformPricing {
  free: {
    bandwidth: string;
    builds: string;
    requests: string;
  };
  paid: {
    startingPrice: number;
    perMonth: boolean;
  };
}

const platformPricing: Record<Platform, PlatformPricing> = {
  vercel: {
    free: { bandwidth: 'Unlimited', builds: '6000 min/mo', requests: 'Unlimited' },
    paid: { startingPrice: 20, perMonth: true },
  },
  netlify: {
    free: { bandwidth: '100 GB', builds: '300 min/mo', requests: 'Unlimited' },
    paid: { startingPrice: 19, perMonth: true },
  },
  cloudflare: {
    free: { bandwidth: 'Unlimited', builds: 'Unlimited', requests: '100k/day' },
    paid: { startingPrice: 5, perMonth: true },
  },
  aws: {
    free: { bandwidth: '15 GB', builds: '100 min/mo', requests: '1M/mo' },
    paid: { startingPrice: 0, perMonth: false }, // Pay as you go
  },
  azure: {
    free: { bandwidth: '100 GB', builds: '1800 min/mo', requests: 'Unlimited' },
    paid: { startingPrice: 0, perMonth: false },
  },
  gcp: {
    free: { bandwidth: '1 GB', builds: '120 min/day', requests: '2M/mo' },
    paid: { startingPrice: 0, perMonth: false },
  },
};

const platformNames: Record<Platform, string> = {
  vercel: 'Vercel',
  netlify: 'Netlify',
  cloudflare: 'Cloudflare Pages',
  aws: 'AWS Amplify',
  azure: 'Azure Static Web Apps',
  gcp: 'Google Cloud Run',
};

export function CostCalculator({ platforms, scores }: CostCalculatorProps) {
  const [monthlyVisits, setMonthlyVisits] = useState(10000);
  const [teamSize, setTeamSize] = useState(1);

  const estimatedCosts = useMemo(() => {
    return platforms.map(platform => {
      const pricing = platformPricing[platform];
      let estimatedCost = 0;

      // Simple cost estimation logic
      if (monthlyVisits > 100000) {
        estimatedCost = pricing.paid.startingPrice;
      } else if (monthlyVisits > 50000 && pricing.paid.perMonth) {
        estimatedCost = pricing.paid.startingPrice * 0.5;
      }

      // Team multiplier for some platforms
      if (teamSize > 1 && ['vercel', 'netlify'].includes(platform)) {
        estimatedCost += (teamSize - 1) * 10;
      }

      return {
        platform,
        name: platformNames[platform],
        cost: estimatedCost,
        score: scores[platform],
        pricing,
      };
    }).sort((a, b) => b.score - a.score);
  }, [platforms, scores, monthlyVisits, teamSize]);

  return (
    <div className="glass-dark rounded-2xl p-8 shadow-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
          <DollarSign className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-white">Cost Calculator</h3>
          <p className="text-gray-300 text-sm">Estimate your monthly deployment costs</p>
        </div>
      </div>

      {/* Input Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="glass rounded-xl p-4">
          <label className="flex items-center gap-2 text-white font-semibold mb-3">
            <Users className="w-4 h-4" />
            Monthly Visits: {monthlyVisits.toLocaleString()}
          </label>
          <input
            type="range"
            min="1000"
            max="1000000"
            step="1000"
            value={monthlyVisits}
            onChange={(e) => setMonthlyVisits(Number(e.target.value))}
            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>1k</span>
            <span>500k</span>
            <span>1M</span>
          </div>
        </div>

        <div className="glass rounded-xl p-4">
          <label className="flex items-center gap-2 text-white font-semibold mb-3">
            <Users className="w-4 h-4" />
            Team Size: {teamSize}
          </label>
          <input
            type="range"
            min="1"
            max="50"
            step="1"
            value={teamSize}
            onChange={(e) => setTeamSize(Number(e.target.value))}
            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>1</span>
            <span>25</span>
            <span>50</span>
          </div>
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="space-y-3">
        {estimatedCosts.map((item, index) => (
          <div
            key={item.platform}
            className="glass rounded-xl p-4 hover:bg-white/10 transition-all-smooth"
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                  {index + 1}
                </div>
                <div>
                  <h4 className="text-white font-semibold">{item.name}</h4>
                  <p className="text-xs text-gray-400">Score: {item.score}%</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white">
                  {item.cost === 0 ? 'Free' : `$${item.cost}/mo`}
                </div>
                {item.cost === 0 && monthlyVisits < 50000 && (
                  <p className="text-xs text-green-400">Within free tier</p>
                )}
              </div>
            </div>

            {/* Free Tier Info */}
            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/10">
              <div>
                <p className="text-xs text-gray-400">Bandwidth</p>
                <p className="text-xs text-white font-medium">{item.pricing.free.bandwidth}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Builds</p>
                <p className="text-xs text-white font-medium">{item.pricing.free.builds}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Requests</p>
                <p className="text-xs text-white font-medium">{item.pricing.free.requests}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-6 glass rounded-xl p-4 border border-blue-400/30">
        <div className="flex items-center gap-2 text-blue-200 text-sm">
          <TrendingUp className="w-4 h-4" />
          <span>
            <strong>Recommendation:</strong> {estimatedCosts[0].name} offers the best value 
            for your traffic ({monthlyVisits.toLocaleString()} visits/mo)
          </span>
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
      `}</style>
    </div>
  );
}
