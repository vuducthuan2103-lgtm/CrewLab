'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { RotateCw } from 'lucide-react';
import { usePortal } from '@/lib/store';
import { toast } from '@/components/ui/Toast';
import { AgentCode, KanbanColumn, TaskCard as TaskCardType } from '@/lib/types';
import { generateUnifiedWorkBoardTasks } from '@/lib/taskHumanizer';
import { getISOWeekNumber, getWeekDateRange } from '@/lib/dateUtils';
import AgentOverviewBar from './AgentOverviewBar';
import TaskCardComponent from './TaskCard';

const COLUMNS: { key: KanbanColumn; label: string; subLabel: string; colorClass: string; badgeClass: string }[] = [
  {
    key: 'todo',
    label: 'Chờ thực hiện',
    subLabel: 'To Do & Lên lịch',
    colorClass: 'text-zinc-200',
    badgeClass: 'bg-zinc-800 text-zinc-300 border-zinc-700',
  },
  {
    key: 'in_progress',
    label: 'Đang xử lý',
    subLabel: 'AI đang chạy',
    colorClass: 'text-cyan-400',
    badgeClass: 'bg-cyan-950/80 text-cyan-300 border-cyan-800',
  },
  {
    key: 'review',
    label: 'Chờ bạn duyệt',
    subLabel: 'Cần khách hàng xác nhận',
    colorClass: 'text-lime-brand',
    badgeClass: 'bg-lime-500/15 text-lime-brand border-lime-500/30',
  },
  {
    key: 'done',
    label: 'Hoàn thành',
    subLabel: 'Đã hoàn tất',
    colorClass: 'text-emerald-400',
    badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-800',
  },
];

