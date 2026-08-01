import React from 'react';
import { ContentState, STATE_COLORS } from '@/lib/types';

interface StatusBadgeProps {
  state: ContentState;
  label?: string;
  className?: string;
}

export default function StatusBadge({ state, label, className = '' }: StatusBadgeProps) {
  const colors = STATE_COLORS[state];

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono border ${colors.bg} ${colors.text} ${colors.border} ${className}`}
    >
      {label || state}
    </span>
  );
}
