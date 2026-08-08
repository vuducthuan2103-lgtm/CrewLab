'use client';

import React, { useRef, useState } from 'react';
import { usePortal } from '@/lib/store';
import { MediaAsset, AssetSource } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { X, Tag, Info, Trash2, Search, Upload, Loader2 } from 'lucide-react';

type FilterTab = 'all' | 'ai_generated' | 'real_photo' | 'pending_review';

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'real_photo', label: 'Ảnh thật' },
  { key: 'ai_generated', label: 'AI tạo' },
  { key: 'pending_review', label: 'Chờ duyệt' },
];

const SOURCE_BADGES: Record<AssetSource, { label: string; class: string }> = {
  real_photo: { label: 'Ảnh thật', class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  ai_generated: { label: 'AI tạo', class: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  pending_review: { label: 'Chờ duyệt', class: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
};

function AssetDetailPanel({ asset, onClose }: { asset: MediaAsset; onClose: () => void }) {
  const badge = SOURCE_BADGES[asset.source];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Info size={14} className="text-lime-brand" />
            <span className="text-sm font-bold">Chi tiết ảnh</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
        </div>
        <div className="p-5">
          <img src={asset.url} alt="" className="w-full h-48 object-cover rounded-xl border border-border mb-4" />
          <div className="space-y-2.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs">Nguồn</span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badge.class}`}>{badge.label}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs">Upload lúc</span>
              <span className="text-xs text-foreground">
                {asset.uploadedAt.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </span>
            </div>
            {asset.usedInItems.length > 0 && (
              <div className="flex items-start justify-between gap-2">
                <span className="text-muted-foreground text-xs flex-shrink-0">Dùng trong bài</span>
                <span className="text-xs text-foreground text-right">{asset.usedInItems.join(', ')}</span>
              </div>
            )}
            {asset.notes && (
              <div className="p-3 bg-muted/30 rounded-lg border border-border">
                <p className="text-xs text-muted-foreground">{asset.notes}</p>
              </div>
            )}
            {asset.tags.length > 0 && (
              <div>
                <p className="text-muted-foreground text-xs mb-1.5 flex items-center gap-1"><Tag size={10} /> Tags AI</p>
                <div className="flex flex-wrap gap-1">
                  {asset.tags.map((tag) => (
                    <span key={tag} className="text-[10px] bg-muted text-muted-foreground rounded-full px-2 py-0.5 border border-border">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={onClose} className="flex-1 py-2 border border-border text-xs font-medium text-muted-foreground rounded-lg hover:bg-muted/50 transition-colors">
              Đóng
            </button>
            <button className="flex items-center gap-1 px-3 py-2 border border-red-500/30 text-red-400 text-xs font-medium rounded-lg hover:bg-red-500/5 transition-colors">
              <Trash2 size={12} /> Xóa
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MediaLibraryGrid() {
  const { mediaAssets, uploadAsset } = usePortal();
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = mediaAssets.filter((a) => {
    const matchFilter = activeFilter === 'all' || a.source === activeFilter;
    const matchSearch =
      search === '' ||
      a.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    return matchFilter && matchSearch;
  });

  const badgeCounts = {
    all: mediaAssets.length,
    real_photo: mediaAssets.filter((a) => a.source === 'real_photo').length,
    ai_generated: mediaAssets.filter((a) => a.source === 'ai_generated').length,
    pending_review: mediaAssets.filter((a) => a.source === 'pending_review').length,
  };

  const handleUploadFiles = (files: FileList | null) => {
    if (!files?.length || uploading) return;
    const selectedFiles = Array.from(files);
    const invalidType = selectedFiles.find((file) => !ACCEPTED_IMAGE_TYPES.includes(file.type));
    if (invalidType) {
      setUploadError('Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP.');
      return;
    }
    const tooLarge = selectedFiles.find((file) => file.size > MAX_UPLOAD_BYTES);
    if (tooLarge) {
      setUploadError('Mỗi ảnh tối đa 50 MB.');
      return;
    }

    setUploading(true);
    setUploadError(null);
    void (async () => {
      try {
        for (const file of selectedFiles) await uploadAsset(file);
      } catch (cause) {
        setUploadError(cause instanceof Error ? cause.message : 'Không thể tải ảnh lên.');
      } finally {
        setUploading(false);
      }
    })();
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        {/* Filter tabs */}
        <div className="flex items-center gap-1 border border-border rounded-lg p-1">
          {FILTER_TABS.map(({ key, label }) => (
            <button
              key={key}
              id={`media-filter-${key}`}
              onClick={() => setActiveFilter(key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${
                activeFilter === key
                  ? 'bg-lime-brand font-bold shadow-accent-glow'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              {label}
              <span className={`rounded-full px-1 text-[9px] ${activeFilter === key ? 'bg-black/10' : 'bg-muted'}`}>
                {badgeCounts[key]}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tag…"
            className="w-full pl-8 pr-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary"
          />
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(event) => {
            handleUploadFiles(event.target.files);
            event.target.value = '';
          }}
        />
        <Button
          id="media-library-upload-btn"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="ml-auto"
        >
          {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
          {uploading ? 'Đang tải...' : 'Tải ảnh lên'}
        </Button>
      </div>
      {uploadError && <p className="mb-4 text-xs text-red-400">{uploadError}</p>}

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {filtered.map((asset) => {
          const badge = SOURCE_BADGES[asset.source];
          return (
            <button
              key={asset.id}
              id={`media-asset-${asset.id}`}
              onClick={() => setSelectedAsset(asset)}
              className="group relative rounded-xl overflow-hidden border border-border hover:border-lime-brand transition-all hover:shadow-accent-glow text-left"
            >
              <div className="aspect-square overflow-hidden">
                <img
                  src={asset.thumbnailUrl}
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
              </div>
              {/* Source badge */}
              <div className="absolute top-1.5 left-1.5">
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border backdrop-blur-sm ${badge.class}`}>
                  {badge.label}
                </span>
              </div>
              {/* Tags overlay */}
              {asset.tags.length > 0 && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-[9px] text-white/90 truncate">
                    {asset.tags.slice(0, 3).join(' · ')}
                  </p>
                </div>
              )}
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full py-12 text-center text-sm text-muted-foreground">
            Không có ảnh nào
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selectedAsset && (
        <AssetDetailPanel asset={selectedAsset} onClose={() => setSelectedAsset(null)} />
      )}
    </div>
  );
}
