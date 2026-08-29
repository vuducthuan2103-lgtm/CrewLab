'use client';

import React from 'react';
import { useOfficeStore } from '../state/office-store';
import { AgentAvatarIllustration } from './AgentAvatarIllustration';
import { Sparkles, CheckCircle2, AlertCircle, Play, X, ArrowRight, ShieldCheck, Calendar } from 'lucide-react';

export const DailyStandUpModal: React.FC = () => {
  const isOpen = useOfficeStore((s) => s.isStandUpModalOpen);
  const setOpen = useOfficeStore((s) => s.setStandUpModalOpen);
  const setAttentionQueueOpen = useOfficeStore((s) => s.setAttentionQueueOpen);
  const setActivityFeedOpen = useOfficeStore((s) => s.setActivityFeedOpen);
  const getSummary = useOfficeStore((s) => s.getSummary);
  const triggerCelebration = useOfficeStore((s) => s.triggerCelebration);

  if (!isOpen) return null;

  const summary = getSummary();

  const handleOpenAttention = () => {
    setOpen(false);
    setAttentionQueueOpen(true);
  };

  const handleOpenActivity = () => {
    setOpen(false);
    setActivityFeedOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-auto bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl rounded-3xl bg-[#0d0d12]/95 border border-purple-500/40 backdrop-blur-2xl shadow-2xl p-6 text-white animate-in zoom-in-95 duration-200 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-gradient-to-b from-purple-600/20 to-transparent pointer-events-none rounded-full blur-2xl" />

        {/* Close Button */}
        <button
          onClick={() => setOpen(false)}
          className="absolute top-4 right-4 p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with A01 Avatar */}
        <div className="flex items-center gap-4 mb-5 relative z-10">
          <div className="relative">
            <AgentAvatarIllustration code="A01" size="md" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black tracking-tight text-white">Họp Đầu Ngày Với A01</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Orchestrator
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Sếp Vũ · Báo cáo tổng quan tình hình vận hành Marketing hôm nay
            </p>
          </div>
        </div>

        {/* A01 Greeting Speech Box */}
        <div className="p-4 rounded-2xl bg-[#14141d] border border-zinc-800 text-sm text-zinc-200 mb-5 relative z-10 leading-relaxed shadow-inner">
          <p className="font-semibold text-white mb-2">
            Chào sếp! Đội ngũ 6 AI Agent đã vào vị trí và đồng bộ kế hoạch chiến dịch tuần này:
          </p>
          <div className="grid grid-cols-3 gap-3 mt-3">
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <div className="text-[10px] uppercase font-bold text-blue-400 flex items-center gap-1">
                <Play className="w-3 h-3" /> Đang chạy
              </div>
              <div className="text-xl font-black text-white mt-1">{summary.workingCount} Agent</div>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <div className="text-[10px] uppercase font-bold text-amber-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Cần bạn duyệt
              </div>
              <div className="text-xl font-black text-amber-300 mt-1">{summary.waitingForHumanCount} bài viết</div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Tổng nhân sự
              </div>
              <div className="text-xl font-black text-emerald-300 mt-1">{summary.totalAgents} Agent</div>
            </div>
          </div>
        </div>

        {/* Strategic Next Actions */}
        <div className="space-y-2 mb-6 relative z-10">
          <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
            Nhiệm vụ ưu tiên hôm nay:
          </div>

          {summary.waitingForHumanCount > 0 ? (
            <div
              onClick={handleOpenAttention}
              className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 hover:border-amber-400/60 cursor-pointer transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  !
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                    Có {summary.waitingForHumanCount} nội dung đang chờ bạn phê duyệt
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    Bao gồm bài viết từ D01 và hình ảnh từ D02
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-transform" />
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3 text-xs text-emerald-300">
              <CheckCircle2 className="w-4 h-4" />
              Tất cả các khâu đều thông suốt, không có bài viết nào bị ứ đọng.
            </div>
          )}
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-zinc-800/80 relative z-10">
          <button
            onClick={handleOpenActivity}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            <span>Xem Lịch Trình</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setOpen(false);
                triggerCelebration();
              }}
              className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-purple-300 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 transition-all flex items-center gap-1.5"
              title="Khen thưởng và ăn mừng toàn đội ngũ AI"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ăn Mừng Đội Ngũ 🎉</span>
            </button>

            <button
              onClick={() => setOpen(false)}
              className="px-5 py-2.5 rounded-xl text-xs font-black bg-[#D4FF00] hover:bg-[#e0ff33] text-[#09090B] shadow-lg shadow-[#D4FF00]/25 transition-all flex items-center gap-2"
            >
              <span>Vào Văn Phòng Làm Việc</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
