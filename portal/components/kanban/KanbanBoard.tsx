'use client';

import React, { useState } from 'react';
import { usePortal } from '@/lib/store';
import { TaskCard as TaskCardType, TeamDesk, KanbanColumn } from '@/lib/types';
import Swimlane from './Swimlane';
import { Filter, ChevronLeft, ChevronRight, LayoutDashboard } from 'lucide-react';

const DESKS: { desk: TeamDesk; label: string; emoji: string }[] = [
  { desk: 'strategy', label: 'STRATEGY DESK', emoji: '🧭' },
  { desk: 'creative', label: 'CREATIVE DESK', emoji: '✍️' },
  { desk: 'qa', label: 'QA DESK', emoji: '✅' },
];

const COLUMNS: KanbanColumn[] = ['todo', 'in_progress', 'review', 'done'];

type FilterType = 'all' | 'human_only' | 'has_error';

export default function KanbanBoard() {
  const { tasks } = usePortal();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const filteredTasks = tasks.filter((t) => {
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

  const totalReview = tasks.filter((t) => t.column === 'review').length;

  return (
    <div>
      {/* Page Title + Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#D4FF00]/10 border border-[#D4FF00]/30 flex items-center justify-center">
            <LayoutDashboard size={15} className="text-[#D4FF00]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Bảng công việc</h1>
            <p className="text-xs text-muted-foreground">Văn phòng AI 6 agents — Tuần 25 (16–22/06)</p>
          </div>
          {totalReview > 0 && (
            <span className="ml-2 text-xs bg-[#D4FF00]/15 text-[#D4FF00] border border-[#D4FF00]/30 rounded-full px-3 py-1 font-bold shadow-[0_0_10px_rgba(212,255,0,0.1)] animate-pulse">
              {totalReview} task chờ bạn xử lý
            </span>
          )}
        </div>

        {/* Filters + Week nav */}
        <div className="flex items-center gap-2">
          {/* Filter toggle */}
          <div className="flex items-center gap-1 border border-border rounded-lg p-1">
            {[
              { key: 'all', label: 'Tất cả' },
              { key: 'human_only', label: '👤 Cần tôi' },
              { key: 'has_error', label: '🔴 Có lỗi' },
            ].map(({ key, label }) => (
              <button
                key={key}
                id={`kanban-filter-${key}`}
                onClick={() => setActiveFilter(key as FilterType)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  activeFilter === key
                    ? 'bg-[#D4FF00] text-black font-bold shadow-[0_0_8px_rgba(212,255,0,0.3)]'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Week nav */}
          <div className="flex items-center gap-1 border border-border rounded-lg px-2 py-1.5">
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
      </div>

      {/* 4-column header row */}
      <div className="grid grid-cols-4 gap-0 mb-3 pl-0 border border-border rounded-lg overflow-hidden">
        {['To Do', 'Đang làm', 'Cần xem xét', 'Hoàn thành'].map((col, idx) => (
          <div key={idx} className={`text-center py-1.5 text-[10px] font-bold uppercase tracking-widest ${
            idx === 2 ? 'text-[#D4FF00] bg-[#D4FF00]/5' : idx === 1 ? 'text-blue-400 bg-blue-500/5' : idx === 3 ? 'text-emerald-400 bg-emerald-500/5' : 'text-zinc-400 bg-muted/30'
          } ${idx < 3 ? 'border-r border-border' : ''}`}>
            {col}
          </div>
        ))}
      </div>

      {/* Swimlanes */}
      <div className="space-y-4">
        {DESKS.map(({ desk, label, emoji }) => {
          const deskTasks = filteredTasks.filter((t) => t.desk === desk);
          const stats = getStats(desk, filteredTasks);
          return (
            <Swimlane
              key={desk}
              desk={desk}
              label={label}
              emoji={emoji}
              tasks={deskTasks}
              stats={stats}
            />
          );
        })}
      </div>
    </div>
  );
}
