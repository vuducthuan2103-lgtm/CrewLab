'use client';

import React, { useState } from 'react';
import { TaskCard as TaskCardType } from '@/lib/types';
import { usePortal } from '@/lib/store';
import { AGENT_REGISTRY } from '@/lib/taskHumanizer';
import TaskDetailModal from './TaskDetailModal';

interface TaskCardProps {
  task: TaskCardType;
}

export default function TaskCardComponent({ task }: TaskCardProps) {
  const { contentItems } = usePortal();
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const linkedItem = task.linkedContentItemId
    ? contentItems.find((ci) => ci.id === task.linkedContentItemId) || null
    : null;

  const agent = AGENT_REGISTRY[task.assigneeCode] || AGENT_REGISTRY.A01;
  const isReview = task.column === 'review' || linkedItem?.state === 'pending_content_approval';
  const isInProgress = task.column === 'in_progress';
  const isDone = task.column === 'done';

  return (
    <>
      <div
        id={`task-card-${task.id}`}
        onClick={() => setIsDetailOpen(true)}
        className={`
          group relative p-3.5 rounded-xl border bg-zinc-950/90 cursor-pointer transition-all duration-150 text-left
          hover:-translate-y-0.5 hover:shadow-lg
          ${
            isReview
              ? 'border-lime-500/50 bg-lime-950/10 hover:border-lime-400 hover:shadow-lime-950/30'
              : isInProgress
              ? 'border-cyan-800/70 bg-cyan-950/10 hover:border-cyan-700'
              : isDone
              ? 'border-zinc-800/90 hover:border-zinc-700 opacity-95'
              : 'border-zinc-800/80 hover:border-zinc-700'
          }
          ${task.hasError ? 'border-red-500/40 bg-red-950/10' : ''}
        `}
      >
        {/* Top row: Assignee Tag + Status Pill */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-200">
              {agent.code}
            </span>
            <span className="text-[11px] font-medium text-zinc-400 truncate max-w-[110px]">
              {agent.name}
            </span>
            {task.pillarLabel && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-500">
                {task.pillarLabel}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {isInProgress && (
              <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/80 font-medium font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                {task.durationLabel || 'Đang xử lý'}
              </span>
            )}
            {isReview && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-lime-500/20 text-lime-brand border border-lime-500/40 font-black">
                Chờ bạn duyệt
              </span>
            )}
            {isDone && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 font-medium">
                Đã xong
              </span>
            )}
          </div>
        </div>

        {/* Task Title */}
        <p className="text-xs font-semibold text-zinc-100 leading-snug mb-2 line-clamp-2">
          {task.title}
        </p>

        {/* Linked Content Item Thumbnail & Title */}
        {linkedItem && (
          <div className="flex items-center gap-2 p-1.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80 mb-2">
            {linkedItem.imageUrl ? (
              <img
                src={linkedItem.imageUrl}
                alt=""
                className="w-8 h-8 rounded object-cover shrink-0 border border-zinc-800"
              />
            ) : (
              <div className="w-8 h-8 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 text-[10px] font-mono text-zinc-400">
                F&B
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-zinc-300 truncate">
                {linkedItem.title}
              </p>
              <p className="text-[10px] text-zinc-500 font-mono">
                {linkedItem.platform === 'both' ? 'FB & IG' : linkedItem.platform.toUpperCase()}
              </p>
            </div>
          </div>
        )}

        {/* Time Context & Footer */}
        <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
          <span className="text-zinc-400 truncate max-w-[190px]">
            {task.timeLabel || 'Thời gian thực'}
          </span>
          <span className="text-zinc-400 group-hover:text-white transition-colors shrink-0 ml-1">
            Xem bước &rarr;
          </span>
        </div>
      </div>

      {/* Task Detail Modal */}
      {isDetailOpen && (
        <TaskDetailModal
          task={task}
          onClose={() => setIsDetailOpen(false)}
        />
      )}
    </>
  );
}
