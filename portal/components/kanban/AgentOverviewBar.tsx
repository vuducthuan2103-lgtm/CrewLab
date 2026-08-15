'use client';

import React, { useState } from 'react';
import { AgentCode } from '@/lib/types';
import { AGENT_REGISTRY, getAgentStats } from '@/lib/taskHumanizer';
import { usePortal } from '@/lib/store';
import AgentDetailModal from './AgentDetailModal';

const AGENT_LIST: AgentCode[] = ['A01', 'B02', 'B03', 'D01', 'D02', 'E01'];

interface AgentOverviewBarProps {
  selectedAgent: AgentCode | null;
  onSelectAgent: (agentCode: AgentCode | null) => void;
}

export default function AgentOverviewBar({
  selectedAgent,
  onSelectAgent,
}: AgentOverviewBarProps) {
  const { tasks, agentModelConfigs } = usePortal();
  const [modalAgent, setModalAgent] = useState<AgentCode | null>(null);

  return (
    <div className="space-y-3 mb-6">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
            Hệ thống 6 AI Agents
          </span>
          <span className="text-[11px] text-zinc-500 font-medium">
            (Bấm vào thẻ để xem chi tiết Model, Token hoặc lọc công việc)
          </span>
        </div>

        {selectedAgent && (
          <button
            onClick={() => onSelectAgent(null)}
            className="text-xs text-lime-brand hover:underline font-semibold"
          >
            Hiển thị tất cả Agents
          </button>
        )}
      </div>

      {/* 6 Agent Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {AGENT_LIST.map((code) => {
          const agent = AGENT_REGISTRY[code];
          const config = (agentModelConfigs || []).find((c) => c.agentCode === code);
          const stats = getAgentStats(
            code,
            tasks || [],
            config?.selectedModel,
            config?.tier,
            config?.budgetUSD || 20
          );
          const isSelected = selectedAgent === code;
          const isRunning = stats.taskCount.inProgress > 0;

          return (
            <div
              key={code}
              onClick={() => onSelectAgent(isSelected ? null : code)}
              className={`
                group relative p-3 rounded-xl border text-left cursor-pointer transition-all duration-200
                ${
                  isSelected
                    ? 'bg-zinc-900 border-lime-brand shadow-lg ring-1 ring-lime-brand/40 -translate-y-0.5'
                    : 'bg-zinc-950/80 border-zinc-800/80 hover:bg-zinc-900/60 hover:border-zinc-700'
                }
              `}
            >
              {/* Top row: Agent code + Status dot */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-200">
                  {code}
                </span>

                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isRunning
                        ? 'bg-cyan-400 animate-pulse'
                        : stats.taskCount.done > 0
                        ? 'bg-emerald-400'
                        : 'bg-zinc-600'
                    }`}
                  />
                  <span className="text-[10px] font-medium text-zinc-400 font-mono">
                    {isRunning ? 'Đang chạy' : 'Sẵn sàng'}
                  </span>
                </div>
              </div>

              {/* Name & Role */}
              <div className="space-y-0.5 mb-2.5">
                <div className="text-xs font-bold text-white tracking-tight truncate">
                  {agent.name}
                </div>
                <div className="text-[10px] text-zinc-400 truncate">{agent.role}</div>
              </div>

              {/* Bottom stats: Model & Quota */}
              <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[10px] font-mono text-zinc-400">
                <span className="truncate flex-1 pr-1 text-zinc-300" title={stats.model}>{stats.model}</span>
                <span className="text-lime-brand font-semibold shrink-0">{stats.remainingPercent}% Quota</span>
              </div>

              {/* Detail button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setModalAgent(code);
                }}
                className="mt-2 w-full py-1 text-[10px] text-center font-semibold rounded bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                Xem chi tiết Agent
              </button>
            </div>
          );
        })}
      </div>

      {/* Agent Detail Modal */}
      {modalAgent && (
        <AgentDetailModal
          agentCode={modalAgent}
          onClose={() => setModalAgent(null)}
          onSelectAgentFilter={onSelectAgent}
          isFiltered={selectedAgent === modalAgent}
        />
      )}
    </div>
  );
}
