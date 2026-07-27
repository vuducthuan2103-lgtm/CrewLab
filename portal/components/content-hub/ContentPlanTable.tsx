'use client';

import React, { useState } from 'react';
import { usePortal } from '@/lib/store';
import { ContentItem, FSM_STATE_LABELS } from '@/lib/types';
import ContentApprovalModal from '@/components/approval/ContentApprovalModal';
import { TableProperties, Clock, ArrowDownUp, ChevronRight } from 'lucide-react';

const PILLAR_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  p01: { bg: 'bg-blue-500/10', text: 'text-blue-500 dark:text-blue-400', border: 'border-blue-500/20' },
  p02: { bg: 'bg-purple-500/10', text: 'text-purple-500 dark:text-purple-400', border: 'border-purple-500/20' },
  p03: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/20' },
  p04: { bg: 'bg-rose-500/10', text: 'text-rose-500 dark:text-rose-400', border: 'border-rose-500/20' },
};

const PILLAR_LABELS: Record<string, string> = {
  p01: 'Product Spotlight',
  p02: 'Behind the Scenes',
  p03: 'Lifestyle & Cảm xúc',
  p04: 'Ưu đãi & Sự kiện',
};

const PILLAR_ANGLES: Record<string, Record<string, string>> = {
  p01: { a01: 'Hương vị đặc trưng', a02: 'Ảnh flat lay', a03: 'Video rót đồ uống' },
  p02: { a04: 'Barista đang làm việc', a05: 'Không gian buổi sáng', a06: 'Nguyên liệu tươi' },
  p03: { a07: 'Sáng sớm cùng cà phê', a08: 'Làm việc tại quán' },
  p04: { a09: 'Happy hour', a10: 'Combo cuối tuần' },
};

function getAngleForItem(item: ContentItem): string {
  const pillarAngles = PILLAR_ANGLES[item.pillarId];
  if (!pillarAngles) return '—';
  const angleKeys = Object.keys(pillarAngles);
  // Map items to angles deterministically
  const hash = item.id.charCodeAt(item.id.length - 1) % angleKeys.length;
  return pillarAngles[angleKeys[hash]] || '—';
}

