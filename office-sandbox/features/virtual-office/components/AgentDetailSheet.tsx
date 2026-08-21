'use client';

import React, { useState } from 'react';
import { useOfficeStore } from '../state/office-store';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Play,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  Cpu,
  Coins,
  ListTodo,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  BookUser,
} from 'lucide-react';

import { AGENT_PERSONA_CATALOG } from '../config/agent-personas';
import { AgentAvatarIllustration } from './AgentAvatarIllustration';

export const AgentDetailSheet: React.FC = () => {
  const [showTechDetails, setShowTechDetails] = useState(false);
  const isDetailOpen = useOfficeStore((s) => s.isDetailOpen);
  const selectedAgentCode = useOfficeStore((s) => s.selectedAgentCode);
  const closeDetail = useOfficeStore((s) => s.closeDetail);
  const agents = useOfficeStore((s) => s.agents);

  if (!isDetailOpen || !selectedAgentCode) return null;

  const agent = agents[selectedAgentCode];
  if (!agent) return null;

  const persona = AGENT_PERSONA_CATALOG[selectedAgentCode];
  const { tokenStats, currentTask, recentTasks } = agent;


  const getStatusBadge = () => {
    if (agent.requiresHumanAction || agent.visualState === 'waiting_human') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse">
          <AlertTriangle className="w-3.5 h-3.5" />
          Cần CEO can thiệp
        </span>
      );
    }
    switch (agent.visualState) {
      case 'working':
      case 'reworking':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <Play className="w-3.5 h-3.5 fill-current" />
            Đang xử lý
          </span>
        );
      case 'reviewing':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            Đang thẩm định
          </span>
        );
      case 'success':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#D4FF00]/10 text-[#D4FF00] border border-[#D4FF00]/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Hoàn tất nhiệm vụ
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/30">
            <AlertTriangle className="w-3.5 h-3.5" />
            Gặp sự cố
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700">
            <UserCheck className="w-3.5 h-3.5" />
            Sẵn sàng nhận lệnh
          </span>
        );
    }
  };

  const completedCount = recentTasks.filter((t) => t.status === 'done').length;
  const totalTasks = recentTasks.length + (currentTask ? 1 : 0);

  return (
    <div
      className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-[#111114]/98 backdrop-blur-2xl border-l border-zinc-800 p-6 shadow-2xl flex flex-col justify-between overflow-hidden font-sans text-zinc-100 transition-all duration-300 animate-in slide-in-from-right"
      style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
    >
      {/* Scrollable Container */}
      <div className="overflow-y-auto pr-1 space-y-6">
        {/* 1. HEADER */}
        <div className="pb-4 border-b border-zinc-800/80">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3.5">
              {/* Illustrated Avatar */}
              <AgentAvatarIllustration code={agent.code} size="lg" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#D4FF00]">
                    {agent.zoneName}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {persona?.badge || agent.code}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  {persona?.realName || agent.displayName}
                </h2>
                <div className="text-xs font-semibold text-[#D4FF00]">
                  {persona?.nickname || agent.role}
                </div>
              </div>
            </div>

            <button
              onClick={closeDetail}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>


          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-zinc-300 font-medium">{agent.role}</span>
            {getStatusBadge()}
          </div>

          <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
            {agent.fullDesc}
          </p>

          {/* Special Stand-up briefing action for A01 */}
          {agent.code === 'A01' && (
            <div className="mt-3 p-3 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <BookUser className="w-4 h-4 text-purple-300" />
                <div>
                  <div className="text-xs font-bold text-white">Báo Cáo Họp Đầu Ngày</div>
                  <div className="text-[10px] text-purple-200/70">Tổng hợp tiến độ & phân công nhiệm vụ hôm nay</div>
                </div>
              </div>
              <button
                onClick={() => {
                  closeDetail();
                  useOfficeStore.getState().setStandUpModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs shadow-md shadow-purple-500/20 transition-transform active:scale-95 cursor-pointer"
              >
                Mở cuộc họp
              </button>
            </div>
          )}
        </div>

        {/* 2. COLLAPSIBLE TECHNICAL DETAILS (P0.5: not primary client concern) */}
        <div className="rounded-xl border border-zinc-800/60 overflow-hidden">
          <button
            onClick={() => setShowTechDetails(!showTechDetails)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-[11px] font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5" />
              Chi tiết kỹ thuật
            </span>
            {showTechDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showTechDetails && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-4 pb-4">
              {/* Box 1: Cấu hình Model */}
              <div className="p-4 rounded-xl bg-[#18181b]/80 border border-zinc-800 space-y-2.5">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  <Cpu className="w-3.5 h-3.5 text-[#38bdf8]" />
                  <span>Mô hình AI vận hành</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white font-mono">{tokenStats.model}</span>
                  <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 font-bold">
                    {tokenStats.tier}
                  </span>
                </div>
                <div className="text-xs text-zinc-400 flex items-center justify-between pt-2 border-t border-zinc-800/60">
                  <span>Ngân sách:</span>
                  <span className="font-semibold text-zinc-200">${tokenStats.budgetUSD} / tháng</span>
                </div>
              </div>

              {/* Box 2: Mức độ sử dụng Token */}
              <div className="p-4 rounded-xl bg-[#18181b]/80 border border-zinc-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    <Coins className="w-3.5 h-3.5 text-[#D4FF00]" />
                    <span>Dung lượng Token</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-[#D4FF00]">
                    Còn {tokenStats.remainingPercent}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-[#D4FF00] transition-all duration-300 rounded-full shadow-sm shadow-[#D4FF00]"
                    style={{ width: `${Math.max(6, tokenStats.usedPercent)}%` }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-1 pt-1 text-[10px] font-mono text-zinc-400">
                  <div>
                    <span className="text-zinc-500">Đã dùng: </span>
                    <span className="text-zinc-200 font-semibold">{tokenStats.totalTokensUsed.toLocaleString()}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-zinc-500">In/Out: </span>
                    <span className="text-zinc-300">
                      {Math.round(tokenStats.tokensIn / 1000)}k / {Math.round(tokenStats.tokensOut / 1000)}k
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3. CẢNH BÁO CẦN CEO CAN THIỆP (Nếu có) */}
        {agent.requiresHumanAction && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm space-y-1.5">
            <div className="font-semibold text-amber-400 flex items-center gap-1.5 text-xs">
              <AlertTriangle className="w-4 h-4" />
              Yêu cầu can thiệp từ CEO:
            </div>
            <p className="text-xs text-amber-200/90 leading-relaxed">
              {agent.actionPrompt || 'Vui lòng kiểm tra và xử lý tác vụ đang chờ.'}
            </p>
          </div>
        )}

        {/* 4. PHÂN LUỒNG CÔNG VIỆC CỦA AGENT */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-300">
              <ListTodo className="w-3.5 h-3.5 text-[#D4FF00]" />
              <span>Phân luồng công việc ({totalTasks} tác vụ)</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-zinc-400">
              <span>Đang làm: <strong className="text-[#38bdf8]">{currentTask ? 1 : 0}</strong></span>
              <span>•</span>
              <span>Hoàn thành: <strong className="text-emerald-400">{completedCount}</strong></span>
            </div>
          </div>

          {/* Tác vụ đang thực hiện ngay bây giờ */}
          {currentTask && (
            <div className="p-4 rounded-xl border border-cyan-800/70 bg-cyan-950/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1">
                  <Play className="w-2.5 h-2.5 fill-current" />
                  Đang thực hiện ngay bây giờ
                </span>
                <span className="text-[10px] text-cyan-300 font-mono flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {currentTask.time || 'Thời gian thực'}
                </span>
              </div>
              <h4 className="text-sm font-semibold text-white leading-snug">
                {currentTask.title}
              </h4>
              {currentTask.summary && (
                <p className="text-xs text-zinc-300/90 leading-relaxed">
                  {currentTask.summary}
                </p>
              )}
            </div>
          )}

          {/* Danh sách các tác vụ gần đây */}
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider pt-1">
              Tác vụ đã hoàn thành gần đây
            </div>

            {recentTasks.length === 0 ? (
              <div className="p-3 rounded-lg border border-dashed border-zinc-800 text-center text-xs text-zinc-500">
                Chưa có tác vụ nào hoàn thành trong tuần này.
              </div>
            ) : (
              recentTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-3 rounded-xl bg-[#18181b]/60 border border-zinc-800/80 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5 pr-2">
                    <p className="font-medium text-zinc-200">{task.title}</p>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                      {task.category && <span className="text-zinc-400">#{task.category}</span>}
                      <span>•</span>
                      <span>{task.completedAt || 'Hôm nay'}</span>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 shrink-0 font-medium flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Đã xong
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 5. FOOTER ACTION */}
      <div className="pt-4 mt-4 border-t border-zinc-800/80 space-y-2">
        <button
          onClick={() => {
            alert(`[Chuyển hướng màn hình Portal]: Điều hướng tới ${agent.ctaHref || '/content-hub'}`);
          }}
          className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-[#D4FF00] hover:bg-[#E5FF55] text-[#09090B] flex items-center justify-center gap-2 transition-transform active:scale-[0.98] shadow-lg shadow-[#D4FF00]/10"
        >
          <span>{agent.ctaText || 'Xem Bảng Công Việc Trong Portal'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
        <p className="text-[10px] text-center text-zinc-500">
          Chữ và giao diện đồng nhất chuẩn Font Inter của CrewLab Client Portal.
        </p>
      </div>
    </div>
  );
};
