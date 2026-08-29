'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, CheckCircle2, Clock3, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useOfficeStore } from '../state/office-store';
import { getStatePresentation } from '../config/agent-state-map';

export function AgentFocusPopup() {
  const router = useRouter();
  const selectedAgentCode = useOfficeStore((state) => state.selectedAgentCode);
  const agents = useOfficeStore((state) => state.agents);
  const closeDetail = useOfficeStore((state) => state.closeDetail);

  if (!selectedAgentCode) return null;
  const agent = agents[selectedAgentCode];
  if (!agent) return null;

  const presentation = getStatePresentation(agent.visualState);
  const latestCompleted = agent.recentTasks.find((task) => task.status === 'done');

  return (
    <section
      data-testid="agent-focus-popup"
      aria-label={`Thông tin ${agent.code}`}
      className="absolute bottom-20 left-4 right-4 z-40 max-h-[calc(100%-6rem)] overflow-y-auto rounded-sm border border-white/15 bg-[rgba(8,14,12,0.95)] p-5 text-zinc-100 shadow-[0_24px_70px_rgba(0,0,0,0.68)] backdrop-blur-xl md:bottom-auto md:left-auto md:right-5 md:top-20 md:w-[330px]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-semibold tracking-[0.15em] text-[#D4FF00]">{agent.code}</span>
            <span className="flex items-center gap-1.5 text-[11px] text-zinc-300"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: presentation.dotColor }} />{presentation.labelVi}</span>
          </div>
          <h2 className="mt-2 text-lg font-semibold tracking-tight text-white">{agent.role}</h2>
          <p className="mt-1 text-xs text-zinc-400">Cập nhật {agent.updatedAt || 'gần đây'}</p>
        </div>
        <Button variant="ghost" size="icon" aria-label="Đóng thông tin agent" onClick={closeDetail} className="-mr-2 -mt-2 h-9 w-9 rounded-none text-zinc-400 hover:bg-white/10 hover:text-white"><X size={18} /></Button>
      </div>

      <div className="mt-5 border-t border-white/10 pt-4">
        <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-zinc-500">Tác vụ hiện tại</p>
        <p className="mt-2 text-sm font-medium leading-5 text-zinc-100">{agent.currentTask?.title || 'Chưa có tác vụ đang hoạt động.'}</p>
        {agent.currentTask?.summary && <p className="mt-2 text-xs leading-5 text-zinc-400">{agent.currentTask.summary}</p>}
        {agent.currentTask?.time && <div className="mt-3 flex items-center gap-2 text-[11px] text-zinc-400"><Clock3 size={13} />{agent.currentTask.time}</div>}
      </div>

      {agent.requiresHumanAction && agent.actionPrompt && (
        <div className="mt-4 border border-amber-300/30 bg-amber-300/10 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-300">Cần bạn xử lý</p>
          <p className="mt-1.5 text-xs leading-5 text-amber-50">{agent.actionPrompt}</p>
        </div>
      )}

      {latestCompleted && (
        <div className="mt-4 border-t border-white/10 pt-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-zinc-500">Hoàn thành gần nhất</p>
          <div className="mt-2 flex items-start gap-2 text-xs leading-5 text-zinc-300"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-400" /><span>{latestCompleted.title}</span></div>
        </div>
      )}

      {agent.ctaHref && (
        <Button onClick={() => router.push(agent.ctaHref!)} className="mt-5 w-full rounded-none">
          {agent.ctaText || 'Mở tác vụ'} <ArrowUpRight size={16} />
        </Button>
      )}
    </section>
  );
}
