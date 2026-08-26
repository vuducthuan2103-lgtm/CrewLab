'use client';

import React from 'react';
import Image from 'next/image';
import { useOfficeStore } from '../state/office-store';
import type { AgentCode } from '../types/office';
import { getStatePresentation } from '../config/agent-state-map';

const HOTSPOTS: Record<AgentCode, { left: string; top: string; role: string }> = {
  B02: { left: '25%', top: '32%', role: 'Chiến lược nội dung' },
  B03: { left: '69%', top: '31%', role: 'Lịch xuất bản' },
  A01: { left: '48%', top: '45%', role: 'Điều phối trung tâm' },
  D01: { left: '18%', top: '53%', role: 'Viết nội dung' },
  D02: { left: '77%', top: '53%', role: 'Thiết kế hình ảnh' },
  E01: { left: '49%', top: '74%', role: 'Kiểm duyệt' },
};

const AGENT_ORDER = Object.keys(HOTSPOTS) as AgentCode[];

export function OfficeCanvas() {
  const agents = useOfficeStore((state) => state.agents);
  const selectedAgentCode = useOfficeStore((state) => state.selectedAgentCode);
  const selectAgent = useOfficeStore((state) => state.selectAgent);
  const setHoveredAgent = useOfficeStore((state) => state.setHoveredAgent);

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#0b100d]">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative h-full w-full overflow-hidden">
          <Image
            src="/virtual-office/crewlab-garden-campus.png"
            alt="Khuôn viên văn phòng CrewLab với sáu bàn làm việc quanh cây xanh trung tâm"
            fill
            priority
            sizes="100vw"
            className="select-none object-cover object-center"
            draggable={false}
          />
          <div className="pointer-events-none absolute inset-0 bg-black/10 shadow-[inset_0_120px_100px_-80px_rgba(0,0,0,0.72),inset_0_-100px_90px_-70px_rgba(0,0,0,0.62)]" />

          {AGENT_ORDER.map((code) => {
            const agent = agents[code];
            if (!agent) return null;
            const position = HOTSPOTS[code];
            const presentation = getStatePresentation(agent.visualState);
            const selected = selectedAgentCode === code;

            return (
              <button
                key={code}
                type="button"
                data-testid={`office-agent-${code}`}
                aria-label={`${code}, ${position.role}, ${presentation.labelVi}`}
                aria-pressed={selected}
                onClick={() => selectAgent(code)}
                onMouseEnter={() => setHoveredAgent(code)}
                onMouseLeave={() => setHoveredAgent(null)}
                className="group absolute z-20 -translate-x-1/2 -translate-y-1/2 text-left focus-visible:outline-none"
                style={{ left: position.left, top: position.top }}
              >
                <span
                  aria-hidden="true"
                  className={`absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border transition duration-200 group-hover:scale-110 ${
                    selected
                      ? 'border-[#D4FF00] bg-[#D4FF00]/20 shadow-[0_0_0_6px_rgba(212,255,0,0.12),0_0_28px_rgba(212,255,0,0.38)]'
                      : 'border-white/0 bg-white/0 group-hover:border-white/70 group-hover:bg-white/10'
                  }`}
                />
                <span
                  className={`relative flex min-w-[132px] items-center gap-2 border bg-[#101511]/92 px-3 py-2 text-white shadow-[0_10px_32px_rgba(0,0,0,0.34)] backdrop-blur-md transition duration-200 group-hover:-translate-y-0.5 group-hover:border-white/40 ${
                    selected ? 'border-[#D4FF00]/80' : 'border-white/20'
                  }`}
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full shadow-[0_0_10px_currentColor]"
                    style={{ backgroundColor: presentation.dotColor, color: presentation.dotColor }}
                  />
                  <span className="min-w-0">
                    <span className="block font-mono text-[10px] font-semibold tracking-[0.12em] text-[#D4FF00]">{code}</span>
                    <span className="block truncate text-[11px] font-medium leading-4 text-zinc-100">{position.role}</span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
