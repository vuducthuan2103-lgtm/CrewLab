'use client';

import React, { useState } from 'react';
import { usePortal } from '@/lib/store';
import { ContentItem } from '@/lib/types';
import ContentApprovalModal from '@/components/approval/ContentApprovalModal';
import { ChevronLeft, ChevronRight, CheckSquare, AlertTriangle, Calendar } from 'lucide-react';

const WEEK_DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const WEEK_DATES = [16, 17, 18, 19, 20, 21, 22];

function StateDot({ state }: { state: ContentItem['state'] }) {
  if (state === 'posted') return <span className="text-[8px] text-blue-400">●</span>;
  if (state === 'approved_ready_to_post') return <span className="text-[8px] text-emerald-400">●</span>;
  if (state === 'pending_content_approval') return <span className="text-[8px] text-[#D4FF00]">●</span>;
  if (state === 'evaluating') return <span className="text-[8px] text-cyan-400 animate-pulse">◐</span>;
  if (state === 'waiting_asset') return <span className="text-[8px] text-orange-400">◌</span>;
  return <span className="text-[8px] text-zinc-500">○</span>;
}

function DayCell({
  dayLabel,
  date,
  items,
  onItemClick,
}: {
  dayLabel: string;
  date: number;
  items: ContentItem[];
  onItemClick: (item: ContentItem) => void;
}) {
  const isToday = date === 17; // mock "today" = 17/06

  return (
    <div className={`border-r border-border last:border-r-0 p-2 min-h-[120px] ${isToday ? 'bg-[#D4FF00]/3' : ''}`}>
      {/* Day header */}
      <div className={`text-center mb-2 ${isToday ? 'text-[#D4FF00]' : 'text-muted-foreground'}`}>
        <p className="text-[10px] font-bold uppercase">{dayLabel}</p>
        <p className={`text-xs font-semibold mt-0.5 w-6 h-6 rounded-full mx-auto flex items-center justify-center ${
          isToday ? 'bg-[#D4FF00] text-black shadow-[0_0_8px_rgba(212,255,0,0.4)]' : ''
        }`}>
          {date}
        </p>
      </div>

      {/* Content items */}
      <div className="space-y-1.5">
        {items.map((item) => (
          <button
            key={item.id}
            id={`calendar-item-${item.id}`}
            onClick={() => onItemClick(item)}
            className="w-full text-left"
          >
            <div className={`rounded-lg overflow-hidden border transition-all hover:scale-[1.02] ${
              item.state === 'pending_content_approval'
                ? 'border-[#D4FF00]/40 hover:border-[#D4FF00]/80'
                : 'border-border hover:border-border/80'
            }`}>
              {/* Platform badge + time */}
              <div className={`px-1.5 py-0.5 text-[9px] font-bold flex items-center justify-between ${
                item.platform === 'ig' ? 'bg-blue-500/20 text-blue-300' : item.platform === 'fb' ? 'bg-red-500/20 text-red-300' : 'bg-purple-500/20 text-purple-300'
              }`}>
                <span>{item.platform === 'ig' ? '🟦 IG' : item.platform === 'fb' ? '🟥 FB' : '🟥🟦'}</span>
                <span>
                  {item.publishTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              {/* Thumbnail */}
              {item.imageUrl ? (
                <img src={item.imageUrl} alt="" className="w-full h-12 object-cover" />
              ) : (
                <div className="w-full h-10 bg-muted/50 flex items-center justify-center">
                  <span className="text-[11px]">🎨</span>
                </div>
              )}
              {/* Status row */}
              <div className="px-1.5 py-0.5 bg-background flex items-center justify-between">
                <StateDot state={item.state} />
                {item.needsRealPhoto && (
                  <span title="Cần ảnh thật"><AlertTriangle size={9} className="text-orange-400" /></span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ContentCalendar() {
  const { contentItems, weekApproved, approveWeek } = usePortal();
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [approvedAnimation, setApprovedAnimation] = useState(false);

  // Map items to day index (0 = Monday 16/06)
  const itemsByDay: Record<number, ContentItem[]> = {};
  WEEK_DATES.forEach((_, i) => { itemsByDay[i] = []; });

  contentItems.forEach((item) => {
    const d = item.publishTime.getDate();
    const dayIdx = WEEK_DATES.indexOf(d);
    if (dayIdx !== -1) itemsByDay[dayIdx].push(item);
  });

  const handleApproveWeek = () => {
    approveWeek();
    setApprovedAnimation(true);
    setTimeout(() => setApprovedAnimation(false), 2000);
  };

  return (
    <div>
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar size={15} className="text-[#D4FF00]" />
          <h2 className="text-base font-bold text-foreground">Kế hoạch nội dung</h2>
        </div>
        <div className="flex items-center gap-2">
          {/* Legend */}
          <div className="hidden lg:flex items-center gap-3 text-[10px] text-muted-foreground mr-2">
            <span><span className="text-blue-400">●</span> Đã đăng</span>
            <span><span className="text-emerald-400">●</span> Chờ đăng</span>
            <span><span className="text-[#D4FF00]">●</span> Chờ duyệt</span>
            <span><span className="text-cyan-400">◐</span> AI đang làm</span>
          </div>

          {/* Week nav */}
          <div className="flex items-center gap-1 border border-border rounded-lg px-2 py-1.5">
            <button className="text-muted-foreground hover:text-foreground p-0.5"><ChevronLeft size={13} /></button>
            <span className="text-xs font-semibold text-foreground px-1">Tuần 25 · 16–22/06</span>
            <button className="text-muted-foreground hover:text-foreground p-0.5"><ChevronRight size={13} /></button>
          </div>

          {/* Approve all week button */}
          <button
            id="approve-all-week-btn"
            onClick={handleApproveWeek}
            disabled={weekApproved}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              weekApproved || approvedAnimation
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default'
                : 'bg-[#D4FF00] text-black hover:bg-[#E5FF55] shadow-[0_0_12px_rgba(212,255,0,0.3)] hover:shadow-[0_0_20px_rgba(212,255,0,0.5)]'
            }`}
          >
            <CheckSquare size={13} />
            {weekApproved ? '✓ Đã duyệt tuần 25' : 'Duyệt tất cả tuần'}
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="border border-border rounded-xl overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-border bg-muted/30">
          {WEEK_DAYS.map((day, i) => (
            <div
              key={day}
              className={`text-center py-2 border-r border-border last:border-r-0 text-[10px] font-bold uppercase tracking-wider ${
                i === 1 ? 'text-[#D4FF00]' : 'text-muted-foreground'
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {WEEK_DAYS.map((day, i) => (
            <DayCell
              key={day}
              dayLabel={day}
              date={WEEK_DATES[i]}
              items={itemsByDay[i] || []}
              onItemClick={(item) => setSelectedItem(item)}
            />
          ))}
        </div>
      </div>

      {/* Approval Modal */}
      {selectedItem && (
        <ContentApprovalModal contentItem={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </div>
  );
}
