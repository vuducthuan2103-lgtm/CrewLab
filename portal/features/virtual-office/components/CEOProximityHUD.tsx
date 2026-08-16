'use client';

import React, { useEffect } from 'react';
import { useOfficeStore } from '../state/office-store';
import { AgentAvatarIllustration } from './AgentAvatarIllustration';
import { AGENT_PERSONA_CATALOG } from '../config/agent-personas';
import { Play, AlertTriangle, CheckCircle2, ShieldCheck, UserCheck, ArrowRight, BookUser, Sparkles, X } from 'lucide-react';
import { AgentCode } from '../types/office';

export const CEOProximityHUD: React.FC = () => {
  const nearbyAgentCode = useOfficeStore((s) => s.nearbyAgentCode);
  const agents = useOfficeStore((s) => s.agents);
  const selectAgent = useOfficeStore((s) => s.selectAgent);
  const setActiveTab = useOfficeStore((s) => s.setActiveTab);
  const dismissNearbyHUD = useOfficeStore((s) => s.dismissNearbyHUD);

  const agent = nearbyAgentCode ? agents[nearbyAgentCode] : null;
  const persona = nearbyAgentCode ? AGENT_PERSONA_CATALOG[nearbyAgentCode] : null;

  // Keyboard shortcut: Press 'E' to inspect nearby agent
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.code === 'KeyE' || e.key === 'e' || e.key === 'E') && nearbyAgentCode) {
        selectAgent(nearbyAgentCode);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nearbyAgentCode, selectAgent]);

  if (!agent || !persona) return null;

  const getAgentGreeting = () => {
    switch (agent.code) {
      case 'A01':
        return '“Báo cáo CEO! Toàn bộ 5 Agent đang vận hành theo đúng tiến độ chu kỳ tuần.”';
      case 'B02':
        return '“Chào Sếp! Em vừa lọc ra 3 xu hướng F&B cực hot cho tuần tới, Sếp xem qua nhé!”';
      case 'B03':
        return '“Chào Sếp! Lịch đăng 7 ngày tới đã được căn chuẩn từng khung giờ vàng rồi ạ.”';
      case 'D01':
        return '“Sếp ơi! Em vừa lên 3 biến thể Hook cho bài Combo Trưa, đọc cuốn lắm ạ~”';
      case 'D02':
        return '“Chào Sếp! Visual poster món mới em phối theo tone hoàng hôn rực rỡ lắm ạ!”';
      case 'E01':
        return '“Chào Sếp! Toàn bộ nội dung và hình ảnh tuần này đã qua 47 tiêu chí kiểm duyệt an toàn.”';
      default:
        return '“Chào Sếp! Em đã sẵn sàng nhận lệnh mới.”';
    }
  };

  return (
    <div
      className="pointer-events-auto fixed bottom-20 left-1/2 -translate-x-1/2 z-40 w-full max-w-xl px-4 animate-in slide-in-from-bottom duration-300 select-none"
      style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
    >
      <div className="relative rounded-2xl bg-[#0f0f14]/95 backdrop-blur-2xl border-2 border-[#D4FF00]/80 p-4 shadow-[0_10px_40px_rgba(212,255,0,0.2)] flex flex-col gap-3">
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <AgentAvatarIllustration code={agent.code} size="md" />

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#D4FF00] text-[#09090B]">
                  GẦN CEO: {agent.code}
                </span>
                <span className="text-xs text-zinc-400 font-medium">{persona.title}</span>
              </div>
              <h3 className="text-base font-black text-white tracking-tight flex items-center gap-1.5 mt-0.5">
                <span>{persona.realName}</span>
                <span className="text-xs text-[#D4FF00] font-bold font-sans">({persona.nickname})</span>
              </h3>
            </div>
          </div>

          <button
            onClick={() => dismissNearbyHUD(agent.code)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Đóng tab này (sẽ không hiện lại khi vẫn đứng gần)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Greeting Quote */}
        <div className="px-3 py-2 rounded-xl bg-[#161620] border border-zinc-800 text-xs text-zinc-200 font-medium italic leading-relaxed">
          {getAgentGreeting()}
        </div>

        {/* Current Task preview */}
        {agent.currentTask && (
          <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
            <Play className="w-3 h-3 text-emerald-400 shrink-0 fill-current" />
            <span className="text-zinc-400">Đang làm:</span>
            <span className="text-zinc-200 font-semibold truncate">{agent.currentTask.title}</span>
          </div>
        )}

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          {agent.code === 'A01' && (
            <button
              onClick={() => useOfficeStore.getState().setStandUpModalOpen(true)}
              className="py-2 px-3 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-transform active:scale-95 shadow-md shadow-purple-500/20"
            >
              <BookUser className="w-3.5 h-3.5" />
              <span>Họp Đầu Ngày</span>
            </button>
          )}

          <button
            onClick={() => selectAgent(agent.code)}
            className="flex-1 py-2 px-3 rounded-xl bg-[#D4FF00] hover:bg-[#E5FF55] text-[#09090B] font-bold text-xs flex items-center justify-center gap-1.5 transition-transform active:scale-95 shadow-md shadow-[#D4FF00]/15"
          >
            <span>Mở Bảng Tác Vụ</span>
            <kbd className="px-1.5 py-0.2 rounded bg-black/20 text-[10px] font-mono font-black">E</kbd>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setActiveTab('dossier')}
            className="py-2 px-3 rounded-xl bg-[#1f1f28] hover:bg-[#2a2a38] text-white font-semibold text-xs border border-zinc-700 flex items-center gap-1.5 transition-colors"
          >
            <BookUser className="w-3.5 h-3.5 text-purple-400" />
            <span>Hồ Sơ</span>
          </button>
        </div>
      </div>
    </div>
  );
};
