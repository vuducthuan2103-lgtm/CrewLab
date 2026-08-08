'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePortal } from '@/lib/store';
import { TaskCard as TaskCardType, TeamDesk, KanbanColumn } from '@/lib/types';
import Swimlane from './Swimlane';
import { ChevronLeft, ChevronRight, LayoutDashboard, MessageSquareText } from 'lucide-react';

const DESKS: { desk: TeamDesk; label: string; emoji: string }[] = [
  { desk: 'strategy', label: 'STRATEGY DESK', emoji: '🧭' },
  { desk: 'creative', label: 'CREATIVE DESK', emoji: '✍️' },
  { desk: 'qa', label: 'QA DESK', emoji: '✅' },
];

const COLUMNS: KanbanColumn[] = ['todo', 'in_progress', 'review', 'done'];

type FilterType = 'all' | 'pending_approval' | 'human_only' | 'has_error';

export default function KanbanBoard() {
  const { tasks } = usePortal();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const totalReview = tasks.filter((t) => t.column === 'review').length;

  const filteredTasks = tasks.filter((t) => {
    if (activeFilter === 'pending_approval') return t.column === 'review';
    if (activeFilter === 'human_only') return t.assigneeType === 'human';
    if (activeFilter === 'has_error') return t.hasError;
    return true;
  });

  function getStats(desk: TeamDesk, allTasks: TaskCardType[]) {
    const deskTasks = allTasks.filter((t) => t.desk === desk);
    return COLUMNS.reduce(
      (acc, col) => {
        acc[col] = deskTasks.filter((t) => t.column === col).length;
        return acc;
      },
      { todo: 0, in_progress: 0, review: 0, done: 0 } as Record<KanbanColumn, number>
    );
  }

  return (
    <div>
      {/* Page Title + Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
            <LayoutDashboard size={15} className="text-lime-brand" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Bảng công việc</h1>
            <p className="text-xs text-muted-foreground">Văn phòng AI 6 agents — Tuần 25 (16–22/06)</p>
          </div>
          {totalReview > 0 && (
            <span
              onClick={() => setActiveFilter('pending_approval')}
              className="ml-2 text-xs bg-primary/15 text-lime-brand border border-primary/30 rounded-full px-3 py-1 font-bold shadow-sm cursor-pointer hover:scale-105 transition-transform animate-pulse"
            >
              ⚡ {totalReview} task chờ bạn xử lý
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <Link
            href="/a01-chat"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-lime-brand px-4 text-xs font-bold text-white shadow-accent-glow transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-black"
          >
            <MessageSquareText size={15} />
            Trò chuyện với A01
          </Link>
          {/* Filter toggle */}
          <div className="flex items-center gap-1 border border-border rounded-lg p-1 bg-muted/30">
            {[
              { key: 'all', label: 'Tất cả' },
              { key: 'pending_approval', label: `⚡ Cần duyệt (${totalReview})` },
              { key: 'human_only', label: '👤 Cần tôi' },
              { key: 'has_error', label: '🔴 Có lỗi' },
            ].map(({ key, label }) => (
              <button
                key={key}
                id={`kanban-filter-${key}`}
                onClick={() => setActiveFilter(key as FilterType)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  activeFilter === key
                    ? 'bg-lime-brand text-black font-bold shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Week nav */}
          <div className="flex items-center gap-1 border border-border rounded-lg px-2 py-1.5 bg-background">
            <button className="text-muted-foreground hover:text-foreground p-0.5 transition-colors">
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs font-semibold text-foreground px-1">Tuần 25</span>
            <button className="text-muted-foreground hover:text-foreground p-0.5 transition-colors">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Column Headers (global, above swimlanes) */}
      <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr] mb-2 px-0">
        <div className="w-0" /> {/* placeholder for swimlane label width */}
        <div className="pl-3 pr-2 py-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <span>📋 CHỜ LÀM (TODO)</span>
        </div>
        <div className="px-2 py-1.5 text-xs font-bold text-cyan-500 dark:text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
          <span>⚙️ ĐANG CHẠY (IN PROGRESS)</span>
        </div>
        <div className="px-2 py-1.5 text-xs font-bold text-lime-brand uppercase tracking-wider flex items-center gap-1.5">
          <span>⚡ CHỜ DUYỆT (REVIEW)</span>
        </div>
        <div className="pl-2 pr-3 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
          <span>✅ HOÀN THÀNH (DONE)</span>
        </div>
      </div>

      {/* Swimlanes */}
      <div className="space-y-4">
        {DESKS.map(({ desk, label, emoji }) => (
          <Swimlane
            key={desk}
            desk={desk}
            deskLabel={label}
            deskEmoji={emoji}
            tasks={filteredTasks.filter((t) => t.desk === desk)}
            stats={getStats(desk, tasks)}
          />
        ))}
      </div>
    </div>
  );
}
