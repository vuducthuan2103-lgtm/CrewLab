'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/layout/AdminLayout';
import AdminHeader from '@/components/layout/AdminHeader';
import { CLIENTS } from '@/lib/mock-data';
import { getClientHealthBadge, Client } from '@/lib/types';
import {
  Users,
  UserPlus,
  ArrowRight,
  PauseCircle,
  PlayCircle,
  AlertTriangle,
  Clock,
  Search,
  Building2,
  Calendar,
  Layers
} from 'lucide-react';

export default function ClientsPage() {
  const [clientsList, setClientsList] = useState<Client[]>(CLIENTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused'>('all');

  const toggleClientStatus = (id: string) => {
    setClientsList(prev =>
      prev.map(c => {
        if (c.id === id) {
          const nextStatus = c.status === 'active' ? 'paused' : 'active';
          return { ...c, status: nextStatus };
        }
        return c;
      })
    );
  };

  const filteredClients = clientsList.filter(client => {
    const matchesSearch =
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.vertical.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || client.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <AdminLayout>
      <AdminHeader
        title="Danh sách Client F&B"
        subtitle="Quản lý lifecycle khách hàng, trạng thái hoạt động và truy cập Content Monitor"
      />

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Header Action & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Tìm thương hiệu F&B..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-card border border-border text-xs text-foreground placeholder:text-muted-foreground focus-admin transition-all"
              />
            </div>

            <div className="flex items-center bg-card border border-border rounded-xl p-1 text-xs">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  statusFilter === 'all'
                    ? 'bg-muted text-foreground font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Tất cả
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  statusFilter === 'active'
                    ? 'bg-emerald-500/10 text-emerald-400 font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setStatusFilter('paused')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  statusFilter === 'paused'
                    ? 'bg-zinc-500/10 text-zinc-400 font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Paused
              </button>
            </div>
          </div>

          <Link
            href="/onboarding"
            className="py-2.5 px-4 rounded-xl text-xs font-extrabold btn-lime-glow flex items-center justify-center gap-2 self-start sm:self-auto"
          >
            <UserPlus size={14} /> + Onboard Client Mới
          </Link>
        </div>

        {/* Client Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map(client => {
            const healthBadge = getClientHealthBadge(client);

            return (
              <div
                key={client.id}
                className="bg-card rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 relative overflow-hidden"
              >
                {/* Top: Name & Health Indicator */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-lime-tint border border-lime-tint flex items-center justify-center font-bold text-lime-admin text-sm">
                        {client.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-base text-foreground tracking-tight">
                          {client.name}
                        </h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Building2 size={11} className="text-cyan-admin" />
                          {client.vertical}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => toggleClientStatus(client.id)}
                      title={client.status === 'active' ? 'Tạm dừng client' : 'Kích hoạt lại client'}
                      className="text-muted-foreground hover:text-foreground transition-colors p-1"
                    >
                      {client.status === 'active' ? (
                        <PauseCircle size={18} className="text-emerald-400 hover:text-amber-400" />
                      ) : (
                        <PlayCircle size={18} className="text-zinc-500 hover:text-emerald-400" />
                      )}
                    </button>
                  </div>

                  {/* Health status bar */}
                  <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-mono text-[11px]">Trạng thái Pipeline:</span>
                    {healthBadge === 'ok' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Hoạt động tốt
                      </span>
                    )}
                    {healthBadge === 'pending' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 font-mono">
                        <Clock size={11} /> Có bài chờ duyệt
                      </span>
                    )}
                    {healthBadge === 'error' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 font-mono animate-pulse">
                        <AlertTriangle size={11} /> Cần xử lý lỗi
                      </span>
                    )}
                  </div>
                </div>

                {/* Middle Stats */}
                <div className="grid grid-cols-2 gap-2 bg-muted/40 rounded-xl p-3 text-xs font-mono">
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Layers size={10} /> Content Items
                    </p>
                    <p className="font-extrabold text-foreground text-sm">
                      {client.contentItemCount} items
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Calendar size={10} /> Onboard từ
                    </p>
                    <p className="font-medium text-foreground text-xs">
                      {client.onboardedAt.toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                </div>

                {/* Footer Action Link */}
                <div className="pt-2">
                  <Link
                    href={`/clients/${client.id}`}
                    className="w-full py-2 px-3 rounded-xl bg-lime-tint border border-lime-tint text-lime-admin hover:bg-lime-tint-15 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    Xem Content Monitor <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
}
