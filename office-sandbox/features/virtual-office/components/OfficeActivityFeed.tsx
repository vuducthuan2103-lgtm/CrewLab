'use client';

import React from 'react';
import { useOfficeStore } from '../state/office-store';
import { AgentAvatarIllustration } from './AgentAvatarIllustration';
import { Zap, X, CheckCircle2, Play, Sparkles, UserCheck, ArrowRight, Footprints } from 'lucide-react';
import { AgentCode } from '../types/office';

export const OfficeActivityFeed: React.FC = () => {
  const isOpen = useOfficeStore((s) => s.isActivityFeedOpen);
  const setOpen = useOfficeStore((s) => s.setActivityFeedOpen);
  const getActivityFeedEvents = useOfficeStore((s) => s.getActivityFeedEvents);
  const startAutoWalk = useOfficeStore((s) => s.startAutoWalk);
  const selectAgent = useOfficeStore((s) => s.selectAgent);

  if (!isOpen) return null;

  const events = getActivityFeedEvents();

  const getEventBadge = (type: string) => {
    switch (type) {
      case 'review':
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1"><UserCheck className="w-2.5 h-2.5" /> Duyệt bài</span>;
      case 'working':
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1"><Play className="w-2 h-2 fill-current" /> Đang làm</span>;
      case 'success':
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#D4FF00]/20 text-[#D4FF00] border border-[#D4FF00]/30 flex items-center gap-1"><CheckCircle2 className="w-2.5 h-2.5" /> Hoàn tất</span>;
      case 'handoff':
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1"><ArrowRight className="w-2.5 h-2.5" /> Chuyển giao</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-zinc-700 text-zinc-300">Hoạt động</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-4 pt-20 pointer-events-auto bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md rounded-3xl bg-[#0e0e14]/95 border border-zinc-700/80 backdrop-blur-2xl shadow-2xl p-5 text-white animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/40 flex items-center justify-center font-bold">
              <Zap className="w-4 h-4 text-purple-300" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-tight text-white flex items-center gap-2">
                Nhật Ký Hoạt Động AI
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
                </span>
              </h2>
              <p className="text-[11px] text-zinc-400">Tiến trình marketing tự động đang chạy thực tế</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Timeline Events */}
        <div className="relative pl-6 space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {/* Vertical Timeline Guide */}
          <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-zinc-800" />

          {events.map((ev) => (
            <div key={ev.id} className="relative group">
              {/* Timeline Marker Dot */}
              <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-zinc-900 border-2 border-purple-400 group-hover:scale-125 transition-transform" />

              <div className="p-3 rounded-2xl bg-zinc-900/70 hover:bg-zinc-800/80 border border-zinc-800 transition-all">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-zinc-400">{ev.time}</span>
                    <span className="text-xs font-bold text-white">{ev.agentName}</span>
                  </div>
                  {getEventBadge(ev.type)}
                </div>

                <div className="text-xs font-semibold text-zinc-200 mt-1.5">{ev.title}</div>
                <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">{ev.description}</p>

                {/* Quick Go-To & Handoff Action */}
                <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-zinc-800/50">
                  {ev.type === 'handoff' ? (
                    <button
                      onClick={() => {
                        useOfficeStore.getState().triggerTaskHandoff('D01', 'D02', 'Combo Trưa');
                        setOpen(false);
                      }}
                      className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold hover:bg-amber-500/30 transition-all flex items-center gap-1"
                    >
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>Xem Handoff 3D</span>
                    </button>
                  ) : (
                    <div />
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        startAutoWalk(ev.agentCode);
                      }}
                      className="text-[10px] font-bold text-[#D4FF00] hover:underline flex items-center gap-1"
                    >
                      <Footprints className="w-3 h-3" />
                      <span>Đi tới Agent</span>
                    </button>
                    <button
                      onClick={() => {
                        selectAgent(ev.agentCode);
                        setOpen(false);
                      }}
                      className="text-[10px] text-zinc-400 hover:text-white hover:underline"
                    >
                      Xem chi tiết →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
