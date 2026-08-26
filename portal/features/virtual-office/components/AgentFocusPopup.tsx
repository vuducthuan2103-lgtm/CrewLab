'use client';

import { ArrowUpRight, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getStatePresentation } from '../config/agent-state-map';
import { useOfficeStore } from '../state/office-store';

export function AgentFocusPopup() {
  const router = useRouter();
  const selectedAgentCode = useOfficeStore((s) => s.selectedAgentCode);
  const agents = useOfficeStore((s) => s.agents);
  const closeDetail = useOfficeStore((s) => s.closeDetail);
  if (!selectedAgentCode) return null;
  const agent = agents[selectedAgentCode];
  if (!agent) return null;
  const state = getStatePresentation(agent.visualState);
  const name = agent.displayName.replace(/^\w+\s+—\s+/, '');
  return <section aria-label={`Thông tin ${name}`} className="fixed bottom-5 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-3xl border border-white/15 bg-[#101111]/95 p-5 text-zinc-100 shadow-2xl backdrop-blur-xl md:bottom-8 md:left-auto md:right-8 md:w-[26rem] md:translate-x-0">
    <div className="flex items-start justify-between gap-4"><div><p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#D4FF00]">{agent.code}</p><h2 className="mt-1 text-xl font-semibold tracking-tight text-white">{name}</h2><p className="mt-1 text-sm text-zinc-400">{agent.role}</p></div><button aria-label="Đóng thông tin agent" onClick={closeDetail} className="rounded-xl p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D4FF00]"><X size={18} /></button></div>
    <div className="mt-5 flex items-center gap-2 text-sm"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: state.dotColor }} /><span className="font-medium">{state.labelVi}</span></div><p className="mt-3 text-sm leading-6 text-zinc-300">{agent.currentTask?.title || 'Chưa có tác vụ đang hoạt động.'}</p>
    {agent.requiresHumanAction && agent.actionPrompt && <p className="mt-3 rounded-2xl border border-amber-400/25 bg-amber-400/10 p-3 text-sm leading-5 text-amber-100">{agent.actionPrompt}</p>}
    {agent.ctaHref && <button onClick={() => router.push(agent.ctaHref!)} className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#D4FF00] px-4 text-sm font-semibold text-[#09090B] transition hover:bg-[#E5FF55] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4FF00]">{agent.ctaText || 'Mở tác vụ'} <ArrowUpRight size={16} /></button>}
  </section>;
}
