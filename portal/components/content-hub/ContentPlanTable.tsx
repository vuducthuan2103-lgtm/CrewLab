'use client';

import React, { useMemo, useState } from 'react';
import { usePortal } from '@/lib/store';
import { ContentItem, ContentPillar, FSM_STATE_LABELS } from '@/lib/types';
import ContentApprovalModal from '@/components/approval/ContentApprovalModal';
import { CalendarRange, ChevronRight, ImageIcon, TableProperties } from 'lucide-react';

type PillarStyle = { bg: string; text: string; border: string };

const PILLAR_STYLES: PillarStyle[] = [
  { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },
  { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
];
const UNKNOWN_PILLAR_STYLE: PillarStyle = { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/20' };

function getPillarMeta(item: ContentItem, pillars: ContentPillar[]) {
  const pillarIndex = pillars.findIndex((pillar) => pillar.id === item.pillarId);
  const pillar = pillarIndex >= 0 ? pillars[pillarIndex] : undefined;
  const angles = pillar?.angles ?? [];
  const angleIndex = angles.length ? item.id.charCodeAt(item.id.length - 1) % angles.length : 0;
  return {
    label: pillar?.label ?? 'Chưa gán trụ nội dung',
    angle: angles[angleIndex]?.label ?? 'Chưa có angle',
    style: pillarIndex >= 0 ? PILLAR_STYLES[pillarIndex % PILLAR_STYLES.length] : UNKNOWN_PILLAR_STYLE,
  };
}

function StateBadge({ state }: { state: ContentItem['state'] }) {
  const stateStyles: Record<string, string> = {
    pending_content_approval: 'bg-accent-tint-15 text-lime-brand border border-accent-tint',
    approved_ready_to_post: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    posted: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    eval_failed: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    planned: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
    ready_for_generation: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
    evaluating: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
  };
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${stateStyles[state] ?? stateStyles.planned}`}>{FSM_STATE_LABELS[state] ?? state}</span>;
}

function PlatformBadge({ platform }: { platform: ContentItem['platform'] }) {
  if (platform === 'fb') return <span className="text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 rounded-full px-1.5 py-0.5">FB</span>;
  if (platform === 'ig') return <span className="text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full px-1.5 py-0.5">IG</span>;
  return <span className="text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full px-1.5 py-0.5">FB · IG</span>;
}

function TableView({ items, pillars, onItemClick, onScheduleChange }: { items: ContentItem[]; pillars: ContentPillar[]; onItemClick: (item: ContentItem) => void; onScheduleChange: (item: ContentItem, value: Date) => Promise<void> }) {
  if (!items.length) return <EmptyPlan />;
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="bg-muted/40 text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
            <th className="px-3 py-2.5 text-left">STT</th><th className="px-3 py-2.5 text-left">Pillar</th><th className="px-3 py-2.5 text-left">Angle</th><th className="px-3 py-2.5 text-left">Bài đăng</th><th className="px-3 py-2.5 text-center">Kênh</th><th className="px-3 py-2.5 text-left">Ngày giờ</th><th className="px-3 py-2.5 text-left">Trạng thái</th>
          </tr></thead>
          <tbody>{items.map((item, index) => {
            const meta = getPillarMeta(item, pillars);
            return <tr key={item.id} onClick={() => onItemClick(item)} className="border-t border-border hover:bg-muted/30 cursor-pointer transition-colors group">
              <td className="px-3 py-3 text-xs text-muted-foreground font-mono">{index + 1}</td>
              <td className="px-3 py-3"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${meta.style.bg} ${meta.style.text} ${meta.style.border}`}>{meta.label}</span></td>
              <td className="px-3 py-3 text-xs text-muted-foreground">{meta.angle}</td>
              <td className="px-3 py-3"><div className="flex items-center gap-2"><Thumbnail item={item} /><span className="text-xs font-semibold text-foreground group-hover:text-lime-brand transition-colors">{item.title}</span></div></td>
              <td className="px-3 py-3 text-center"><PlatformBadge platform={item.platform} /></td>
              <td className="px-3 py-3 text-xs text-foreground font-medium"><ScheduleEditor item={item} onScheduleChange={onScheduleChange} /></td>
              <td className="px-3 py-3"><div className="flex items-center gap-1.5"><StateBadge state={item.state} /><ChevronRight size={11} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" /></div></td>
            </tr>;
          })}</tbody>
        </table>
      </div>
    </div>
  );
}

