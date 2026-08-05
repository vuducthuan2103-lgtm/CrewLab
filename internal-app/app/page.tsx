'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Settings } from 'lucide-react';

import AdminLayout from '@/components/layout/AdminLayout';
import AdminHeader from '@/components/layout/AdminHeader';
import { AdminClient, apiListClients } from '@/lib/api';

export default function ClientsPage() {
  const [clients, setClients] = useState<AdminClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiListClients()
      .then(setClients)
      .catch((requestError) =>
        setError(requestError instanceof Error ? requestError.message : 'Không tải được clients'),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminLayout>
      <AdminHeader title="Clients" subtitle="Quản lý khách hàng và provider theo từng client" />
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-6 flex justify-end">
          <Link
            href="/onboarding"
            className="flex items-center gap-2 rounded-lg bg-lime-admin px-4 py-2 text-sm font-bold text-black shadow-glow-lime-sm hover:opacity-90"
          >
            <Plus size={16} /> Onboard mới
          </Link>
        </div>

        {loading && <p className="text-sm text-muted-foreground">Đang tải clients...</p>}
        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
            {error}
          </div>
        )}
        {!loading && !error && clients.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Chưa có client. Hãy bắt đầu onboarding client test đầu tiên.
          </div>
        )}

        <div className="space-y-4">
          {clients.map((client) => (
            <div
              key={client.id}
              className="flex flex-col justify-between gap-4 rounded-xl border border-border bg-card p-5 shadow-sm md:flex-row md:items-center"
            >
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${client.is_active ? 'bg-emerald-400' : 'bg-amber-400'}`}
                  />
                  <h3 className="text-lg font-bold text-foreground">{client.brand_name}</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  {client.industry || 'Chưa chọn ngành'} · {client.platforms.join(' + ') || 'Chưa chọn nền tảng'}
                </p>
                <p className="mt-2 text-xs font-semibold text-muted-foreground">
                  {client.is_active ? 'Đang hoạt động' : 'Chưa kích hoạt'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/onboarding?clientId=${client.id}`}
                  className="flex items-center justify-center gap-2 rounded-lg border border-border bg-muted/30 px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/60"
                >
                  <Settings size={16} className="text-cyan-admin" />
                  Provider & API key
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
