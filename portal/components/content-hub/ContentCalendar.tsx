'use client';

import React, { useMemo, useState } from 'react';
import { usePortal } from '@/lib/store';
import { ContentItem } from '@/lib/types';
import ContentApprovalModal from '@/components/approval/ContentApprovalModal';
import { AlertTriangle, Calendar, CheckSquare, Download, ImageIcon } from 'lucide-react';

const DAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function StateDot({ state }: { state: ContentItem['state'] }) {
  if (state === 'posted') return <span className="text-[8px] text-blue-400">●</span>;
  if (state === 'approved_ready_to_post') return <span className="text-[8px] text-emerald-400">●</span>;
  if (state === 'pending_content_approval') return <span className="text-[8px] text-lime-brand">●</span>;
  if (state === 'evaluating') return <span className="text-[8px] text-cyan-400 animate-pulse">◐</span>;
  return <span className="text-[8px] text-zinc-500">○</span>;
}

function mondayFor(date: Date) {
  const monday = new Date(date);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday;
}

function DayCell({ date, items, onItemClick }: { date: Date; items: ContentItem[]; onItemClick: (item: ContentItem) => void }) {
  const isToday = date.toDateString() === new Date().toDateString();
  return <div className={`border-r border-border last:border-r-0 p-2 min-h-[120px] ${isToday ? 'bg-accent-tint' : ''}`}>
    <div className={`text-center mb-2 ${isToday ? 'text-lime-brand' : 'text-muted-foreground'}`}><p className={`text-xs font-semibold mt-0.5 w-6 h-6 rounded-full mx-auto flex items-center justify-center ${isToday ? 'bg-lime-brand shadow-accent-glow' : ''}`}>{date.getDate()}</p></div>
    <div className="space-y-1.5">{items.map((item) => <button key={item.id} onClick={() => onItemClick(item)} className="w-full text-left"><div className={`rounded-lg overflow-hidden border transition-all hover:scale-[1.02] ${item.state === 'pending_content_approval' ? 'border-accent-tint hover:border-lime-brand' : 'border-border hover:border-border/80'}`}><div className={`px-1.5 py-0.5 text-[9px] font-bold flex items-center justify-between ${item.platform === 'ig' ? 'bg-blue-500/20 text-blue-300' : item.platform === 'fb' ? 'bg-red-500/20 text-red-300' : 'bg-purple-500/20 text-purple-300'}`}><span>{item.platform === 'ig' ? 'IG' : item.platform === 'fb' ? 'FB' : 'FB · IG'}</span><span>{item.publishTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span></div>{item.imageUrl ? <img src={item.imageUrl} alt="" className="w-full h-12 object-cover" /> : <div className="w-full h-10 bg-muted/50 flex items-center justify-center"><ImageIcon size={12} className="text-muted-foreground" /></div>}<div className="px-1.5 py-0.5 bg-background flex items-center justify-between"><StateDot state={item.state} />{item.needsRealPhoto && <span title="Can anh that"><AlertTriangle size={9} className="text-orange-400" /></span>}</div></div></button>)}</div>
  </div>;
}

export default function ContentCalendar() {
  const { contentItems, weekApproved, approveWeek } = usePortal();
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [approvedAnimation, setApprovedAnimation] = useState(false);
  const weekStart = useMemo(() => mondayFor(contentItems.length ? new Date(Math.min(...contentItems.map((item) => item.publishTime.getTime()))) : new Date()), [contentItems]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => { const date = new Date(weekStart); date.setDate(weekStart.getDate() + index); return date; }), [weekStart]);
  const handleApproveWeek = async () => { await approveWeek(); setApprovedAnimation(true); window.setTimeout(() => setApprovedAnimation(false), 2000); };
  const exportPlan = () => { const headers = ['STT', 'Bai viet', 'Kenh', 'Ngay dang', 'Trang thai']; const rows = contentItems.map((item, index) => [index + 1, `"${item.title.replace(/"/g, '""')}"`, item.platform.toUpperCase(), item.publishTime.toLocaleString('vi-VN'), item.state]); const uri = encodeURI(`data:text/csv;charset=utf-8,\uFEFF${[headers.join(','), ...rows.map((row) => row.join(','))].join('\n')}`); const link = document.createElement('a'); link.href = uri; link.download = 'CrewLab_KeHoachNoiDung.csv'; document.body.appendChild(link); link.click(); document.body.removeChild(link); };
  return <div><div className="flex items-center justify-between mb-4"><div className="flex items-center gap-2"><Calendar size={15} className="text-lime-brand" /><h2 className="text-base font-bold text-foreground">Ke hoach noi dung</h2></div><div className="flex items-center gap-2"><button type="button" onClick={exportPlan} className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50"><Download size={12} /> Xuat ke hoach</button><button type="button" onClick={() => void handleApproveWeek()} disabled={weekApproved || approvedAnimation || contentItems.length === 0} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${weekApproved || approvedAnimation ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default' : 'bg-lime-brand shadow-sm hover:opacity-90 disabled:opacity-50'}`}><CheckSquare size={13} />{weekApproved ? 'Da duyet tuan' : 'Duyet tat ca tuan'}</button></div></div><div className="border border-border rounded-xl overflow-hidden"><div className="grid grid-cols-7 border-b border-border bg-muted/30">{DAY_LABELS.map((day, index) => <div key={day} className={`text-center py-2 border-r border-border last:border-r-0 text-[10px] font-bold uppercase tracking-wider ${days[index].toDateString() === new Date().toDateString() ? 'text-lime-brand' : 'text-muted-foreground'}`}>{day}</div>)}</div><div className="grid grid-cols-7">{days.map((date) => <DayCell key={date.toISOString()} date={date} items={contentItems.filter((item) => item.publishTime.toDateString() === date.toDateString())} onItemClick={setSelectedItem} />)}</div></div>{selectedItem && <ContentApprovalModal contentItem={selectedItem} onClose={() => setSelectedItem(null)} />}</div>;
}
