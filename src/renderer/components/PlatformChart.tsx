import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from 'recharts';
import type { Platform } from '../contexts/WizardContext';

interface PlatformChartProps {
  scores: Record<Platform, number>;
  selectedPlatform?: Platform | null;
  onPlatformClick?: (platform: Platform) => void;
}

const platformNames: Record<Platform, string> = {
  vercel: 'Vercel',
  netlify: 'Netlify',
  cloudflare: 'Cloudflare',
  aws: 'AWS',
  azure: 'Azure',
  gcp: 'GCP',
};

const platformColors: Record<Platform, string> = {
  vercel: '#000000',
  netlify: '#00C7B7',
  cloudflare: '#F38020',
  aws: '#FF9900',
  azure: '#0078D4',
  gcp: '#4285F4',
};

export function PlatformChart({ scores, selectedPlatform, onPlatformClick }: PlatformChartProps) {
  const data = Object.entries(scores).map(([platform, score]) => ({
    platform: platformNames[platform as Platform],
    platformKey: platform,
    score,
    fill: platformColors[platform as Platform],
  }));

  const radarData = Object.entries(scores).map(([platform, score]) => ({
    platform: platformNames[platform as Platform],
    score,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Bar Chart */}
      <div className="glass-dark rounded-2xl p-6 shadow-2xl">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          📊 Platform Scores
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis 
              dataKey="platform" 
              stroke="#fff"
              tick={{ fill: '#fff', fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              stroke="#fff"
              tick={{ fill: '#fff', fontSize: 12 }}
              domain={[0, 100]}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(0,0,0,0.8)', 
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px',
                backdropFilter: 'blur(10px)'
              }}
              labelStyle={{ color: '#fff' }}
              itemStyle={{ color: '#fff' }}
              formatter={(value: number) => [`${value}%`, 'Score']}
            />
            <Bar 
              dataKey="score" 
              radius={[8, 8, 0, 0]}
              cursor="pointer"
              onClick={(data) => onPlatformClick?.(data.platformKey as Platform)}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.fill}
                  opacity={selectedPlatform === entry.platformKey ? 1 : 0.7}
                  stroke={selectedPlatform === entry.platformKey ? '#fff' : 'none'}
                  strokeWidth={selectedPlatform === entry.platformKey ? 2 : 0}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Radar Chart */}
      <div className="glass-dark rounded-2xl p-6 shadow-2xl">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          🎯 Compatibility Matrix
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="rgba(255,255,255,0.2)" />
            <PolarAngleAxis 
              dataKey="platform" 
              stroke="#fff"
              tick={{ fill: '#fff', fontSize: 11 }}
            />
            <PolarRadiusAxis 
              angle={90} 
              domain={[0, 100]}
              stroke="rgba(255,255,255,0.3)"
              tick={{ fill: '#fff', fontSize: 10 }}
            />
            <Radar 
              name="Score" 
              dataKey="score" 
              stroke="#8b5cf6" 
              fill="#8b5cf6" 
              fillOpacity={0.6}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(0,0,0,0.8)', 
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px',
                backdropFilter: 'blur(10px)'
              }}
              labelStyle={{ color: '#fff' }}
              itemStyle={{ color: '#fff' }}
              formatter={(value: number) => [`${value}%`, 'Score']}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