function StateBadge({ state }: { state: ContentItem['state'] }) {
  const stateStyles: Record<string, string> = {
    pending_content_approval: 'bg-accent-tint-15 text-lime-brand border border-accent-tint',
    approved_ready_to_post: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
    posted: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
    eval_failed: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
    waiting_asset: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20',
    planned: 'bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border border-zinc-500/20',
    ready_for_generation: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20',
    evaluating: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20',
  };
  const style = stateStyles[state] || 'bg-zinc-500/10 text-zinc-500 border border-zinc-500/20';
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${style}`}>
      {FSM_STATE_LABELS[state] || state}
    </span>
  );
}

function PlatformBadge({ platform }: { platform: ContentItem['platform'] }) {
  if (platform === 'fb') return <span className="text-[10px] font-bold bg-red-500/10 text-red-500 dark:text-red-400 border border-red-500/20 rounded-full px-1.5 py-0.5">🟥 FB</span>;
  if (platform === 'ig') return <span className="text-[10px] font-bold bg-blue-500/10 text-blue-500 dark:text-blue-400 border border-blue-500/20 rounded-full px-1.5 py-0.5">🟦 IG</span>;
  return <span className="text-[10px] font-bold bg-purple-500/10 text-purple-500 dark:text-purple-400 border border-purple-500/20 rounded-full px-1.5 py-0.5">🟥🟦</span>;
}

// ─── TABLE VIEW ───────────────────────────────────────────────────────────────
function TableView({ items, onItemClick }: { items: ContentItem[]; onItemClick: (item: ContentItem) => void }) {
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/40 text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
              <th className="px-3 py-2.5 text-left w-10">STT</th>
              <th className="px-3 py-2.5 text-left w-12"></th>
              <th className="px-3 py-2.5 text-left">Tiêu đề bài</th>
              <th className="px-3 py-2.5 text-left">Pillar</th>
              <th className="px-3 py-2.5 text-left">Angle</th>
              <th className="px-3 py-2.5 text-center w-16">Kênh</th>
              <th className="px-3 py-2.5 text-left w-20">Ngày</th>
              <th className="px-3 py-2.5 text-left w-14">Giờ</th>
              <th className="px-3 py-2.5 text-left w-36">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const pillarColor = PILLAR_COLORS[item.pillarId] || { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/20' };
              return (
                <tr
                  key={item.id}
                  id={`plan-table-row-${item.id}`}
                  onClick={() => onItemClick(item)}
                  className="border-t border-border hover:bg-muted/30 cursor-pointer transition-colors group"
                >
                  <td className="px-3 py-3 text-xs text-muted-foreground font-mono">{idx + 1}</td>
                  <td className="px-3 py-3">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt="" className="w-9 h-9 rounded-lg object-cover border border-border" />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center border border-border">
                        <span className="text-sm">🎨</span>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-xs font-semibold text-foreground group-hover:text-lime-brand transition-colors">
                      {item.title}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${pillarColor.bg} ${pillarColor.text} ${pillarColor.border}`}>
                      {PILLAR_LABELS[item.pillarId] || item.pillarId}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">{getAngleForItem(item)}</td>
                  <td className="px-3 py-3 text-center"><PlatformBadge platform={item.platform} /></td>
                  <td className="px-3 py-3 text-xs text-foreground font-medium">
                    {item.publishTime.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                  </td>
                  <td className="px-3 py-3 text-xs text-foreground font-mono">
                    {item.publishTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5">
                      <StateBadge state={item.state} />
                      <ChevronRight size={11} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── TIMELINE VIEW ────────────────────────────────────────────────────────────
const WEEK_DAYS_FULL = [
  { label: 'Thứ 2', short: 'T2', date: 16 },
  { label: 'Thứ 3', short: 'T3', date: 17 },
  { label: 'Thứ 4', short: 'T4', date: 18 },
  { label: 'Thứ 5', short: 'T5', date: 19 },
  { label: 'Thứ 6', short: 'T6', date: 20 },
  { label: 'Thứ 7', short: 'T7', date: 21 },
  { label: 'Chủ nhật', short: 'CN', date: 22 },
];

function TimelineView({ items, onItemClick }: { items: ContentItem[]; onItemClick: (item: ContentItem) => void }) {
  const itemsByDate: Record<number, ContentItem[]> = {};
  items.forEach((item) => {
    const d = item.publishTime.getDate();
    if (!itemsByDate[d]) itemsByDate[d] = [];
    itemsByDate[d].push(item);
  });

  // Sort items within each date by time
  Object.values(itemsByDate).forEach((dayItems) => {
    dayItems.sort((a, b) => a.publishTime.getTime() - b.publishTime.getTime());
  });

  return (
    <div className="space-y-0">
      {WEEK_DAYS_FULL.map((day) => {
        const dayItems = itemsByDate[day.date] || [];
        const isToday = day.date === 17;

        return (
          <div key={day.date} className="flex gap-4">
            {/* Date column */}
            <div className="w-24 flex-shrink-0 py-4 text-right pr-4 border-r-2 border-border relative">
              <div className={`absolute right-[-5px] top-6 w-2 h-2 rounded-full ${isToday ? 'bg-lime-brand shadow-accent-glow' : dayItems.length > 0 ? 'bg-primary/40' : 'bg-border'}`} />
              <p className={`text-xs font-bold ${isToday ? 'text-lime-brand' : 'text-foreground'}`}>{day.label}</p>
              <p className={`text-[10px] font-mono ${isToday ? 'text-lime-brand' : 'text-muted-foreground'}`}>{day.date}/06</p>
            </div>

            {/* Items column */}
            <div className="flex-1 py-3 space-y-2 min-h-[60px]">
              {dayItems.length === 0 && (
                <div className="text-[10px] text-muted-foreground/40 py-2 italic">Không có bài</div>
              )}
              {dayItems.map((item) => {
                const pillarColor = PILLAR_COLORS[item.pillarId] || { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/20' };
                return (
                  <button
                    key={item.id}
                    id={`plan-timeline-${item.id}`}
                    onClick={() => onItemClick(item)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:border-lime-brand bg-background hover:bg-muted/20 transition-all text-left group"
                  >
                    {/* Pillar color ribbon */}
                    <div className={`w-1 h-10 rounded-full flex-shrink-0 ${pillarColor.bg} border ${pillarColor.border}`} />

                    {/* Thumbnail */}
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover border border-border flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center border border-border flex-shrink-0">
                        <span className="text-sm">🎨</span>
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground group-hover:text-lime-brand transition-colors truncate">{item.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[9px] font-semibold ${pillarColor.text}`}>{PILLAR_LABELS[item.pillarId]}</span>
                        <span className="text-muted-foreground/30">·</span>
                        <span className="text-[9px] text-muted-foreground">{getAngleForItem(item)}</span>
                      </div>
                    </div>

                    {/* Time + Platform + State */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-[10px] font-mono text-foreground">
                          {item.publishTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <PlatformBadge platform={item.platform} />
                      </div>
                      <StateBadge state={item.state} />
                      <ChevronRight size={11} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function ContentPlanTable() {
  const { contentItems } = usePortal();
  const [view, setView] = useState<'table' | 'timeline'>('table');
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);

  // Sort by publish time
  const sorted = [...contentItems].sort((a, b) => a.publishTime.getTime() - b.publishTime.getTime());

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TableProperties size={15} className="text-lime-brand" />
          <h2 className="text-base font-bold text-foreground">Bảng kế hoạch nội dung</h2>
          <span className="text-xs text-muted-foreground ml-1">{sorted.length} bài · Tuần 25</span>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 border border-border rounded-lg p-0.5">
          <button
            id="plan-view-table"
            onClick={() => setView('table')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              view === 'table'
                ? 'bg-lime-brand shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            📊 Bảng
          </button>
          <button
            id="plan-view-timeline"
            onClick={() => setView('timeline')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              view === 'timeline'
                ? 'bg-lime-brand shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            📅 Timeline
          </button>
        </div>
      </div>

      {/* Content */}
      {view === 'table' ? (
        <TableView items={sorted} onItemClick={(item) => setSelectedItem(item)} />
      ) : (
        <TimelineView items={sorted} onItemClick={(item) => setSelectedItem(item)} />
      )}

      {/* Approval Modal */}
      {selectedItem && (
        <ContentApprovalModal contentItem={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </div>
  );
}
