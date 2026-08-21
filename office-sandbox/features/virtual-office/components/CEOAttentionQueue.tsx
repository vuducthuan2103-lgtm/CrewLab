'use client';

import React from 'react';
import { useOfficeStore } from '../state/office-store';
import { AgentAvatarIllustration } from './AgentAvatarIllustration';
import { AlertCircle, Footprints, Eye, X, Clock, CheckCircle2 } from 'lucide-react';
import { AgentCode } from '../types/office';

export const CEOAttentionQueue: React.FC = () => {
  const isOpen = useOfficeStore((s) => s.isAttentionQueueOpen);
  const setOpen = useOfficeStore((s) => s.setAttentionQueueOpen);
  const getAttentionQueueItems = useOfficeStore((s) => s.getAttentionQueueItems);
  const startAutoWalk = useOfficeStore((s) => s.startAutoWalk);
  const selectAgent = useOfficeStore((s) => s.selectAgent);

  if (!isOpen) return null;

  const items = getAttentionQueueItems();

  const handleGoToAgent = (code: AgentCode) => {
    startAutoWalk(code);
  };

  const handleInspectAgent = (code: AgentCode) => {
    selectAgent(code);
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 pointer-events-auto bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg rounded-3xl bg-[#0e0e14]/95 border border-zinc-700/80 backdrop-blur-2xl shadow-2xl p-5 text-white animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center font-bold">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-tight text-white flex items-center gap-2">
                Hàng Đợi Cần Duyệt
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {items.length} nhiệm vụ
                </span>
              </h2>
              <p className="text-[11px] text-zinc-400">Các Agent đang chờ quyết định hoặc phê duyệt từ bạn</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Item List */}
        <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
          {items.length === 0 ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
              <p className="text-sm font-bold text-zinc-300">Không có việc cần bạn xử lý lúc này!</p>
              <p className="text-xs text-zinc-500 mt-1">Đội ngũ AI đang tự động thực thi trơn tru theo kế hoạch.</p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.agentCode}
                className="group p-3.5 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800/80 border border-zinc-800 hover:border-amber-500/40 transition-all shadow-md"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 border border-zinc-700 bg-zinc-800">
                    <AgentAvatarIllustration code={item.agentCode} className="w-full h-full object-cover" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white tracking-tight">{item.agentName}</span>
                        <span className="text-[10px] text-zinc-400 font-medium">({item.agentRole})</span>
                      </div>
                      <span className="text-[10px] font-semibold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {item.waitingSince}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-200 mt-1 font-medium line-clamp-2 leading-relaxed">
                      {item.actionPrompt}
                    </p>

                    <div className="text-[10px] text-zinc-400 mt-1 flex items-center gap-1.5 font-mono">
                      <span>Nhiệm vụ:</span>
                      <span className="text-zinc-300 font-semibold truncate">{item.taskTitle}</span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-zinc-800/60">
                      <button
                        onClick={() => handleGoToAgent(item.agentCode)}
                        className="flex-1 px-3 py-1.5 rounded-xl bg-[#D4FF00] hover:bg-[#c2eb00] text-[#09090b] text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-[#D4FF00]/15"
                      >
                        <Footprints className="w-3.5 h-3.5" />
                        <span>Đi tới bàn làm việc</span>
                      </button>

                      <button
                        onClick={() => handleInspectAgent(item.agentCode)}
                        className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1 transition-all border border-zinc-700"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Xem chi tiết</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer with A01 Briefing Link */}
        <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
          <button
            onClick={() => {
              setOpen(false);
              useOfficeStore.getState().setStandUpModalOpen(true);
            }}
            className="text-xs font-bold text-purple-300 hover:text-purple-200 flex items-center gap-1.5 hover:underline"
          >
            <span>📋 Xem Báo Cáo Họp Đầu Ngày (A01)</span>
          </button>

          <button
            onClick={() => setOpen(false)}
            className="px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
