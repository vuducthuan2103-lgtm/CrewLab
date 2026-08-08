'use client';

import React, { useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import AdminHeader from '@/components/layout/AdminHeader';
import { TASK_LOGS, CLIENTS, AGENTS } from '@/lib/mock-data';
import { AgentCode } from '@/lib/types';
import {
  ScrollText,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Database,
  Terminal,
  Cpu
} from 'lucide-react';

export default function TaskLogsPage() {
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLogs = TASK_LOGS.filter(log => {
    const matchesClient = selectedClient === 'all' || log.clientId === selectedClient;
    const matchesAgent = selectedAgent === 'all' || log.agentCode === selectedAgent;
    const matchesStatus = selectedStatus === 'all' || log.status === selectedStatus;
    const matchesSearch =
      log.taskType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.modelUsed.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.contentItemTitle && log.contentItemTitle.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesClient && matchesAgent && matchesStatus && matchesSearch;
  });

  return (
    <AdminLayout>
      <AdminHeader
        title="Nhật ký Execution (Task Logs)"
        subtitle="Theo dõi chi tiết execution log của Postgres task_logs (§1d Observability)"
      />

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/* Filters Bar */}
        <div className="bg-card rounded-2xl border border-border p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-foreground">
            <Filter size={14} className="text-cyan-admin" /> Bộ lọc Task Logs
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Client Select */}
            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">Client F&B:</label>
              <select
                value={selectedClient}
                onChange={e => setSelectedClient(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-foreground font-mono text-xs focus-admin outline-none"
              >
                <option value="all">Tất cả Clients</option>
                {CLIENTS.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Agent Code Select */}
            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">Agent Code:</label>
              <select
                value={selectedAgent}
                onChange={e => setSelectedAgent(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-foreground font-mono text-xs focus-admin outline-none"
              >
                <option value="all">Tất cả 6 Agents</option>
                {AGENTS.map(a => (
                  <option key={a.code} value={a.code}>{a.code} — {a.name}</option>
                ))}
              </select>
            </div>

            {/* Status Select */}
            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">Trạng thái Task:</label>
              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-foreground font-mono text-xs focus-admin outline-none"
              >
                <option value="all">Tất cả Status</option>
                <option value="success">Success ✓</option>
                <option value="running">Running ⏳</option>
                <option value="failed">Failed ✕</option>
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">Tìm kiếm Task:</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Loại task, model..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-muted border border-border text-foreground text-xs placeholder:text-muted-foreground focus-admin outline-none"
                />
                <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>
        </div>

        {/* Task Logs Table (Dark Terminal Aesthetic) */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          <div className="px-4 py-3 bg-muted/50 border-b border-border flex items-center justify-between text-xs font-mono">
            <span className="text-muted-foreground flex items-center gap-2">
              <Database size={13} className="text-cyan-admin" /> Table: task_logs ({filteredLogs.length} entries)
            </span>
            <span className="text-lime-admin">MVP-v3.5 Scope</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-muted/30 text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Agent</th>
                  <th className="px-4 py-3">Task Type</th>
                  <th className="px-4 py-3">Model</th>
                  <th className="px-4 py-3">Tokens (In/Out)</th>
                  <th className="px-4 py-3">Latency</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                      Không tìm thấy log phù hợp với bộ lọc
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map(log => (
                    <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground">
                        {log.createdAt.toLocaleTimeString('vi-VN')}
                      </td>
                      <td className="px-4 py-3 font-bold text-foreground">
                        {log.clientName}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-tint text-cyan-admin border border-cyan-tint">
                          {log.agentCode}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {log.taskType}
                        {log.contentItemTitle && (
                          <span className="block text-[10px] text-muted-foreground font-sans">
                            Item: {log.contentItemTitle}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {log.modelUsed}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {log.tokensIn} / {log.tokensOut}
                      </td>
                      <td className="px-4 py-3 text-amber-400">
                        {log.latencyMs}ms
                      </td>
                      <td className="px-4 py-3">
                        {log.status === 'success' && (
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 size={12} /> Success
                          </span>
                        )}
                        {log.status === 'running' && (
                          <span className="text-cyan-400 font-bold flex items-center gap-1">
                            <Clock size={12} className="animate-spin" /> Running
                          </span>
                        )}
                        {log.status === 'failed' && (
                          <span className="text-red-400 font-bold flex items-center gap-1">
                            <XCircle size={12} /> Failed
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-400">
                        {log.evalScore !== null ? `${log.evalScore}/10` : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </AdminLayout>
  );
}