function ScheduleEditor({ item, onScheduleChange }: { item: ContentItem; onScheduleChange: (item: ContentItem, value: Date) => Promise<void> }) {
  const isEditable = item.state === 'planned';
  const dateValue = `${item.publishTime.getFullYear()}-${String(item.publishTime.getMonth() + 1).padStart(2, '0')}-${String(item.publishTime.getDate()).padStart(2, '0')}`;
  const timeValue = `${String(item.publishTime.getHours()).padStart(2, '0')}:${String(item.publishTime.getMinutes()).padStart(2, '0')}`;
  const update = (part: 'date' | 'time', rawValue: string) => {
    const next = new Date(item.publishTime);
    if (part === 'date') {
      const [year, month, day] = rawValue.split('-').map(Number);
      next.setFullYear(year, month - 1, day);
    } else {
      const [hour, minute] = rawValue.split(':').map(Number);
      next.setHours(hour, minute, 0, 0);
    }
    void onScheduleChange(item, next);
  };
  if (!isEditable) return <span>{item.publishTime.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>;
  return <div className="flex min-w-40 gap-1"><input aria-label={`Ngay dang ${item.title}`} type="date" value={dateValue} onClick={(event) => event.stopPropagation()} onChange={(event) => update('date', event.target.value)} className="h-7 w-28 rounded border border-border bg-background px-1 text-[10px]" /><input aria-label={`Gio dang ${item.title}`} type="time" value={timeValue} onClick={(event) => event.stopPropagation()} onChange={(event) => update('time', event.target.value)} className="h-7 w-20 rounded border border-border bg-background px-1 text-[10px]" /></div>;
}

function Thumbnail({ item }: { item: ContentItem }) {
  return item.imageUrl ? <img src={item.imageUrl} alt="" className="w-9 h-9 rounded-lg object-cover border border-border" /> : <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center border border-border"><ImageIcon size={14} className="text-muted-foreground" /></div>;
}

function getWeekDays(items: ContentItem[]) {
  const reference = items.length ? new Date(Math.min(...items.map((item) => item.publishTime.getTime()))) : new Date();
  const monday = new Date(reference);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + offset);
    return { date, label: ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'][offset] };
  });
}

function TimelineView({ items, pillars, onItemClick }: { items: ContentItem[]; pillars: ContentPillar[]; onItemClick: (item: ContentItem) => void }) {
  const days = useMemo(() => getWeekDays(items), [items]);
  const todayKey = new Date().toDateString();
  if (!items.length) return <EmptyPlan />;
  return <div>{days.map(({ date, label }) => {
    const dayItems = items.filter((item) => item.publishTime.toDateString() === date.toDateString());
    const isToday = date.toDateString() === todayKey;
    return <div key={date.toISOString()} className="flex gap-4">
      <div className="w-24 flex-shrink-0 py-4 text-right pr-4 border-r-2 border-border relative"><div className={`absolute right-[-5px] top-6 w-2 h-2 rounded-full ${isToday ? 'bg-lime-brand shadow-accent-glow' : dayItems.length ? 'bg-primary/40' : 'bg-border'}`} /><p className={`text-xs font-bold ${isToday ? 'text-lime-brand' : 'text-foreground'}`}>{label}</p><p className="text-[10px] font-mono text-muted-foreground">{date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}</p></div>
      <div className="flex-1 py-3 space-y-2 min-h-[60px]">{dayItems.length === 0 ? <div className="text-[10px] text-muted-foreground/40 py-2 italic">Không có bài</div> : dayItems.map((item) => {
        const meta = getPillarMeta(item, pillars);
        return <button key={item.id} onClick={() => onItemClick(item)} className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:border-lime-brand bg-background hover:bg-muted/20 transition-all text-left group"><div className={`w-1 h-10 rounded-full flex-shrink-0 ${meta.style.bg} border ${meta.style.border}`} /><Thumbnail item={item} /><div className="flex-1 min-w-0"><p className="text-xs font-semibold text-foreground group-hover:text-lime-brand transition-colors truncate">{item.title}</p><div className="flex items-center gap-2 mt-0.5"><span className={`text-[9px] font-semibold ${meta.style.text}`}>{meta.label}</span><span className="text-muted-foreground/30">·</span><span className="text-[9px] text-muted-foreground">{meta.angle}</span></div></div><div className="flex items-center gap-2 flex-shrink-0"><div className="text-right"><p className="text-[10px] font-mono text-foreground">{item.publishTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</p><PlatformBadge platform={item.platform} /></div><StateBadge state={item.state} /><ChevronRight size={11} className="text-muted-foreground" /></div></button>;
      })}</div>
    </div>;
  })}</div>;
}

function EmptyPlan() {
  return <div className="border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground">Chưa có bài nào trong tuần này. Hãy bấm &ldquo;Tạo bản nháp tuần&rdquo; để AI lên kế hoạch tự động.</div>;
}

export default function ContentPlanTable() {
  const { contentItems, pillars, updateContentSchedule } = usePortal();
  const [view, setView] = useState<'table' | 'timeline'>('table');
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const sorted = [...contentItems].sort((a, b) => a.publishTime.getTime() - b.publishTime.getTime());
  return <div>
    <div className="flex items-center justify-between mb-4"><div className="flex items-center gap-2"><TableProperties size={15} className="text-lime-brand" /><h2 className="text-base font-bold text-foreground">Kế hoạch nội dung tuần</h2><span className="text-xs text-muted-foreground ml-1">{sorted.length} bài</span></div><div className="flex items-center gap-1 border border-border rounded-lg p-0.5"><button onClick={() => setView('table')} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md ${view === 'table' ? 'bg-lime-brand shadow-sm' : 'text-muted-foreground hover:bg-muted/50'}`}><TableProperties size={12} />Bảng</button><button onClick={() => setView('timeline')} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md ${view === 'timeline' ? 'bg-lime-brand shadow-sm' : 'text-muted-foreground hover:bg-muted/50'}`}><CalendarRange size={12} />Timeline</button></div></div>
    {view === 'table' ? <TableView items={sorted} pillars={pillars} onItemClick={setSelectedItem} onScheduleChange={async (item, value) => updateContentSchedule(item.id, value)} /> : <TimelineView items={sorted} pillars={pillars} onItemClick={setSelectedItem} />}
    {selectedItem && <ContentApprovalModal contentItem={selectedItem} onClose={() => setSelectedItem(null)} />}
  </div>;
}
