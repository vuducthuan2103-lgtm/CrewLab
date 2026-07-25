'use client';

import React, { useState } from 'react';
import PortalLayout from '@/components/layout/PortalLayout';
import MediaLibraryGrid from '@/components/assets/MediaLibraryGrid';
import AssetUploadDropzone from '@/components/assets/AssetUploadDropzone';
import { usePortal } from '@/lib/store';
import { ImageIcon, Upload, AlertCircle, Clock } from 'lucide-react';

export default function AssetsPage() {
  const { assetRequests, contentItems } = usePortal();
  const [activeTab, setActiveTab] = useState<'library' | 'requests'>('requests');

  const pendingRequests = assetRequests.filter((r) => r.status === 'pending');

  return (
    <PortalLayout>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-[#D4FF00]/10 border border-[#D4FF00]/30 flex items-center justify-center">
          <ImageIcon size={15} className="text-[#D4FF00]" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">Thư viện ảnh & Yêu cầu ảnh</h1>
          <p className="text-xs text-muted-foreground">Bardinh Coffee</p>
        </div>
        {pendingRequests.length > 0 && (
          <span className="ml-2 text-xs bg-orange-500/10 text-orange-400 border border-orange-500/30 rounded-full px-3 py-1 font-bold">
            {pendingRequests.length} yêu cầu ảnh đang chờ
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 mb-6 border-b border-border">
        {[
          { key: 'requests', label: 'Yêu cầu ảnh từ AI', icon: <AlertCircle size={13} /> },
          { key: 'library', label: 'Thư viện ảnh', icon: <ImageIcon size={13} /> },
        ].map(({ key, label, icon }) => (
          <button
            key={key}
            id={`assets-tab-${key}`}
            onClick={() => setActiveTab(key as 'library' | 'requests')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${
              activeTab === key
                ? 'border-[#D4FF00] text-[#D4FF00]'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {icon} {label}
            {key === 'requests' && pendingRequests.length > 0 && (
              <span className="ml-1 w-4 h-4 rounded-full bg-orange-500 text-white text-[9px] font-bold flex items-center justify-center">
                {pendingRequests.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'requests' && (
        <div>
          {pendingRequests.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-muted/50 border border-border flex items-center justify-center mb-4">
                <Upload size={24} className="text-muted-foreground/50" />
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">Không có yêu cầu ảnh nào</p>
              <p className="text-xs text-muted-foreground">AI sẽ gửi yêu cầu khi cần ảnh thật để hoàn thiện bài đăng.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {pendingRequests.map((req) => {
                const linkedItem = contentItems.find((ci) => ci.id === req.contentItemId);
                return (
                  <div key={req.id} className="border border-orange-500/20 bg-orange-500/5 rounded-2xl overflow-hidden">
                    <div className="flex items-center gap-3 px-5 py-4 border-b border-orange-500/10">
                      <AlertCircle size={15} className="text-orange-400" />
                      <div>
                        <p className="text-sm font-bold text-foreground">
                          AI cần ảnh cho: <span className="text-orange-400">{linkedItem?.title}</span>
                        </p>
                        <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                          <Clock size={10} />
                          Deadline: {req.deadline.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                        </div>
                      </div>
                    </div>
                    <div className="p-5">
                      <AssetUploadDropzone requestId={req.id} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'library' && <MediaLibraryGrid />}
    </PortalLayout>
  );
}
