'use client';

import React from 'react';
import Link from 'next/link';
import { Bell, Clock3, LayoutList, Map, Settings, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useOfficeStore } from '../state/office-store';

export function OfficeHUD() {
  const getSummary = useOfficeStore((state) => state.getSummary);
  const selectedAgentCode = useOfficeStore((state) => state.selectedAgentCode);
  const openRoster = useOfficeStore((state) => state.setAccessibleRosterOpen);
  const agents = useOfficeStore((state) => state.agents);
  const summary = getSummary();
  const attentionAgent = Object.values(agents).find((agent) => agent.requiresHumanAction);

  return (
    <>
      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex h-16 items-center justify-between border-b border-white/10 bg-[rgba(8,13,11,0.92)] px-4 text-zinc-100 shadow-[0_12px_40px_rgba(0,0,0,0.2)] backdrop-blur-xl md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="hidden h-8 w-8 items-center justify-center border border-[#D4FF00]/30 bg-[#D4FF00]/10 text-[#D4FF00] sm:flex">
            <Map size={16} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight">CrewLab Garden Office</p>
            <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-400">Không gian điều hành AI</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-zinc-300">
          <span className="hidden items-center gap-2 md:flex"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Hệ thống ổn định</span>
          <span className="hidden items-center gap-2 sm:flex"><Clock3 size={14} /> Phiên làm việc hiện tại</span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => openRoster(true)}
            className="pointer-events-auto h-10 rounded-none border-white/15 bg-white/5 font-medium hover:border-[#D4FF00]/50 hover:bg-white/10"
          >
            <Users size={16} /> <span className="hidden sm:inline">Đội ngũ</span>
          </Button>
        </div>
      </header>

      <section className="pointer-events-none absolute left-4 top-20 z-30 hidden w-64 rounded-sm border border-white/15 bg-[rgba(9,16,13,0.9)] p-4 text-zinc-100 shadow-2xl backdrop-blur-xl md:block">
        <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-400">Tổng quan hệ thống</p>
        <div className="mt-3 flex items-center gap-2 text-sm font-medium"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Tất cả dịch vụ hoạt động</div>
        <div className="mt-4 border-t border-white/10 pt-3">
          <div className="flex items-center justify-between text-xs text-zinc-400"><span>Agent đang làm</span><strong className="font-mono text-white">{summary.workingCount}/{summary.totalAgents}</strong></div>
          <div className="mt-2 flex items-center justify-between text-xs text-zinc-400"><span>Cần bạn xử lý</span><strong className="font-mono text-amber-300">{summary.waitingForHumanCount}</strong></div>
        </div>
      </section>

      {!selectedAgentCode && (
        <aside className="pointer-events-none absolute bottom-5 right-5 z-30 hidden w-72 rounded-sm border border-white/15 bg-[rgba(9,16,13,0.92)] p-4 text-zinc-100 shadow-2xl backdrop-blur-xl lg:block">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-400">Ưu tiên hiện tại</p>
            <Bell size={15} className="text-amber-300" />
          </div>
          {attentionAgent ? (
            <div className="mt-3">
              <div className="flex items-center gap-2"><span className="font-mono text-[11px] text-[#D4FF00]">{attentionAgent.code}</span><span className="text-sm font-semibold">đang chờ bạn</span></div>
              <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-300">{attentionAgent.actionPrompt}</p>
              <Button variant="ghost" size="sm" onClick={() => useOfficeStore.getState().selectAgent(attentionAgent.code)} className="pointer-events-auto mt-2 h-9 rounded-none px-0 text-[#D4FF00] hover:bg-transparent hover:text-[#e2ff52]">Xem chi tiết →</Button>
            </div>
          ) : (
            <p className="mt-3 text-xs leading-5 text-zinc-400">Không có yêu cầu mới cần bạn xử lý.</p>
          )}
        </aside>
      )}

      <nav aria-label="Điều hướng nhanh văn phòng" className="pointer-events-auto absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center rounded-sm border border-white/15 bg-[rgba(8,13,11,0.94)] p-1.5 text-zinc-300 shadow-2xl backdrop-blur-xl">
        <Link href="/tasks" className="flex min-h-11 items-center gap-2 px-3 text-xs font-medium transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D4FF00]"><LayoutList size={16} /><span className="hidden sm:inline">Công việc</span></Link>
        <Button variant="ghost" size="sm" onClick={() => openRoster(true)} className="rounded-none border-x border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white"><Users size={16} /><span className="hidden sm:inline">Agent</span></Button>
        <Link href="/settings" className="flex min-h-11 items-center gap-2 px-3 text-xs font-medium transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D4FF00]"><Settings size={16} /><span className="hidden sm:inline">Cài đặt</span></Link>
      </nav>
    </>
  );
}
