'use client';

import React from 'react';
import { useOfficeStore } from '../state/office-store';
import { X, User, ChevronRight, AlertTriangle, Play, Cpu, Coins, Footprints } from 'lucide-react';
import { AgentCode } from '../types/office';

import { AGENT_PERSONA_CATALOG } from '../config/agent-personas';
import { AgentAvatarIllustration } from './AgentAvatarIllustration';

export const AccessibleTeamRoster: React.FC = () => {
  const isAccessibleRosterOpen = useOfficeStore((s) => s.isAccessibleRosterOpen);
  const setAccessibleRosterOpen = useOfficeStore((s) => s.setAccessibleRosterOpen);
  const selectAgent = useOfficeStore((s) => s.selectAgent);
  const startAutoWalk = useOfficeStore((s) => s.startAutoWalk);
  const agents = useOfficeStore((s) => s.agents);

  if (!isAccessibleRosterOpen) return null;

  const agentList = Object.values(agents);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in"
      style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
    >
      <div className="w-full max-w-2xl bg-[#131316] border border-zinc-800 rounded-2xl shadow-2xl p-6 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <User className="w-5 h-5 text-[#D4FF00]" />
              Danh Sách Đội Ngũ Marketing AI (6 Agents)
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Thống kê Token, Mô hình AI và Tác vụ phân luồng thời gian thực
            </p>
          </div>
          <button
            onClick={() => setAccessibleRosterOpen(false)}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List of Agents */}
        <div className="mt-4 space-y-3 overflow-y-auto pr-1">
          {agentList.map((agent) => {
            const persona = AGENT_PERSONA_CATALOG[agent.code];
            return (
              <div
                key={agent.code}
                onClick={() => {
                  setAccessibleRosterOpen(false);
                  selectAgent(agent.code as AgentCode);
                }}
                className="p-3.5 rounded-xl bg-[#1c1c21] hover:bg-[#27272a]/60 border border-zinc-800 hover:border-[#D4FF00]/50 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                <div className="flex items-start gap-3.5">
                  <AgentAvatarIllustration code={agent.code} size="md" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white group-hover:text-[#D4FF00] transition-colors text-sm">
                        {persona?.realName || agent.displayName}
                      </span>
                      <span className="text-xs text-[#D4FF00] font-medium">
                        ({persona?.nickname.split(' "')[0]})
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 font-mono text-zinc-300">
                        {agent.tokenStats.model}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-400 mt-0.5">
                      {agent.role}
                    </div>
                    {agent.currentTask && (
                      <div className="text-[11px] text-zinc-300 font-medium mt-1 truncate max-w-md">
                        ▶ {agent.currentTask.title}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startAutoWalk(agent.code);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-[#D4FF00]/15 hover:bg-[#D4FF00] text-[#D4FF00] hover:text-[#09090b] text-[11px] font-bold border border-[#D4FF00]/30 transition-all flex items-center gap-1"
                    title="CEO tự động đi tới bàn của Agent"
                  >
                    <Footprints className="w-3 h-3" />
                    <span>Đi tới</span>
                  </button>
                  <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-4 mt-4 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
          <span>Click vào bất kỳ Agent nào để mở bảng thao tác tác vụ chi tiết.</span>
          <button
            onClick={() => setAccessibleRosterOpen(false)}
            className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-xs"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