export default function KanbanBoard() {
  const { tasks, contentItems, pillars, weekApproved, refreshData, isLoading } = usePortal();
  const currentWeek = useMemo(() => getISOWeekNumber(), []);
  const [selectedWeek, setSelectedWeek] = useState<number>(currentWeek);
  const [selectedAgent, setSelectedAgent] = useState<AgentCode | null>(null);
  const [onlyReview, setOnlyReview] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshSuccess, setRefreshSuccess] = useState(false);

  const dateRangeStr = useMemo(() => getWeekDateRange(selectedWeek), [selectedWeek]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setRefreshSuccess(false);
    try {
      await refreshData(true);
      setRefreshSuccess(true);
      toast.success('Đã làm mới dữ liệu!', 'Bảng công việc đã đồng bộ với máy chủ.');
      setTimeout(() => setRefreshSuccess(false), 2000);
    } catch {
      toast.error('Không thể làm mới dữ liệu. Vui lòng thử lại.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Tạo danh sách công việc marketing hợp nhất, lọc sạch log thừa
  const unifiedTasks = useMemo(() => {
    return generateUnifiedWorkBoardTasks(tasks, contentItems, pillars, weekApproved);
  }, [tasks, contentItems, pillars, weekApproved]);

  // Lọc theo Tuần (selectedWeek), Agent hoặc chỉ bài Review
  const filteredTasks = useMemo(() => {
    return unifiedTasks.filter((t) => {
      // Lọc chính xác theo tuần được chọn
      if (t.weekNumber !== undefined && t.weekNumber !== selectedWeek) return false;
      if (t.weekNumber === undefined && selectedWeek !== currentWeek) return false;
      if (selectedAgent && t.assigneeCode !== selectedAgent) return false;
      if (onlyReview && t.column !== 'review') return false;
      return true;
    });
  }, [unifiedTasks, selectedWeek, currentWeek, selectedAgent, onlyReview]);

  const tasksByColumn = useMemo(() => {
    return COLUMNS.reduce((acc, col) => {
      acc[col.key] = filteredTasks.filter((t) => t.column === col.key);
      return acc;
    }, {} as Record<KanbanColumn, TaskCardType[]>);
  }, [filteredTasks]);

  const totalReview = useMemo(() => {
    return unifiedTasks.filter(
      (t) => (t.weekNumber === undefined || t.weekNumber === selectedWeek) && t.column === 'review'
    ).length;
  }, [unifiedTasks, selectedWeek]);

  return (
    <div className="space-y-6">
      {/* Top Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-white tracking-tight">Bảng công việc</h1>
            {totalReview > 0 && (
              <button
                onClick={() => setOnlyReview(!onlyReview)}
                className={`text-xs px-3 py-1 rounded-full font-semibold border transition-all ${
                  onlyReview
                    ? 'bg-lime-brand text-black border-lime-brand font-bold'
                    : 'bg-lime-500/10 text-lime-brand border-lime-500/30 hover:bg-lime-500/20'
                }`}
              >
                {totalReview} bài chờ bạn duyệt {onlyReview ? '(Đang lọc)' : ''}
              </button>
            )}
          </div>
          <p className="text-xs text-zinc-400">
            Văn phòng AI 6 agents — Quản lý tiến độ sản xuất và lịch phát hành nội dung
          </p>
        </div>

        {/* Action Controls: Refresh + Chat A01 + Week Navigator */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-all ${
              refreshSuccess
                ? 'bg-lime-950/60 border-lime-500/50 text-lime-brand'
                : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800'
            }`}
            title="Làm mới dữ liệu từ máy chủ"
          >
            <RotateCw
              size={13}
              className={
                isRefreshing ? 'animate-spin text-lime-brand' : refreshSuccess ? 'text-lime-brand' : ''
              }
            />
            <span>{isRefreshing ? 'Đang tải...' : refreshSuccess ? 'Đã làm mới!' : 'Làm mới'}</span>
          </button>

          <Link
            href="/a01-chat"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-lime-brand px-4 text-xs font-bold text-black shadow hover:opacity-90 transition-opacity"
          >
            Trò chuyện với A01
          </Link>

          {/* Week Navigator */}
          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-zinc-900 border border-zinc-800">
            <button
              onClick={() => setSelectedWeek((prev) => Math.max(1, prev - 1))}
              className="w-7 h-7 rounded flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors text-xs font-mono font-bold"
              title="Tuần trước"
            >
              &larr;
            </button>

            <div className="px-2 text-center min-w-[120px]">
              <span className="text-xs font-bold text-white font-mono">Tuần {selectedWeek}</span>
              <span className="text-[10px] text-zinc-400 block font-mono">({dateRangeStr})</span>
            </div>

            <button
              onClick={() => setSelectedWeek((prev) => Math.min(52, prev + 1))}
              className="w-7 h-7 rounded flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors text-xs font-mono font-bold"
              title="Tuần sau"
            >
              &rarr;
            </button>

            {selectedWeek !== currentWeek && (
              <button
                onClick={() => setSelectedWeek(currentWeek)}
                className="ml-1 px-2 py-1 text-[10px] rounded bg-zinc-800 text-zinc-300 hover:text-white font-semibold transition-colors"
                title={`Quay về tuần hiện tại (Tuần ${currentWeek})`}
              >
                Tuần này
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 6 AI Agents Overview Bar */}
      <AgentOverviewBar
        selectedAgent={selectedAgent}
        onSelectAgent={setSelectedAgent}
      />

      {/* Filter Status Note if Active */}
      {(selectedAgent || onlyReview) && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-zinc-400">Đang lọc theo:</span>
            {selectedAgent && (
              <span className="font-bold text-white font-mono bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                Agent: {selectedAgent}
              </span>
            )}
            {onlyReview && (
              <span className="font-bold text-lime-brand bg-lime-950/60 px-2 py-0.5 rounded border border-lime-800/60">
                Chỉ bài cần duyệt
              </span>
            )}
          </div>
          <button
            onClick={() => {
              setSelectedAgent(null);
              setOnlyReview(false);
            }}
            className="text-zinc-400 hover:text-white underline font-medium"
          >
            Xóa bộ lọc
          </button>
        </div>
      )}

      {/* Empty Week Helper Banner */}
      {filteredTasks.length === 0 && (
        <div className="p-6 text-center rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-2 animate-in fade-in duration-200">
          <p className="text-sm font-semibold text-zinc-300">
            Chưa có bài viết hay công việc nào trong <span className="text-lime-brand font-bold">Tuần {selectedWeek}</span> ({dateRangeStr})
          </p>
          <p className="text-xs text-zinc-500 max-w-md mx-auto">
            Bạn có thể chuyển về Tuần hiện tại để xem các công việc đang chạy, hoặc trò chuyện cùng A01 để lập kế hoạch phát hành cho tuần này.
          </p>
          <div className="flex items-center justify-center gap-2.5 pt-2">
            {selectedWeek !== currentWeek && (
              <button
                onClick={() => setSelectedWeek(currentWeek)}
                className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white transition-colors"
              >
                ← Quay lại Tuần {currentWeek} (Tuần này)
              </button>
            )}
            <Link
              href="/a01-chat"
              className="px-3.5 py-1.5 rounded-lg bg-lime-brand text-black text-xs font-bold hover:opacity-90 transition-opacity"
            >
              Lên kế hoạch với A01
            </Link>
          </div>
        </div>
      )}

      {/* Unified 4-Column Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {COLUMNS.map((col) => {
          const colTasks = tasksByColumn[col.key] || [];

          return (
            <div
              key={col.key}
              className="flex flex-col rounded-2xl bg-zinc-950/60 border border-zinc-800/90 overflow-hidden"
            >
              {/* Column Header */}
              <div className="p-3.5 border-b border-zinc-800/80 bg-zinc-900/40 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold uppercase tracking-wider ${col.colorClass}`}
                      style={{ fontWeight: 700 }}
                    >
                      {col.label}
                    </span>
                    <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border ${col.badgeClass}`}>
                      {colTasks.length}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-medium">{col.subLabel}</span>
                </div>
              </div>

              {/* Task Cards Column Body */}
              <div className="p-3 space-y-3 flex-1 min-h-[360px] overflow-y-auto">
                {colTasks.map((task) => (
                  <TaskCardComponent key={task.id} task={task} />
                ))}

                {colTasks.length === 0 && (
                  <div className="h-40 rounded-xl border border-dashed border-zinc-800/80 flex flex-col items-center justify-center p-4 text-center">
                    <p className="text-xs font-medium text-zinc-500">Chưa có công việc</p>
                    <p className="text-[10px] text-zinc-600 mt-1">
                      {col.key === 'todo'
                        ? 'Các bài lên lịch sẽ xuất hiện ở đây'
                        : col.key === 'in_progress'
                        ? 'Không có tác vụ nào đang chạy'
                        : col.key === 'review'
                        ? 'Tất cả bài viết đã được duyệt xong'
                        : 'Các tác vụ hoàn thành sẽ hiển thị ở đây'}
                    </p>
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
