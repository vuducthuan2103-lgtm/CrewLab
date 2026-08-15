'use client';

import React from 'react';
import { AgentCode, TaskCard } from '@/lib/types';
import { AGENT_REGISTRY, getAgentStats, humanizeTaskTitle } from '@/lib/taskHumanizer';
import { usePortal } from '@/lib/store';

interface AgentDetailModalProps {
  agentCode: AgentCode;
  onClose: () => void;
  onSelectAgentFilter?: (code: AgentCode | null) => void;
  isFiltered?: boolean;
}

export default function AgentDetailModal({
  agentCode,
  onClose,
  onSelectAgentFilter,
  isFiltered,
}: AgentDetailModalProps) {
  const { tasks, agentModelConfigs, contentItems } = usePortal();
  const agent = AGENT_REGISTRY[agentCode] || AGENT_REGISTRY.A01;
  const config = agentModelConfigs.find((c) => c.agentCode === agentCode);

  const stats = getAgentStats(
    agentCode,
    tasks,
    config?.selectedModel,
    config?.tier,
    config?.budgetUSD || 20
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden text-zinc-100 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-zinc-800 bg-zinc-900/40">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center font-mono font-bold text-lg text-zinc-100 shrink-0">
              {agent.code}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-bold text-white tracking-tight">{agent.name}</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full border border-zinc-700 bg-zinc-800/80 text-zinc-300 font-medium">
                  {agent.role}
                </span>
                {stats.activeTask && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-800 font-medium">
                    Đang xử lý
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed max-w-lg">
                {agent.fullDesc}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 flex items-center justify-center transition-colors text-sm font-semibold"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Grid Stats: Model & Token Usage */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Box 1: Cấu hình Model */}
            <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/80 space-y-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Mô hình AI đang vận hành
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white font-mono">{stats.model}</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                  {stats.tier}
                </span>
              </div>
              <div className="text-xs text-zinc-400 flex items-center justify-between pt-2 border-t border-zinc-800/60">
                <span>Ngân sách phân bổ:</span>
                <span className="font-semibold text-zinc-200">${stats.budgetUSD} / tháng</span>
              </div>
            </div>

            {/* Box 2: Mức độ sử dụng Token */}
            <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Dung lượng Token
                </span>
                <span className="text-xs font-mono font-bold text-lime-brand">
                  Còn {stats.remainingPercent}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-lime-brand transition-all duration-300 rounded-full"
                  style={{ width: `${Math.max(4, stats.usedPercent)}%` }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] font-mono text-zinc-400">
                <div>
                  <span className="text-zinc-500">Đã dùng: </span>
                  <span className="text-zinc-200 font-semibold">{stats.totalTokens.toLocaleString()}</span>
                </div>
                <div className="text-right">
                  <span className="text-zinc-500">In/Out: </span>
                  <span className="text-zinc-300">
                    {Math.round(stats.tokensIn / 1000)}k / {Math.round(stats.tokensOut / 1000)}k
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Phân luồng công việc của Agent này */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                Phân luồng công việc ({stats.taskCount.total} tác vụ)
              </h3>
              <div className="flex items-center gap-3 text-xs text-zinc-400">
                <span>Đang làm: <strong className="text-cyan-400">{stats.taskCount.inProgress}</strong></span>
                <span>•</span>
                <span>Hoàn thành: <strong className="text-emerald-400">{stats.taskCount.done}</strong></span>
              </div>
            </div>

            {/* Task đang làm */}
            {stats.activeTask && (
              <div className="p-3.5 rounded-xl border border-cyan-800/80 bg-cyan-950/20 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                    Đang thực hiện ngay bây giờ
                  </span>
                  <span className="text-[10px] text-cyan-300 font-mono">Thời gian thực</span>
                </div>
                <p className="text-sm font-semibold text-white">
                  {humanizeTaskTitle(
                    stats.activeTask.assigneeCode,
                    stats.activeTask.title,
                    contentItems.find((i) => i.id === stats.activeTask?.linkedContentItemId)
                  )}
                </p>
              </div>
            )}

            {/* Danh sách các task gần đây */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {stats.completedTasks.length === 0 && !stats.activeTask && (
                <div className="p-4 rounded-xl border border-dashed border-zinc-800 text-center text-xs text-zinc-500">
                  Chưa có tác vụ nào được thực hiện trong tuần này.
                </div>
              )}

              {stats.completedTasks.map((t) => {
                const item = contentItems.find((i) => i.id === t.linkedContentItemId);
                return (
                  <div
                    key={t.id}
                    className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-800 flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5 pr-2">
                      <p className="font-medium text-zinc-200">
                        {humanizeTaskTitle(t.assigneeCode, t.title, item)}
                      </p>
                      <p className="text-[11px] text-zinc-500">
                        {t.completedAt ? new Date(t.completedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Hoàn thành'}
                      </p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 shrink-0 font-medium">
                      Đã xong
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/30 flex items-center justify-between">
          {onSelectAgentFilter && (
            <button
              onClick={() => {
                onSelectAgentFilter(isFiltered ? null : agentCode);
                onClose();
              }}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                isFiltered
                  ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  : 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700 border border-zinc-700'
              }`}
            >
              {isFiltered ? 'Bỏ lọc bảng công việc' : `Chỉ xem việc của ${agent.name}`}
            </button>
          )}

          <button
            onClick={onClose}
            className="ml-auto px-5 py-2 rounded-lg bg-lime-brand text-black font-bold text-xs hover:opacity-90 transition-opacity"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
