'use client';

import React, { useState } from 'react';
import { TaskCard as TaskCardType, ContentItem, FSM_STATE_LABELS } from '@/lib/types';
import { usePortal } from '@/lib/store';
import ContentApprovalModal from '@/components/approval/ContentApprovalModal';
import {
  Clock,
  RefreshCw,
  AlertCircle,
  BadgeCheck,
  Bot,
  CalendarDays,
  ChevronRight,
  Compass,
  FileText,
  ImageIcon,
  PenLine,
  User,
} from 'lucide-react';

interface TaskCardProps {
  task: TaskCardType;
}

const AGENT_COLORS: Record<string, string> = {
  A01: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  B02: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  B03: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  D01: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  D02: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
  E01: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  HUMAN: 'bg-accent-tint-15 text-lime-brand border-accent-tint',
};

const AGENT_ICONS: Record<string, typeof Bot> = {
  A01: Bot,
  B02: Compass,
  B03: CalendarDays,
  D01: PenLine,
  D02: ImageIcon,
  E01: BadgeCheck,
  HUMAN: User,
};

function getSLALabel(deadline: Date | null): { text: string; urgent: boolean } | null {
  if (!deadline) return null;
  const now = new Date();
  const diff = deadline.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 0) return { text: 'Quá hạn', urgent: true };
  if (hours < 24) return { text: `Còn ${hours}h`, urgent: true };
  const days = Math.floor(hours / 24);
  return { text: `Còn ${days}d`, urgent: false };
}

export default function TaskCardComponent({ task }: TaskCardProps) {
  const { contentItems } = usePortal();
  const [modalOpen, setModalOpen] = useState(false);

  const linkedItem = task.linkedContentItemId
    ? contentItems.find((ci) => ci.id === task.linkedContentItemId) || null
    : null;

  const isHumanTask = task.assigneeType === 'human';
  const isClickable = isHumanTask && task.column === 'review';
  const sla = getSLALabel(task.slaDeadline);
  const agentColor = AGENT_COLORS[task.assigneeCode] || 'bg-zinc-500/20 text-zinc-400';
  const AgentIcon = AGENT_ICONS[task.assigneeCode] || Bot;

  return (
    <>
      <div
        id={`task-card-${task.id}`}
        onClick={() => isClickable && setModalOpen(true)}
        title={!isHumanTask ? 'Task của AI tự động cập nhật, không kéo được' : undefined}
        className={`
          group p-3 rounded-xl border bg-background transition-all duration-150
          ${isClickable
            ? 'border-accent-tint hover:border-lime-brand hover:shadow-accent-glow cursor-pointer hover:-translate-y-0.5'
            : 'border-border hover:border-border/80 cursor-default'
          }
          ${task.hasError ? 'border-red-500/40 bg-red-500/5' : ''}
        `}
      >
        {/* Top row: assignee avatar + badges */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className={`flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border ${agentColor}`}>
            <AgentIcon size={10} aria-hidden="true" />
            <span>{task.assigneeCode}</span>
          </div>
          <div className="flex items-center gap-1 flex-wrap justify-end">
            {task.retryCount > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full px-1.5 py-0.5">
                <RefreshCw size={9} /> Lần {task.retryCount + 1}
              </span>
            )}
            {task.hasError && (
              <span className="flex items-center gap-0.5 text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 rounded-full px-1.5 py-0.5">
                <AlertCircle size={9} /> Lỗi
              </span>
            )}
            {sla && (
              <span className={`text-[10px] rounded-full px-1.5 py-0.5 font-medium border ${
                sla.urgent
                  ? 'bg-red-500/10 text-red-400 border-red-500/20'
                  : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
              }`}>
                <Clock size={9} className="inline mr-0.5" />
                {sla.text}
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <p className={`text-xs font-medium leading-snug mb-2 ${isHumanTask ? 'text-foreground' : 'text-muted-foreground'}`}>
          {task.title}
        </p>

        {/* Linked content item */}
        {linkedItem && (
          <div className="flex items-center gap-1.5 mt-1.5">
            {linkedItem.imageUrl ? (
              <img src={linkedItem.imageUrl} alt="" className="w-7 h-7 rounded-md object-cover flex-shrink-0 border border-border" />
            ) : (
              <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                <FileText size={12} className="text-muted-foreground" aria-hidden="true" />
              </div>
            )}
            <span className="text-[10px] text-muted-foreground truncate">{linkedItem.title}</span>
            {isClickable && <ChevronRight size={10} className="text-lime-brand ml-auto flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />}
          </div>
        )}

        {/* Click CTA for human tasks */}
        {isClickable && (
          <div className="mt-2.5 pt-2 border-t border-accent-tint-20 flex items-center justify-between">
            <div className="flex items-center gap-1 text-[10px] text-lime-brand font-semibold">
              <User size={10} /> Chờ bạn xử lý
            </div>
            <div className="text-[10px] text-lime-brand opacity-70">Bấm để xem &amp; duyệt →</div>
          </div>
        )}

        {task.hasError && (
          <div className="mt-2 space-y-1 rounded-lg border border-red-500/20 bg-red-500/5 px-2 py-1.5 text-[10px] text-red-300">
            <p>{task.errorMessage}</p>
            <div className="flex flex-wrap gap-x-2 gap-y-0.5 opacity-80">
              {task.errorCode && <span>Mã: {task.errorCode}</span>}
              {task.errorProvider && <span>Provider: {task.errorProvider}</span>}
              {task.providerRequestId && <span>Request: {task.providerRequestId}</span>}
              {task.errorRetryable !== undefined && <span>{task.errorRetryable ? 'Có thể thử lại tự động' : 'Cần kiểm tra'}</span>}
            </div>
          </div>
        )}

        {/* Bot indicator for AI tasks */}
        {!isHumanTask && task.column === 'in_progress' && (
          <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
            <Bot size={10} className="animate-pulse" />
            <span>AI đang xử lý…</span>
          </div>
        )}
      </div>

      {/* Content Approval Modal */}
      {modalOpen && linkedItem && (
        <ContentApprovalModal contentItem={linkedItem} onClose={() => setModalOpen(false)} />
      )}
    </>
  );
}
