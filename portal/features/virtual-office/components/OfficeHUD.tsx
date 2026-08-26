'use client';

import { Users } from 'lucide-react';
import { useOfficeStore } from '../state/office-store';

export function OfficeHUD() {
  const getSummary = useOfficeStore((s) => s.getSummary);
  const openRoster = useOfficeStore((s) => s.setAccessibleRosterOpen);
  const summary = getSummary();
  return <header className="pointer-events-none fixed left-[68px] right-0 top-0 z-40 flex items-start justify-between gap-4 p-4 md:p-6"><div className="rounded-2xl border border-white/10 bg-[#101111]/88 px-4 py-3 text-zinc-100 shadow-xl backdrop-blur-xl"><p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#D4FF00]">CrewLab Office</p><h1 className="mt-1 text-base font-semibold tracking-tight">Đội ngũ marketing của bạn</h1><p className="mt-1 text-xs text-zinc-400">{summary.workingCount} đang làm · {summary.waitingForCeoCount} cần bạn xem</p></div><button onClick={() => openRoster(true)} className="pointer-events-auto inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 bg-[#101111]/88 px-4 text-sm font-medium text-white shadow-xl backdrop-blur-xl transition hover:border-[#D4FF00]/50 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D4FF00]"><Users size={17} /> Danh sách đội ngũ</button></header>;
}
