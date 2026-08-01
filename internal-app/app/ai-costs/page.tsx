'use client';

import React from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/layout/AdminLayout';
import AdminHeader from '@/components/layout/AdminHeader';
import { CLIENTS } from '@/lib/mock-data';
import { ArrowRight, AlertTriangle } from 'lucide-react';

export default function AICostsPage() {
  const totalBudget = CLIENTS.reduce((acc, client) => acc + client.budgetTotal, 0);
  const totalUsed = CLIENTS.reduce((acc, client) => acc + client.budgetUsed, 0);
  const totalPercent = (totalUsed / totalBudget) * 100;

  return (
    <AdminLayout>
      <AdminHeader
        title="Chi phí AI"
        subtitle="Tổng quan chi phí tất cả client"
      />
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        
        {/* TỔNG CHI PHÍ */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tổng chi phí tất cả Client</h2>
            <select className="bg-muted/30 border border-border rounded px-2 py-1 text-xs text-foreground outline-none">
              <option>Tháng 8/2026</option>
              <option>Tháng 7/2026</option>
            </select>
          </div>
          <div className="text-3xl font-extrabold text-foreground mb-2">
            ${totalUsed.toFixed(2)} <span className="text-lg text-muted-foreground font-medium">/ ${totalBudget.toFixed(2)}</span>
          </div>
          <div className="text-sm font-bold text-lime-admin mb-4">{totalPercent.toFixed(1)}%</div>
          
          <div className="w-full bg-muted/50 rounded-full h-3 mb-6 overflow-hidden">
            <div className="bg-lime-admin h-3 rounded-full" style={{ width: `${Math.min(totalPercent, 100)}%` }} />
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Anthropic</p>
              <p className="font-bold text-foreground">${(totalUsed * 0.71).toFixed(2)} <span className="text-xs text-muted-foreground font-normal">(71%)</span></p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">OpenAI</p>
              <p className="font-bold text-foreground">${(totalUsed * 0.29).toFixed(2)} <span className="text-xs text-muted-foreground font-normal">(29%)</span></p>
            </div>
          </div>
        </div>

        {/* PER CLIENT */}
        <div>
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Per Client</h2>
          <div className="space-y-3">
            {CLIENTS.map((client) => {
              const budgetPercent = (client.budgetUsed / client.budgetTotal) * 100;
              let statusBadge = '';
              let barColor = 'bg-lime-admin';

              if (budgetPercent < 80) {
                statusBadge = '🟢';
              } else if (budgetPercent < 100) {
                statusBadge = '🟡';
                barColor = 'bg-yellow-500';
              } else {
                statusBadge = '🔴';
                barColor = 'bg-red-500';
              }

              return (
                <div key={client.id} className="bg-card border border-border rounded-xl p-4 shadow-sm flex items-center justify-between gap-4 hover:border-lime-admin/50 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-bold text-foreground text-sm">{client.name}</div>
                      <div className="text-xs font-medium text-foreground flex items-center gap-2">
                        ${client.budgetUsed.toFixed(2)} / ${client.budgetTotal.toFixed(2)} ({budgetPercent.toFixed(0)}%)
                        <span>{statusBadge}</span>
                      </div>
                    </div>
                    <div className="w-full bg-muted/50 rounded-full h-1.5 overflow-hidden">
                      <div className={`${barColor} h-1.5 rounded-full`} style={{ width: `${Math.min(budgetPercent, 100)}%` }} />
                    </div>
                  </div>
                  <Link
                    href={`/ai-costs/${client.id}`}
                    className="flex-shrink-0 text-xs text-cyan-admin font-bold flex items-center gap-1 hover:underline"
                  >
                    Chi tiết <ArrowRight size={12} />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        {/* CẢNH BÁO */}
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex gap-3">
          <AlertTriangle size={18} className="text-yellow-500 flex-shrink-0" />
          <div>
            <h3 className="font-bold text-yellow-600 text-sm mb-1">CẢNH BÁO</h3>
            <p className="text-xs text-yellow-600/80 mb-2">Cafe XYZ — đã dùng 90% ngân sách tháng này. Còn $3.00</p>
            <Link href="/ai-costs/client-002" className="text-xs font-bold text-yellow-600 underline">Tăng ngân sách →</Link>
          </div>
        </div>

      </div>
    </AdminLayout>
  );
}
