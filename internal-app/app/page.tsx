'use client';

import React from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/layout/AdminLayout';
import AdminHeader from '@/components/layout/AdminHeader';
import { CLIENTS } from '@/lib/mock-data';
import { Plus, Settings, DollarSign } from 'lucide-react';

export default function ClientsPage() {
  return (
    <AdminLayout>
      <AdminHeader
        title="Clients"
        subtitle="Quản lý khách hàng F&B trên hệ thống"
      />
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex justify-end mb-6">
          <Link
            href="/onboarding"
            className="flex items-center gap-2 bg-lime-admin text-black px-4 py-2 rounded-lg font-bold text-sm shadow-glow-lime-sm hover:opacity-90 transition-opacity"
          >
            <Plus size={16} />
            Onboard Mới
          </Link>
        </div>

        <div className="space-y-4">
          {CLIENTS.map((client) => {
            const budgetPercent = (client.budgetUsed / client.budgetTotal) * 100;
            let statusBadge = '';
            let badgeClass = '';

            if (budgetPercent < 80) {
              statusBadge = '🟢';
              badgeClass = 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
            } else if (budgetPercent < 100) {
              statusBadge = '🟡';
              badgeClass = 'bg-yellow-500/10 text-yellow-600 border border-yellow-500/20';
            } else {
              statusBadge = '🔴';
              badgeClass = 'bg-red-500/10 text-red-500 border border-red-500/20';
            }

            const isNearLimit = budgetPercent >= 80 && budgetPercent < 100;

            return (
              <div key={client.id} className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm">{statusBadge}</span>
                    <h3 className="font-bold text-lg text-foreground">{client.name}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {client.vertical} · {client.platforms.map(p => p.toUpperCase()).join(' + ')}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      Chi phí tháng này: ${client.budgetUsed.toFixed(2)} / ${client.budgetTotal.toFixed(2)} ({budgetPercent.toFixed(0)}%)
                    </span>
                    {isNearLimit && (
                      <span className="text-xs font-bold text-yellow-600 bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20">
                        — sắp hết!
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Link
                    href={`/ai-costs/${client.id}`}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-border bg-muted/30 hover:bg-muted/60 transition-colors text-foreground"
                  >
                    <DollarSign size={16} className="text-lime-admin" />
                    Xem Chi Phí
                  </Link>
                  <button
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-border bg-muted/30 hover:bg-muted/60 transition-colors text-foreground"
                    title="Chỉnh sửa (Mock)"
                  >
                    <Settings size={16} className="text-cyan-admin" />
                    Sửa Cấu Hình
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
}
