'use client';

import React from 'react';
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import Sidebar from './Sidebar';
import Header from './Header';
import { usePortal } from '@/lib/store';
import { Button } from '@/components/ui/Button';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { error, isLoading, refreshData } = usePortal();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header />
      <main className="ml-56 pt-14 min-h-screen">
        <div className="p-6">
          {error && (
            <div role="alert" className="mb-4 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
              <AlertCircle size={17} className="shrink-0" />
              <span className="flex-1">Không tải được dữ liệu Portal: {error}</span>
              <Button variant="secondary" size="sm" onClick={() => void refreshData()}>
                <RefreshCw size={13} />
                Thử lại
              </Button>
            </div>
          )}
          {isLoading && !error && (
            <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
              <Loader2 size={14} className="animate-spin" />
              Đang đồng bộ dữ liệu Portal
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
