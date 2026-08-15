'use client';

import React from 'react';
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import Sidebar from './Sidebar';
import Header from './Header';
import { usePortal } from '@/lib/store';
import { shortSupportReference } from '@/lib/api';
import { Button } from '@/components/ui/Button';

export default function PortalLayout({
  children,
  noPadding = false,
}: {
  children: React.ReactNode;
  noPadding?: boolean;
}) {
  const { error, isLoading, refreshData } = usePortal();

  return (
    <div className="h-screen w-screen bg-background overflow-hidden flex">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden ml-[68px] min-w-0">
        <Header />
        <main className="pt-14 flex-1 w-full overflow-hidden flex flex-col min-h-0">
          {error && (
            <div className="p-4 pb-0 shrink-0">
              <div role="alert" className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
                <AlertCircle size={17} className="shrink-0" />
                <span className="flex-1">
                  <span className="block font-medium">Không tải được bảng công việc</span>
                  <span className="block text-xs opacity-90">{error.message}</span>
                  {error.supportReference && (
                    <span className="mt-1 block text-[10px] opacity-75">
                      Mã hỗ trợ: {shortSupportReference(error.supportReference)}
                    </span>
                  )}
                </span>
                {error.retryable && (
                  <Button variant="secondary" size="sm" onClick={() => void refreshData(true)}>
                    <RefreshCw size={13} />
                    Thử lại
                  </Button>
                )}
              </div>
            </div>
          )}
          {isLoading && !error && (
            <div className="p-4 pb-0 flex items-center gap-2 text-xs text-muted-foreground shrink-0" aria-live="polite">
              <Loader2 size={14} className="animate-spin" />
              Đang đồng bộ dữ liệu Portal
            </div>
          )}
          <div className={`flex-1 w-full min-h-0 ${noPadding ? 'p-0 overflow-hidden flex flex-col' : 'p-6 overflow-y-auto'}`}>
            {!isLoading && !error && children}
          </div>
        </main>
      </div>
    </div>
  );
}
