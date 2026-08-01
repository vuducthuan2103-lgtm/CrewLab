'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/layout/AdminLayout';
import AdminHeader from '@/components/layout/AdminHeader';
import AgentCard from '@/components/ui/AgentCard';
import StatsCard from '@/components/ui/StatsCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { AGENTS, CLIENTS, CONTENT_ITEMS, LIVE_AGENT_LOGS } from '@/lib/mock-data';
import { getClientHealthBadge } from '@/lib/types';
import {
  Users,
  Layers,
  AlertTriangle,
  Clock,
  Terminal,
  ArrowRight,
  Play,
  Cpu,
} from 'lucide-react';

export default function DashboardPage() {
  const [selectedAgent, setSelectedAgent] = useState<string>('A01');

  const totalActive = CLIENTS.filter(c => c.status === 'active').length;
  const totalItems = CONTENT_ITEMS.length;
  const pendingItems = CONTENT_ITEMS.filter(c =>
    ['pending_content_approval', 'waiting_asset'].includes(c.state)
  ).length;
  const errorItems = CONTENT_ITEMS.filter(c =>
    ['eval_failed', 'asset_blocked', 'rejected'].includes(c.state)
  ).length;

  return (
    <AdminLayout>
      <AdminHeader
        title="Trung tâm điều khiển"
        subtitle="Giám sát 6 AI Agents, pipeline nội dung & trạng thái client F&B"
      />

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Action bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu size={18} className="text-lime-admin" />
            <span className="text-sm font-bold text-foreground">Phase 1 MVP — 6 Agent Pipeline</span>
          </div>
          <button className="py-2 px-4 rounded-xl text-xs font-extrabold btn-lime-glow flex items-center gap-2">
            <Play size={13} className="fill-black" /> Trigger Pipeline Test
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            icon={<Users size={16} />}
            label="Client F&B đang hoạt động"
            value={totalActive}
            trend="2 mới tháng này"
            trendUp
            accentColor="lime"
          />
          <StatsCard
            icon={<Layers size={16} />}
            label="Content items trong pipeline"
            value={totalItems}
            accentColor="cyan"
          />
          <StatsCard
            icon={<Clock size={16} />}
            label="Đang chờ duyệt / chờ ảnh"
            value={pendingItems}
            accentColor="amber"
          />
          <StatsCard
            icon={<AlertTriangle size={16} />}
            label="Cần xử lý (lỗi / fail)"
            value={errorItems}
            accentColor={errorItems > 0 ? 'red' : 'emerald'}
          />
        </div>

        {/* 6 Agent Status Grid */}
        <div>
          <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-admin animate-pulse" />
            6 AI Agents Status
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {AGENTS.map(agent => (
              <AgentCard
                key={agent.code}
                agent={agent}
                selected={selectedAgent === agent.code}
                onClick={() => setSelectedAgent(agent.code)}
              />
            ))}
          </div>
        </div>

        {/* Bottom split: Client Overview + Terminal */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Client Overview Table */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Users size={14} className="text-lime-admin" />
                Tổng quan Client F&B
              </h2>
              <Link
                href="/clients"
                className="text-xs text-lime-admin font-bold flex items-center gap-1 hover:underline"
              >
                Xem tất cả <ArrowRight size={12} />
              </Link>
            </div>

            <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="px-4 py-3">Thương hiệu</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3">Content items</th>
                    <th className="px-4 py-3 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {CLIENTS.map(client => {
                    const badge = getClientHealthBadge(client);
                    return (
                      <tr key={client.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3.5">
                          <p className="font-bold text-foreground">{client.name}</p>
                          <p className="text-[10px] text-muted-foreground">{client.vertical}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          {badge === 'ok' && (
                            <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold">
                              <span className="w-2 h-2 rounded-full bg-emerald-400" />
                              Bình thường
                            </span>
                          )}
                          {badge === 'pending' && (
                            <span className="inline-flex items-center gap-1.5 text-yellow-400 font-bold">
                              <span className="w-2 h-2 rounded-full bg-yellow-400" />
                              Chờ duyệt
                            </span>
                          )}
                          {badge === 'error' && (
                            <span className="inline-flex items-center gap-1.5 text-red-400 font-bold">
                              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                              Lỗi cần xử lý
                            </span>
                          )}
                          {client.status === 'paused' && (
                            <span className="inline-flex items-center gap-1.5 text-zinc-500 font-bold ml-2">
                              (Tạm dừng)
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-muted-foreground">
                          {client.contentItemCount} items
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <Link
                            href={`/clients/${client.id}`}
                            className="text-xs text-lime-admin font-bold hover:underline flex items-center justify-end gap-1"
                          >
                            Vào Client <ArrowRight size={12} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Live Agent Terminal */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Terminal size={14} className="text-cyan-admin" />
                Live Agent Terminal
              </h2>
              <span className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-cyan-admin">
                <span className="w-2 h-2 rounded-full bg-cyan-admin animate-pulse" />
                Streaming
              </span>
            </div>

            <div className="terminal p-0 shadow-lg h-[400px] overflow-hidden flex flex-col">
              {/* Terminal header — always dark */}
              <div className="terminal-header flex-shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="terminal-dot bg-red-500" />
                  <span className="terminal-dot bg-yellow-500" />
                  <span className="terminal-dot bg-emerald-500" />
                </div>
                <span className="text-zinc-600 font-mono text-[10px]">task_logs stream • MVP-v3.5</span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {LIVE_AGENT_LOGS.map((log, i) => (
                  <div key={i} className="space-y-1 text-[11px] leading-relaxed border-b border-zinc-900/60 pb-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-600">[{log.time}]</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        log.type === 'SUCCESS' ? 'bg-emerald-950 text-emerald-400' :
                        log.type === 'FSM' ? 'bg-cyan-950 text-cyan-400' :
                        log.type === 'WARN' ? 'bg-orange-950 text-orange-400' :
                        'bg-zinc-900 text-[#D4FF00]'
                      }`}>
                        {log.agent} • {log.type}
                      </span>
                    </div>
                    <p className="text-zinc-400 pl-2 border-l border-zinc-800">{log.msg}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </AdminLayout>
  );
}
