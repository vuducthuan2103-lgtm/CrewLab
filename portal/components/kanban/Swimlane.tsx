'use client';

import React from 'react';
import { TaskCard as TaskCardType, TeamDesk, KanbanColumn } from '@/lib/types';
import TaskCardComponent from './TaskCard';
import { Circle, Loader2, Eye, CheckCircle2 } from 'lucide-react';

interface SwimlaneProps {
  desk: TeamDesk;
  deskLabel: string;
  deskEmoji: string;
  tasks: TaskCardType[];
  stats: { todo: number; in_progress: number; review: number; done: number };
}

const COLUMN_META: Record<KanbanColumn, { label: string; icon: React.ReactNode; headerClass: string }> = {
  todo: {
    label: 'To Do',
    icon: <Circle size={12} className="text-zinc-400" />,
    headerClass: 'text-zinc-400',
  },
  in_progress: {
    label: 'Đang làm',
    icon: <Loader2 size={12} className="text-blue-400 animate-spin" />,
    headerClass: 'text-blue-400',
  },
  review: {
    label: 'Cần xem xét',
    icon: <Eye size={12} className="text-lime-brand" />,
    headerClass: 'text-lime-brand',
  },
  done: {
    label: 'Hoàn thành',
    icon: <CheckCircle2 size={12} className="text-emerald-400" />,
    headerClass: 'text-emerald-400',
  },
};

const COLUMNS: KanbanColumn[] = ['todo', 'in_progress', 'review', 'done'];

export default function Swimlane({ desk, deskLabel, deskEmoji, tasks, stats }: SwimlaneProps) {
  const tasksByColumn = COLUMNS.reduce(
    (acc, col) => {
      acc[col] = tasks.filter((t) => t.column === col);
      return acc;
    },
    {} as Record<KanbanColumn, TaskCardType[]>
  );

  const totalCount = Object.values(stats).reduce((a, b) => a + b, 0);

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-muted/10">
      {/* Swimlane Header */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-muted/30 border-b border-border">
        <span className="text-base">{deskEmoji}</span>
        <span className="text-sm font-bold text-foreground tracking-wide uppercase">{deskLabel}</span>
        <div className="ml-auto flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
          <span title="To Do">{stats.todo}</span>
          <span className="text-muted-foreground/30">·</span>
          <span title="In Progress" className="text-blue-400">{stats.in_progress}</span>
          <span className="text-muted-foreground/30">·</span>
          <span title="Review" className="text-lime-brand">{stats.review}</span>
          <span className="text-muted-foreground/30">·</span>
          <span title="Done" className="text-emerald-400">{stats.done}</span>
          <span className="text-muted-foreground/30 ml-1">= {totalCount} tasks</span>
        </div>
      </div>

      {/* Columns grid */}
      <div className="grid grid-cols-4">
        {COLUMNS.map((col, idx) => {
          const meta = COLUMN_META[col];
          const colTasks = tasksByColumn[col];
          return (
            <div
              key={col}
              className={`p-3 min-h-[120px] ${idx < 3 ? 'border-r border-border' : ''}`}
            >
              {/* Column sub-header */}
              <div className={`flex items-center gap-1.5 mb-3 ${meta.headerClass}`}>
                {meta.icon}
                <span className="text-[10px] font-semibold uppercase tracking-wider">{meta.label}</span>
                {colTasks.length > 0 && (
                  <span className="ml-auto text-[10px] bg-muted rounded-full px-1.5 py-0.5 text-muted-foreground font-medium">
                    {colTasks.length}
                  </span>
                )}
              </div>

              {/* Task cards */}
              <div className="space-y-2">
                {colTasks.map((task) => (
                  <TaskCardComponent key={task.id} task={task} />
                ))}
                {colTasks.length === 0 && (
                  <div className="h-10 border border-dashed border-border/50 rounded-lg flex items-center justify-center">
                    <span className="text-[10px] text-muted-foreground/40">Không có task</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
