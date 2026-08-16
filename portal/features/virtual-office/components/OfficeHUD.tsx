'use client';

import React, { useState } from 'react';
import { useOfficeStore } from '../state/office-store';
import { Users, Sparkles, AlertCircle, Play, CheckCircle2, XCircle, ChevronDown, ChevronUp, BookUser, Box, Sun, Moon, Footprints } from 'lucide-react';
import { AgentVisualState } from '../types/office';
import { CEOAttentionQueue } from './CEOAttentionQueue';
import { OfficeActivityFeed } from './OfficeActivityFeed';

// Debug toolbar only shown when ?debugOffice=1 is in the URL
const isDebugMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debugOffice') === '1';

export const OfficeHUD: React.FC = () => {
  const [isMockCollapsed, setIsMockCollapsed] = useState(false);
  const setAccessibleRosterOpen = useOfficeStore((s) => s.setAccessibleRosterOpen);
  const setAttentionQueueOpen = useOfficeStore((s) => s.setAttentionQueueOpen);
  const setActivityFeedOpen = useOfficeStore((s) => s.setActivityFeedOpen);
  const autoWalkTargetAgentCode = useOfficeStore((s) => s.autoWalkTargetAgentCode);
  const cancelAutoWalk = useOfficeStore((s) => s.cancelAutoWalk);
  const getSummary = useOfficeStore((s) => s.getSummary);
  const mockSwitchA01State = useOfficeStore((s) => s.mockSwitchA01State);
  const a01 = useOfficeStore((s) => s.agents['A01']);
  const activeTab = useOfficeStore((s) => s.activeTab);
  const setActiveTab = useOfficeStore((s) => s.setActiveTab);
  const timeOfDay = useOfficeStore((s) => s.timeOfDay);
  const toggleTimeOfDay = useOfficeStore((s) => s.toggleTimeOfDay);

  const summary = getSummary();

  // Debug-only: normalized state labels (no "Kiệt" in production)
  const debugStates: { label: string; state: AgentVisualState; color: string; icon: React.ReactNode }[] = [
    { label: 'working',       state: 'working',       color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40', icon: <Play className="w-2.5 h-2.5 fill-current" /> },
    { label: 'waiting_human', state: 'waiting_human', color: 'bg-amber-500/20 text-amber-400 border-amber-500/40',      icon: <AlertCircle className="w-2.5 h-2.5" /> },
    { label: 'idle',          state: 'idle',          color: 'bg-zinc-800 text-zinc-400 border-zinc-700',               icon: <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" /> },
    { label: 'success',       state: 'success',       color: 'bg-[#D4FF00]/20 text-[#D4FF00] border-[#D4FF00]/40',     icon: <CheckCircle2 className="w-2.5 h-2.5" /> },
    { label: 'error',         state: 'error',         color: 'bg-red-500/20 text-red-400 border-red-500/40',           icon: <XCircle className="w-2.5 h-2.5" /> },
  ];

  return (
    <div className="pointer-events-none fixed inset-0 left-[68px] z-40 flex flex-col justify-between p-4 select-none">
      {/* ══════════════════════════
          TOP HEADER & NAVIGATION BAR (Streamlined 1-Row Floating Bar)
         ══════════════════════════ */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* ── 1. PRIMARY TABS SWITCHER (Left) ── */}
        <div className="pointer-events-auto flex items-center p-1 rounded-2xl bg-[#0d0d12]/95 border border-zinc-800 backdrop-blur-xl shadow-2xl">
          <button
            onClick={() => setActiveTab('3d_office')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === '3d_office'
                ? 'bg-[#D4FF00] text-[#09090B] shadow-md shadow-[#D4FF00]/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <Box className="w-4 h-4" />
            <span>Văn Phòng 3D</span>
          </button>

          <button
            onClick={() => setActiveTab('dossier')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'dossier'
                ? 'bg-[#D4FF00] text-[#09090B] shadow-md shadow-[#D4FF00]/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <BookUser className="w-4 h-4" />
            <span>Hồ Sơ Nhân Sự AI</span>
            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-purple-500/20 text-purple-300 font-mono">
              6 Agent
            </span>
          </button>
        </div>

        {/* ── 2. REAL-TIME STATUS & ACTION PILLS (Center) ── */}
        <div className="pointer-events-auto flex items-center gap-2 flex-wrap">
          {/* Live Active Status Pill */}
          <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[#0d0d12]/95 backdrop-blur-xl border border-zinc-800 text-[11px] font-medium text-zinc-300 shadow-xl">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{summary.workingCount} Agent đang làm</span>
          </div>

          {/* Attention Queue Pill */}
          <button
            onClick={() => setAttentionQueueOpen(true)}
            className={`px-3.5 py-2 rounded-2xl backdrop-blur-xl border text-xs font-bold flex items-center gap-1.5 shadow-xl transition-all ${
              summary.waitingForCeoCount > 0
                ? 'bg-[#0d0d12]/95 border-amber-500/40 text-amber-300 hover:bg-amber-500/20 shadow-amber-500/10 cursor-pointer'
                : 'bg-[#0d0d12]/95 border-zinc-800 text-zinc-400 hover:text-white'
            }`}
            title="Hàng đợi công việc cần CEO phê duyệt"
          >
            <AlertCircle className={`w-3.5 h-3.5 ${summary.waitingForCeoCount > 0 ? 'text-amber-400' : 'text-zinc-500'}`} />
            <span>{summary.waitingForCeoCount > 0 ? `${summary.waitingForCeoCount} Cần bạn duyệt` : '0 Cần duyệt'}</span>
          </button>

          {/* Daily Stand-Up Pill */}
          <button
            onClick={() => useOfficeStore.getState().setStandUpModalOpen(true)}
            className="px-3.5 py-2 rounded-2xl bg-[#2e1065]/70 hover:bg-[#3b0764] border border-purple-500/40 text-purple-200 text-xs font-bold shadow-xl backdrop-blur-xl flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            title="Mở báo cáo Họp Đầu Ngày với A01"
          >
            <BookUser className="w-3.5 h-3.5 text-purple-300" />
            <span>Họp Đầu Ngày</span>
          </button>

          {/* Activity Feed Pill */}
          <button
            onClick={() => setActivityFeedOpen(true)}
            className="px-3.5 py-2 rounded-2xl bg-[#0d0d12]/95 hover:bg-[#181822] text-zinc-300 hover:text-white text-xs font-bold border border-zinc-800 backdrop-blur-xl flex items-center gap-1.5 transition-all shadow-xl hover:border-purple-500/40 cursor-pointer"
            title="Nhật ký hoạt động marketing thời gian thực"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Hoạt động</span>
          </button>
        </div>

        {/* ── 3. DAY / NIGHT THEME TOGGLE (Right) ── */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={toggleTimeOfDay}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl border backdrop-blur-xl transition-all shadow-2xl font-bold text-xs ${
              timeOfDay === 'day'
                ? 'bg-amber-400/20 border-amber-400/50 text-amber-300 shadow-amber-500/20 hover:bg-amber-400/30'
                : 'bg-[#0d0d12]/95 border-indigo-500/40 text-indigo-300 shadow-indigo-500/20 hover:bg-[#1a1a24]'
            }`}
            title={`Chuyển sang chế độ ${timeOfDay === 'day' ? 'Ban Đêm' : 'Ban Ngày'}`}
          >
            {timeOfDay === 'day' ? (
              <>
                <Sun className="w-4 h-4 text-amber-300 animate-spin" style={{ animationDuration: '16s' }} />
                <span>Ban Ngày ☀️</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-indigo-300" />
                <span>Ban Đêm 🌙</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── AUTO-WALK NAVIGATION BANNER (When CEO is walking automatically) ── */}
      {autoWalkTargetAgentCode && (
        <div className="pointer-events-auto self-center mt-2 px-4 py-2 rounded-2xl bg-[#D4FF00] text-[#09090b] shadow-2xl font-black text-xs flex items-center gap-3 animate-bounce">
          <span>🚶 Đang tự động đi tới {autoWalkTargetAgentCode}...</span>
          <button
            onClick={cancelAutoWalk}
            className="px-2 py-0.5 rounded-lg bg-[#09090b] text-white text-[10px] font-bold hover:bg-zinc-800 transition-colors"
          >
            Hủy
          </button>
        </div>
      )}

      {/* ── P2.4 WEEKLY MILESTONE CELEBRATION TOAST BANNER ── */}
      {useOfficeStore((s) => s.isCelebrationActive) && (
        <div className="pointer-events-none self-center mt-3 px-5 py-2.5 rounded-3xl bg-gradient-to-r from-purple-600 via-[#D4FF00] to-pink-500 text-[#09090B] font-black text-xs shadow-2xl shadow-purple-500/30 flex items-center gap-2.5 animate-in slide-in-from-top duration-300">
          <Sparkles className="w-4 h-4 text-[#09090B] animate-spin" />
          <span>🎉 TUẦN MARKETING HOÀN TẤT! Đội ngũ 6 AI Agent đã hoàn thành 100% chỉ tiêu!</span>
        </div>
      )}

      {/* Mount Attention Queue Modal & Activity Feed Drawer */}
      <CEOAttentionQueue />
      <OfficeActivityFeed />

      {/* ══════════════════════════
          BOTTOM BAR (Only in 3D Office Mode)
         ══════════════════════════ */}
      {activeTab === '3d_office' && (
        <div className="flex flex-wrap items-end justify-between gap-3">
          {/* Bottom Left Controls Group */}
          <div className="pointer-events-auto px-3.5 py-2 rounded-2xl bg-[#0d0d12]/95 backdrop-blur-md border border-zinc-800 text-[11px] text-zinc-400 flex items-center gap-2.5 shadow-2xl">
            <div className="flex items-center gap-1 font-mono text-[#D4FF00] font-bold text-[10px]">
              {(['W', 'A', 'S', 'D'] as const).map((k) => (
                <button
                  key={k}
                  onMouseDown={() => {
                    window.dispatchEvent(new KeyboardEvent('keydown', { code: `Key${k}`, key: k.toLowerCase(), bubbles: true }));
                  }}
                  onMouseUp={() => {
                    window.dispatchEvent(new KeyboardEvent('keyup', { code: `Key${k}`, key: k.toLowerCase(), bubbles: true }));
                  }}
                  onTouchStart={() => {
                    window.dispatchEvent(new KeyboardEvent('keydown', { code: `Key${k}`, key: k.toLowerCase(), bubbles: true }));
                  }}
                  onTouchEnd={() => {
                    window.dispatchEvent(new KeyboardEvent('keyup', { code: `Key${k}`, key: k.toLowerCase(), bubbles: true }));
                  }}
                  className="px-2 py-1 rounded bg-zinc-800 hover:bg-[#D4FF00] hover:text-black active:scale-90 border border-zinc-700 transition-transform font-bold cursor-pointer select-none"
                  title={`Nhấn giữ hoặc dùng phím ${k} để đi`}
                >
                  {k}
                </button>
              ))}
            </div>
            <span className="font-medium text-zinc-300">di chuyển CEO</span>
            <span className="text-zinc-600">•</span>
            <span className="text-[#D4FF00] font-semibold">Đi gần Agent để hiện thông tin</span>
            <span className="text-zinc-600">•</span>
            <span className="text-zinc-400 font-medium">Scroll để zoom</span>
          </div>

          {/* Debug State Toolbar — ONLY visible with ?debugOffice=1 */}
          {isDebugMode && (
            <div className="pointer-events-auto self-end">
              <div className="px-3.5 py-2 rounded-2xl bg-red-950/80 backdrop-blur-xl border border-red-800/60 shadow-2xl flex items-center gap-2">
                <button
                  onClick={() => setIsMockCollapsed(!isMockCollapsed)}
                  className="flex items-center gap-1.5 text-[11px] font-bold text-red-300 hover:text-white transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-red-400" />
                  <span>DEBUG: A01 State</span>
                  {isMockCollapsed ? <ChevronUp className="w-3 h-3 text-red-500" /> : <ChevronDown className="w-3 h-3 text-red-500" />}
                </button>

                {!isMockCollapsed && (
                  <div className="flex items-center gap-1 pl-2 border-l border-red-800/60">
                    {debugStates.map((item) => {
                      const isActive = a01?.visualState === item.state;
                      return (
                        <button
                          key={item.state}
                          onClick={() => mockSwitchA01State(item.state)}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border transition-all flex items-center gap-1 ${
                            isActive
                              ? `${item.color} ring-1 ring-[#D4FF00]/50 scale-105 shadow-sm`
                              : 'bg-[#18181b] text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700'
                          }`}
                        >
                          {item.icon}
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

