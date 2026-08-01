'use client';

import React from 'react';
import { AgentInfo } from '@/lib/types';
import { CheckCircle2, ChevronRight } from 'lucide-react';

interface AgentCardProps {
  agent: AgentInfo;
  selected?: boolean;
  onClick?: () => void;
}

export default function AgentCard({ agent, selected = false, onClick }: AgentCardProps) {
  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
        selected
          ? 'bg-card border-lime-admin shadow-md shadow-lime-glow-sm'
          : 'bg-card border-border hover:border-muted-foreground/30 shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-muted border border-border flex items-center justify-center font-mono font-bold text-sm text-lime-admin">
            {agent.code}
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">{agent.name}</h3>
            <p className="text-[11px] text-muted-foreground line-clamp-1">{agent.role}</p>
          </div>
        </div>

        {agent.status === 'running' && (
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-admin opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-admin" />
          </span>
        )}
        {agent.status === 'completed' && (
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        )}
        {agent.status === 'failed' && (
          <span className="w-4 h-4 text-red-400 font-bold text-xs">✕</span>
        )}
        {agent.status === 'idle' && (
          <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30" />
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground font-mono">
        <span>Gần nhất: {agent.lastRun}</span>
        <span className="text-lime-admin font-bold flex items-center gap-0.5">
          Chi tiết <ChevronRight size={11} />
        </span>
      </div>
    </div>
  );
}
