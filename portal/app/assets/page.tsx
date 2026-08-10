'use client';

import React, { useEffect } from 'react';
import { AlertCircle, ImageIcon, Loader2, RefreshCw } from 'lucide-react';

import MediaLibraryGrid from '@/components/assets/MediaLibraryGrid';
import PortalLayout from '@/components/layout/PortalLayout';
import { Button } from '@/components/ui/Button';
import { shortSupportReference } from '@/lib/api';
import { usePortal } from '@/lib/store';

export default function AssetsPage() {
  const { assetsStatus, assetsError, mediaAssets, loadAssets } = usePortal();

  useEffect(() => {
    void loadAssets();
  }, [loadAssets]);

  useEffect(() => {
    if (!mediaAssets.some((asset) => asset.indexingStatus === 'processing')) return;
    const timer = window.setInterval(() => void loadAssets(true), 5000);
    return () => window.clearInterval(timer);
  }, [loadAssets, mediaAssets]);

  return (
    <PortalLayout>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-accent-tint border border-accent-tint flex items-center justify-center">
          <ImageIcon size={15} className="text-lime-brand" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">Thư viện ảnh</h1>
          <p className="text-xs text-muted-foreground">Ảnh tải lên được xử lý nền để D02 tìm và chỉnh sửa.</p>
        </div>
      </div>

      {assetsStatus === 'loading' && (
        <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
          <Loader2 size={14} className="animate-spin" /> Đang tải thư viện ảnh…
        </div>
      )}
      {assetsError && (
        <div role="alert" className="mb-4 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
          <AlertCircle size={17} className="shrink-0" />
          <span className="flex-1">
            <span className="block font-medium">Không tải được dữ liệu hình ảnh</span>
            <span className="block text-xs">{assetsError.message}</span>
            {assetsError.supportReference && <span className="mt-1 block text-[10px] opacity-75">Mã hỗ trợ: {shortSupportReference(assetsError.supportReference)}</span>}
          </span>
          {assetsError.retryable && <Button variant="secondary" size="sm" onClick={() => void loadAssets(true)}><RefreshCw size={13} />Thử lại</Button>}
        </div>
      )}
      {assetsStatus === 'ready' && <MediaLibraryGrid />}
    </PortalLayout>
  );
}
