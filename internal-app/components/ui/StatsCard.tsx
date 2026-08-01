import React, { ReactNode } from 'react';

interface StatsCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  trend?: string;
  trendUp?: boolean;
  accentColor?: 'lime' | 'cyan' | 'emerald' | 'amber' | 'red';
}

const ACCENT_CLASSES = {
  lime: { bg: 'bg-lime-tint', text: 'text-lime-admin', border: 'border-lime-tint' },
  cyan: { bg: 'bg-cyan-tint', text: 'text-cyan-admin', border: 'border-cyan-tint' },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  red: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
};

export default function StatsCard({ icon, label, value, trend, trendUp, accentColor = 'lime' }: StatsCardProps) {
  const accent = ACCENT_CLASSES[accentColor];

  return (
    <div className="bg-card rounded-xl border border-border p-4 shadow-sm transition-colors hover:shadow-md">
      <div className="flex items-center justify-between">
        <div className={`w-9 h-9 rounded-lg ${accent.bg} border ${accent.border} flex items-center justify-center ${accent.text}`}>
          {icon}
        </div>
        {trend && (
          <span className={`text-[11px] font-mono font-bold ${trendUp ? 'text-emerald-400' : 'text-red-400'}`}>
            {trendUp ? '↑' : '↓'} {trend}
          </span>
        )}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-extrabold text-foreground tracking-tight">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
}
