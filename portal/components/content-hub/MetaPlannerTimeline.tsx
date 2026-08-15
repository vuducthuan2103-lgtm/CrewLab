'use client';

import React, { useMemo, useState } from 'react';
import { usePortal } from '@/lib/store';
import { ContentItem, ContentPillar, FSM_STATE_LABELS } from '@/lib/types';
import ContentApprovalModal from '@/components/approval/ContentApprovalModal';
import {
  AlertTriangle,
  Calendar,
  Check,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Filter,
  ImageIcon,
  Layers,
  Sparkles,
} from 'lucide-react';

type PillarStyle = { bg: string; text: string; border: string; bar: string };

const PILLAR_STYLES: PillarStyle[] = [
  { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', bar: 'bg-blue-500' },
  { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20', bar: 'bg-purple-500' },
  { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', bar: 'bg-amber-500' },
  { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20', bar: 'bg-rose-500' },
  { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', bar: 'bg-emerald-500' },
];
const UNKNOWN_PILLAR_STYLE: PillarStyle = {
  bg: 'bg-zinc-500/10',
  text: 'text-zinc-400',
  border: 'border-zinc-500/20',
  bar: 'bg-zinc-500',
};

function getPillarMeta(item: ContentItem, pillars: ContentPillar[]) {
  const pillarIndex = pillars.findIndex((pillar) => pillar.id === item.pillarId);
  const pillar = pillarIndex >= 0 ? pillars[pillarIndex] : undefined;
  const angles = pillar?.angles ?? [];
  const angleIndex = angles.length ? item.id.charCodeAt(item.id.length - 1) % angles.length : 0;
  return {
    label: pillar?.label ?? 'Chưa gán trụ',
    angle: angles[angleIndex]?.label ?? 'Góc tiếp cận chung',
    style: pillarIndex >= 0 ? PILLAR_STYLES[pillarIndex % PILLAR_STYLES.length] : UNKNOWN_PILLAR_STYLE,
  };
}

function mondayFor(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = (day + 6) % 7; // Monday is 0
  d.setDate(d.getDate() - diff);
  return d;
}

const DAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

// Facebook circular icon
function FacebookIcon({ size = 14 }: { size?: number }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-full bg-[#1877F2] text-white flex items-center justify-center font-bold text-[9px] shadow-sm shrink-0"
    >
      f
    </div>
  );
}

// Instagram gradient icon
function InstagramIcon({ size = 14 }: { size?: number }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-full bg-gradient-to-tr from-[#FD1D1D] via-[#E1306C] to-[#C13584] text-white flex items-center justify-center text-[8px] font-bold shadow-sm shrink-0"
    >
      📷
    </div>
  );
}

export default function MetaPlannerTimeline() {
  const { contentItems, pillars, weekApproved, approveWeek } = usePortal();
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [approvedAnimation, setApprovedAnimation] = useState(false);

  // Filters
  const [pillarFilter, setPillarFilter] = useState<string>('all');
  const [contentTypeFilter, setContentTypeFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Date anchor state
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    if (contentItems.length) {
      const minTime = Math.min(...contentItems.map((i) => i.publishTime.getTime()));
      return new Date(minTime);
    }
    return new Date();
  });

  // Calculate current week (Monday to Sunday)
  const weekStart = useMemo(() => mondayFor(currentDate), [currentDate]);
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return d;
    });
  }, [weekStart]);

  // Date range title for toolbar
  const dateRangeLabel = useMemo(() => {
    if (viewMode === 'week') {
      const start = weekDays[0];
      const end = weekDays[6];
      if (start.getMonth() === end.getMonth()) {
        return `Tháng ${start.getMonth() + 1} ${start.getFullYear()}`;
      }
      return `Tháng ${start.getMonth() + 1} – Tháng ${end.getMonth() + 1} ${end.getFullYear()}`;
    } else {
      return `Tháng ${currentDate.getMonth() + 1} ${currentDate.getFullYear()}`;
    }
  }, [viewMode, weekDays, currentDate]);

  // Navigation handlers
  const handlePrev = () => {
    const next = new Date(currentDate);
    if (viewMode === 'week') {
      next.setDate(next.getDate() - 7);
    } else {
      next.setMonth(next.getMonth() - 1);
    }
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (viewMode === 'week') {
      next.setDate(next.getDate() + 7);
    } else {
      next.setMonth(next.getMonth() + 1);
    }
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Filtered items
  const filteredItems = useMemo(() => {
    return contentItems.filter((item) => {
      if (pillarFilter !== 'all' && item.pillarId !== pillarFilter) return false;
      if (platformFilter !== 'all') {
        if (platformFilter === 'fb' && item.platform !== 'fb' && item.platform !== 'both') return false;
        if (platformFilter === 'ig' && item.platform !== 'ig' && item.platform !== 'both') return false;
      }
      if (statusFilter !== 'all' && item.state !== statusFilter) return false;
      return true;
    });
  }, [contentItems, pillarFilter, platformFilter, statusFilter]);

  const handleApproveWeek = async () => {
    await approveWeek();
    setApprovedAnimation(true);
    setTimeout(() => setApprovedAnimation(false), 2000);
  };

  const exportPlan = () => {
    const headers = ['STT', 'Tên bài viết', 'Trụ nội dung', 'Kênh', 'Ngày giờ đăng', 'Trạng thái'];
    const rows = filteredItems.map((item, index) => {
      const meta = getPillarMeta(item, pillars);
      return [
        index + 1,
        `"${item.title.replace(/"/g, '""')}"`,
        `"${meta.label.replace(/"/g, '""')}"`,
        item.platform.toUpperCase(),
        item.publishTime.toLocaleString('vi-VN'),
        FSM_STATE_LABELS[item.state] ?? item.state,
      ];
    });
    const uri = encodeURI(
      `data:text/csv;charset=utf-8,\uFEFF${[headers.join(','), ...rows.map((row) => row.join(','))].join('\n')}`
    );
    const link = document.createElement('a');
    link.href = uri;
    link.download = `CrewLab_KeHoach_${dateRangeLabel.replace(/\s+/g, '_')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Check if date is today
  const isDateToday = (d: Date) => d.toDateString() === new Date().toDateString();

  return (
    <div className="space-y-4">
      {/* ─── Meta Planner Top Navigation & Filters Bar ────────────────────────── */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-xl border border-border bg-card p-3 shadow-sm">
        {/* Left: View toggle + Navigation + Date title */}
        <div className="flex flex-wrap items-center gap-3">
          {/* View mode toggle (Tuần / Tháng) */}
          <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                viewMode === 'week'
                  ? 'bg-lime-brand text-black shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Tuần
            </button>
            <button
              type="button"
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                viewMode === 'month'
                  ? 'bg-lime-brand text-black shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Tháng
            </button>
          </div>

          {/* Prev / Today / Next */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrev}
              className="p-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
              title="Khoảng trước"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="px-2.5 py-1.5 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted/60 transition-colors"
            >
              Hôm nay
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="p-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
              title="Khoảng kế tiếp"
            >
              <ChevronRight size={15} />
            </button>
          </div>

          {/* Period Label */}
          <h2 className="text-sm md:text-base font-bold text-foreground tracking-tight pl-1">
            {dateRangeLabel}
          </h2>
        </div>

        {/* Right: Filters & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Pillar Filter */}
          <div className="flex items-center gap-1 text-xs">
            <select
              value={pillarFilter}
              onChange={(e) => setPillarFilter(e.target.value)}
              className="h-8 rounded-lg border border-border bg-background px-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-lime-brand"
            >
              <option value="all">Trụ: Tất cả</option>
              {pillars.map((p) => (
                <option key={p.id} value={p.id}>
                  Trụ: {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Content Type Filter */}
          <div className="flex items-center gap-1 text-xs">
            <select
              value={contentTypeFilter}
              onChange={(e) => setContentTypeFilter(e.target.value)}
              className="h-8 rounded-lg border border-border bg-background px-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-lime-brand"
            >
              <option value="all">Loại: Tất cả</option>
              <option value="post">Bài viết</option>
              <option value="reel">Reel</option>
              <option value="story">Story</option>
            </select>
          </div>

          {/* Platform Filter */}
          <div className="flex items-center gap-1 text-xs">
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="h-8 rounded-lg border border-border bg-background px-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-lime-brand"
            >
              <option value="all">Kênh: Tất cả</option>
              <option value="fb">Facebook</option>
              <option value="ig">Instagram</option>
            </select>
          </div>

          {/* Export CSV */}
          <button
            type="button"
            onClick={exportPlan}
            className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            title="Xuất kế hoạch CSV"
          >
            <Download size={13} />
            <span className="hidden sm:inline">Xuất</span>
          </button>

          {/* Approve Week Action */}
          <button
            type="button"
            onClick={() => void handleApproveWeek()}
            disabled={weekApproved || approvedAnimation || contentItems.length === 0}
            className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-bold transition-all shadow-sm ${
              weekApproved || approvedAnimation
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default'
                : 'bg-lime-brand text-black hover:opacity-90 disabled:opacity-50'
            }`}
          >
            {weekApproved || approvedAnimation ? <Check size={13} /> : <CheckSquare size={13} />}
            {weekApproved ? 'Đã duyệt tuần' : 'Duyệt cả tuần'}
          </button>
        </div>
      </div>

      {/* ─── Main Planner Views ──────────────────────────────────────────────── */}
      {viewMode === 'week' ? (
        <MetaWeekGrid
          weekDays={weekDays}
          items={filteredItems}
          pillars={pillars}
          onItemClick={setSelectedItem}
          isToday={isDateToday}
        />
      ) : (
        <MetaMonthGrid
          currentDate={currentDate}
          items={filteredItems}
          pillars={pillars}
          onItemClick={setSelectedItem}
          isToday={isDateToday}
        />
      )}

      {/* Approval & Edit Modal */}
      {selectedItem && (
        <ContentApprovalModal
          contentItem={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}

// ─── Meta Business Suite Week Grid (7 Columns T2 -> CN) ──────────────────────
function MetaWeekGrid({
  weekDays,
  items,
  pillars,
  onItemClick,
  isToday,
}: {
  weekDays: Date[];
  items: ContentItem[];
  pillars: ContentPillar[];
  onItemClick: (item: ContentItem) => void;
  isToday: (d: Date) => boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
      {/* 7 Columns Header */}
      <div className="grid grid-cols-7 border-b border-border bg-muted/40 divide-x divide-border">
        {weekDays.map((date, idx) => {
          const today = isToday(date);
          return (
            <div
              key={date.toISOString()}
              className={`py-2.5 px-1 text-center transition-colors ${
                today ? 'bg-accent-tint' : ''
              }`}
            >
              <span
                className={`text-xs font-bold uppercase tracking-wider ${
                  today ? 'text-lime-brand' : 'text-muted-foreground'
                }`}
              >
                {DAY_LABELS[idx]}
              </span>
              <span
                className={`ml-1 text-xs font-semibold ${
                  today
                    ? 'inline-flex items-center justify-center w-5 h-5 rounded-full bg-lime-brand text-black font-bold shadow-sm'
                    : 'text-foreground'
                }`}
              >
                {date.getDate()}
              </span>
            </div>
          );
        })}
      </div>

      {/* 7 Columns Body */}
      <div className="grid grid-cols-7 divide-x divide-border min-h-[480px]">
        {weekDays.map((date) => {
          const dateStr = date.toDateString();
          const dayItems = items
            .filter((item) => item.publishTime.toDateString() === dateStr)
            .sort((a, b) => a.publishTime.getTime() - b.publishTime.getTime());
          const today = isToday(date);

          return (
            <div
              key={date.toISOString()}
              className={`p-2 space-y-2.5 transition-colors ${
                today ? 'bg-accent-tint/30' : 'hover:bg-muted/10'
              }`}
            >
              {dayItems.length === 0 ? (
                <div className="h-full min-h-[140px] flex items-center justify-center">
                  <div className="text-center p-3 text-muted-foreground/30 text-[11px] select-none">
                    Trống
                  </div>
                </div>
              ) : (
                dayItems.map((item) => {
                  const meta = getPillarMeta(item, pillars);
                  return (
                    <MetaPostCard
                      key={item.id}
                      item={item}
                      meta={meta}
                      onClick={() => onItemClick(item)}
                    />
                  );
                })
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Meta Post Card Component ────────────────────────────────────────────────
function MetaPostCard({
  item,
  meta,
  onClick,
}: {
  item: ContentItem;
  meta: ReturnType<typeof getPillarMeta>;
  onClick: () => void;
}) {
  const timeStr = item.publishTime.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const isPending = item.state === 'pending_content_approval';
  const isApproved = item.state === 'approved_ready_to_post';
  const isPosted = item.state === 'posted';

  return (
    <div
      onClick={onClick}
      className={`group relative rounded-xl border transition-all duration-200 cursor-pointer overflow-hidden bg-card/80 p-2 space-y-2 shadow-sm hover:shadow-md hover:scale-[1.01] ${
        isPending
          ? 'border-accent-tint hover:border-lime-brand'
          : isApproved
          ? 'border-emerald-500/30 hover:border-emerald-500'
          : isPosted
          ? 'border-blue-500/30 hover:border-blue-500'
          : 'border-border hover:border-lime-brand'
      }`}
    >
      {/* 1. Header: Time badge + FSM dot indicator */}
      <div className="flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1 font-mono font-bold text-foreground">
          <Clock size={11} className={isPending ? 'text-lime-brand' : 'text-muted-foreground'} />
          <span>{timeStr}</span>
        </div>
        {item.needsRealPhoto && (
          <span title="Cần chụp ảnh thật của quán">
            <AlertTriangle size={11} className="text-amber-400" />
          </span>
        )}
      </div>

      {/* 2. Visual Media Box with Meta Social Badges */}
      <div className="relative aspect-[4/3] w-full rounded-lg overflow-hidden border border-border/60 bg-muted/40 group-hover:opacity-95 transition-opacity">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/50 gap-1 bg-muted/20">
            <ImageIcon size={18} />
            <span className="text-[9px]">Chưa có ảnh</span>
          </div>
        )}

        {/* Carousel indicator badge top-left */}
        <div className="absolute top-1.5 left-1.5 rounded bg-black/60 p-1 text-white backdrop-blur-sm shadow-sm">
          <Layers size={10} />
        </div>

        {/* Platform icon badges bottom-right */}
        <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-full p-0.5">
          {item.platform === 'fb' && <FacebookIcon size={16} />}
          {item.platform === 'ig' && <InstagramIcon size={16} />}
          {item.platform === 'both' && (
            <>
              <FacebookIcon size={15} />
              <InstagramIcon size={15} />
            </>
          )}
        </div>
      </div>

      {/* 3. Title & Pillar Tag */}
      <div className="space-y-1">
        <p className="text-xs font-semibold text-foreground line-clamp-2 leading-tight group-hover:text-lime-brand transition-colors">
          {item.title}
        </p>

        <div className="flex items-center gap-1 flex-wrap">
          <span
            className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md border ${meta.style.bg} ${meta.style.text} ${meta.style.border} truncate max-w-full`}
          >
            {meta.label}
          </span>
        </div>
      </div>

      {/* 4. Footer: Action / Status Button */}
      <div className="pt-1 border-t border-border/50 flex items-center justify-between">
        <span
          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
            isPending
              ? 'bg-lime-brand/15 text-lime-brand'
              : isApproved
              ? 'bg-emerald-500/15 text-emerald-400'
              : isPosted
              ? 'bg-blue-500/15 text-blue-400'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {FSM_STATE_LABELS[item.state] ?? item.state}
        </span>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className="text-[10px] font-bold text-muted-foreground group-hover:text-lime-brand transition-colors"
        >
          {isPending ? 'Duyệt bài' : 'Chi tiết'} →
        </button>
      </div>
    </div>
  );
}

// ─── Meta Business Suite Month Grid (4-5 Weeks View) ─────────────────────────
function MetaMonthGrid({
  currentDate,
  items,
  pillars,
  onItemClick,
  isToday,
}: {
  currentDate: Date;
  items: ContentItem[];
  pillars: ContentPillar[];
  onItemClick: (item: ContentItem) => void;
  isToday: (d: Date) => boolean;
}) {
  const monthWeeks = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startDate = mondayFor(firstDayOfMonth);
    const weeks: Date[][] = [];

    const cursor = new Date(startDate);
    while (cursor <= lastDayOfMonth || cursor.getDay() !== 1) {
      const week: Date[] = [];
      for (let i = 0; i < 7; i++) {
        week.push(new Date(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(week);
      if (cursor > lastDayOfMonth && cursor.getDay() === 1) break;
    }
    return weeks;
  }, [currentDate]);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-border bg-muted/40 divide-x divide-border">
        {DAY_LABELS.map((day) => (
          <div key={day} className="py-2 text-center text-xs font-bold text-muted-foreground uppercase">
            {day}
          </div>
        ))}
      </div>

      {/* Month matrix */}
      <div className="divide-y divide-border">
        {monthWeeks.map((week, wIdx) => (
          <div key={wIdx} className="grid grid-cols-7 divide-x divide-border min-h-[100px]">
            {week.map((date) => {
              const isCurrentMonth = date.getMonth() === currentDate.getMonth();
              const dateStr = date.toDateString();
              const dayItems = items.filter((i) => i.publishTime.toDateString() === dateStr);
              const today = isToday(date);

              return (
                <div
                  key={date.toISOString()}
                  className={`p-1.5 transition-colors ${
                    today
                      ? 'bg-accent-tint/40'
                      : !isCurrentMonth
                      ? 'bg-muted/10 opacity-40'
                      : 'hover:bg-muted/15'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-semibold px-1 rounded ${
                        today
                          ? 'bg-lime-brand text-black font-bold'
                          : isCurrentMonth
                          ? 'text-foreground'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {date.getDate()}
                    </span>
                    {dayItems.length > 0 && (
                      <span className="text-[9px] font-mono text-muted-foreground">
                        {dayItems.length} bài
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    {dayItems.map((item) => {
                      const meta = getPillarMeta(item, pillars);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => onItemClick(item)}
                          className="w-full text-left p-1 rounded-md border border-border hover:border-lime-brand bg-card hover:bg-muted/40 transition-all flex items-center gap-1 group truncate"
                        >
                          {item.platform === 'fb' ? (
                            <FacebookIcon size={12} />
                          ) : item.platform === 'ig' ? (
                            <InstagramIcon size={12} />
                          ) : (
                            <div className="flex -space-x-1">
                              <FacebookIcon size={10} />
                              <InstagramIcon size={10} />
                            </div>
                          )}
                          <span className="text-[10px] font-mono font-medium text-muted-foreground">
                            {item.publishTime.toLocaleTimeString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <span className="text-[10px] font-semibold text-foreground truncate flex-1 group-hover:text-lime-brand">
                            {item.title}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
