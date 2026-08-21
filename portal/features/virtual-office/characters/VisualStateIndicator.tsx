'use client';

import React from 'react';
import { Html } from '@react-three/drei';
import { AgentVisualState } from '../types/office';
import { AlertTriangle, Play, ShieldCheck, CheckCircle2, XCircle } from 'lucide-react';

interface VisualStateIndicatorProps {
  state: AgentVisualState;
  requiresHuman?: boolean;
}

export const VisualStateIndicator: React.FC<VisualStateIndicatorProps> = ({ state, requiresHuman }) => {
  const getBadge = () => {
    if (requiresHuman || state === 'waiting_human') {
      return (
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500 text-black text-[9px] font-black shadow-lg shadow-amber-500/40 border border-amber-300 animate-bounce whitespace-nowrap">
          <AlertTriangle className="w-2.5 h-2.5 fill-black stroke-amber-500" />
          <span>CẦN DUYỆT</span>
        </div>
      );
    }
    switch (state) {
      case 'working':
      case 'reworking':
        return (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500 text-black text-[9px] font-bold shadow-md shadow-emerald-500/30 whitespace-nowrap">
            <Play className="w-2.5 h-2.5 fill-black" />
            <span>LÀM VIỆC</span>
          </div>
        );
      case 'reviewing':
        return (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500 text-white text-[9px] font-bold shadow-md shadow-indigo-500/30 whitespace-nowrap">
            <ShieldCheck className="w-2.5 h-2.5" />
            <span>KIỂM DUYỆT</span>
          </div>
        );
      case 'success':
        return (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#D4FF00] text-black text-[9px] font-black shadow-md shadow-[#D4FF00]/40 whitespace-nowrap">
            <CheckCircle2 className="w-2.5 h-2.5" />
            <span>XONG</span>
          </div>
        );
      case 'error':
      case 'rejected':
        return (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold shadow-md shadow-red-500/40 animate-pulse whitespace-nowrap">
            <XCircle className="w-2.5 h-2.5" />
            <span>LỖI</span>
          </div>
        );
      case 'idle':
      default:
        return (
          <div className="px-1.5 py-0.5 rounded-full bg-zinc-800/90 text-zinc-400 text-[8px] font-medium border border-zinc-700 whitespace-nowrap">
            ● CHỜ
          </div>
        );
    }
  };

  return (
    <Html position={[0, 2.15, 0]} center distanceFactor={14} zIndexRange={[40, 0]}>
      <div className="pointer-events-none select-none">
        {getBadge()}
      </div>
    </Html>
  );
};
