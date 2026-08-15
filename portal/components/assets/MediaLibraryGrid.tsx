'use client';

import React, { useRef, useState } from 'react';
import { usePortal } from '@/lib/store';
import { toast } from '@/components/ui/Toast';
import { MediaAsset, AssetSource } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import {
  X, Tag, Info, Search, Upload, Loader2, Trash2, Edit2, Plus, Check, AlertTriangle,
} from 'lucide-react';

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

const INDEXING_LABELS: Record<NonNullable<MediaAsset['indexingStatus']>, string> = {
  processing: 'Đang phân tích ảnh',
  ready: 'Sẵn sàng cho D02',
  needs_attention: 'Cần kiểm tra',
  failed: 'Xử lý thất bại',
  superseded: 'Đã được thay thế',
};

// ─── Delete Confirmation Modal ───────────────────────────────────────────────
function DeleteConfirmModal({
  isOpen,
  isDeleting,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center gap-3 mb-3 text-red-400">
          <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
            <AlertTriangle size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Xác nhận xóa ảnh</h3>
            <p className="text-xs text-muted-foreground">Hành động này không thể hoàn tác.</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
          Ảnh này sẽ bị xóa vĩnh viễn khỏi thư viện thương hiệu và bộ nhớ lưu trữ.
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={isDeleting}>
            Hủy
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white font-medium"
          >
            {isDeleting ? <Loader2 size={13} className="animate-spin mr-1" /> : <Trash2 size={13} className="mr-1" />}
            {isDeleting ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Asset Detail & Edit Modal ──────────────────────────────────────────────
function AssetDetailPanel({
  asset,
  onClose,
  onDeleteRequested,
}: {
  asset: MediaAsset;
  onClose: () => void;
  onDeleteRequested: (asset: MediaAsset) => void;
}) {
  const { updateAsset } = usePortal();
  const badge = SOURCE_BADGES[asset.source];

  // Editable states
  const [description, setDescription] = useState(asset.notes || '');
  const [tags, setTags] = useState<string[]>(asset.tags || []);
  const [newTagInput, setNewTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isEditingDesc, setIsEditingDesc] = useState(false);

  const hasChanges = description !== (asset.notes || '') || JSON.stringify(tags) !== JSON.stringify(asset.tags || []);

  const handleAddTag = () => {
    const trimmed = newTagInput.trim();
    if (!trimmed) return;
    if (!tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleKeyDownTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateAsset(asset.id, {
        notes: description,
        tags,
      });
      toast.success('Đã lưu thay đổi!', 'Mô tả và tags của ảnh đã được cập nhật.');
      setIsEditingDesc(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể lưu thay đổi.';
      toast.error('Lỗi khi lưu', msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Info size={14} className="text-lime-brand" />
            <span className="text-sm font-bold">Chi tiết & Chỉnh sửa ảnh</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          <div className="relative rounded-xl overflow-hidden border border-border bg-black/40">
            <img src={asset.url} alt="" className="w-full max-h-56 object-contain mx-auto" />
          </div>

          <div className="space-y-3 text-sm">
            {/* Meta row */}
            <div className="grid grid-cols-2 gap-2 text-xs bg-muted/20 p-3 rounded-xl border border-border">
              <div>
                <span className="text-muted-foreground block text-[11px]">Nguồn</span>
                <span className={`inline-block mt-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badge.class}`}>
                  {badge.label}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Upload lúc</span>
                <span className="text-foreground font-medium">
                  {asset.uploadedAt.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">D02 indexing</span>
                <span className="text-foreground font-medium">
                  {INDEXING_LABELS[asset.indexingStatus || 'processing']}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">D02 sử dụng</span>
                <span className={`font-medium ${asset.readyForD02 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {asset.readyForD02 ? 'Đủ điều kiện' : 'Chưa đủ điều kiện'}
                </span>
              </div>
            </div>

            {asset.indexingReason && (
              <p className="text-xs text-amber-400 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                {asset.indexingReason}
              </p>
            )}

            {/* Editable Description */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-muted-foreground text-xs font-medium flex items-center gap-1">
                  <Edit2 size={11} className="text-primary" /> Mô tả ảnh / Ghi chú AI
                </span>
                {!isEditingDesc && (
                  <button
                    onClick={() => setIsEditingDesc(true)}
                    className="text-[11px] text-lime-brand hover:underline font-medium"
                  >
                    Chỉnh sửa
                  </button>
                )}
              </div>
              {isEditingDesc ? (
                <div className="space-y-2">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Nhập mô tả chi tiết hình ảnh để AI D02 hiểu và sử dụng..."
                    rows={3}
                    className="w-full p-2.5 bg-background border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary resize-none"
                  />
                  <div className="flex justify-end gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDescription(asset.notes || '');
                        setIsEditingDesc(false);
                      }}
                      className="text-[11px] h-7 px-2"
                    >
                      Đóng
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-muted/30 rounded-xl border border-border text-xs text-muted-foreground">
                  {description ? description : <span className="italic text-muted-foreground/60">Chưa có mô tả chi tiết.</span>}
                </div>
              )}
            </div>

            {/* Editable Tags AI */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-muted-foreground text-xs font-medium flex items-center gap-1">
                  <Tag size={11} className="text-primary" /> Tags AI / Phân loại ({tags.length})
                </span>
              </div>

              {/* Tag Chips */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 text-[11px] bg-muted text-foreground rounded-full px-2.5 py-0.5 border border-border group"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="text-muted-foreground hover:text-red-400 transition-colors"
                      title="Xóa tag"
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
                {tags.length === 0 && (
                  <span className="text-xs italic text-muted-foreground/60">Chưa có tag nào.</span>
                )}
              </div>

              {/* Add Tag Input */}
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={handleKeyDownTag}
                  placeholder="Thêm tag mới (Enter để thêm)..."
                  className="flex-1 px-3 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleAddTag}
                  disabled={!newTagInput.trim()}
                  className="h-8 px-3 text-xs"
                >
                  <Plus size={12} className="mr-1" /> Thêm
                </Button>
              </div>
            </div>

            {asset.usedInItems.length > 0 && (
              <div className="flex items-start justify-between gap-2 pt-2 border-t border-border">
                <span className="text-muted-foreground text-xs shrink-0">Dùng trong bài</span>
                <span className="text-xs text-foreground text-right">{asset.usedInItems.join(', ')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 border-t border-border bg-muted/10 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDeleteRequested(asset)}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs flex items-center gap-1.5"
          >
            <Trash2 size={13} /> Xóa ảnh
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
              Đóng
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="text-xs font-semibold"
            >
              {isSaving ? <Loader2 size={13} className="animate-spin mr-1" /> : <Check size={13} className="mr-1" />}
              {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Grid Component ───────────────────────────────────────────────────
export default function MediaLibraryGrid() {
  const { mediaAssets, uploadAsset, deleteAsset } = usePortal();
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);
  const [assetToDelete, setAssetToDelete] = useState<MediaAsset | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = mediaAssets.filter((a) => {
    const matchFilter = activeFilter === 'all' || a.source === activeFilter;
    const matchSearch =
      search === '' ||
      a.tags.some((t) => t.toLowerCase().includes(search.toLowerCase())) ||
      (a.notes && a.notes.toLowerCase().includes(search.toLowerCase()));
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
      toast.error('Định dạng không hợp lệ', 'Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP.');
      return;
    }
    const tooLarge = selectedFiles.find((file) => file.size > MAX_UPLOAD_BYTES);
    if (tooLarge) {
      setUploadError('Mỗi ảnh tối đa 50 MB.');
      toast.error('Dung lượng quá lớn', 'Mỗi ảnh tối đa 50 MB.');
      return;
    }

    setUploading(true);
    setUploadError(null);
    void (async () => {
      try {
        for (const file of selectedFiles) await uploadAsset(file, true);
        toast.success(`Đã tải lên ${selectedFiles.length} hình ảnh!`, 'Ảnh đã sẵn sàng đưa vào pipeline AI D02.');
      } catch (cause) {
        const msg = cause instanceof Error ? cause.message : 'Không thể tải ảnh lên.';
        setUploadError(msg);
        toast.error('Tải ảnh thất bại', msg);
      } finally {
        setUploading(false);
      }
    })();
  };

  const handleConfirmDelete = async () => {
    if (!assetToDelete) return;
    setIsDeleting(true);
    try {
      await deleteAsset(assetToDelete.id);
      toast.success('Đã xóa ảnh thành công!', 'Ảnh đã được xóa khỏi thư viện.');
      if (selectedAsset?.id === assetToDelete.id) {
        setSelectedAsset(null);
      }
      setAssetToDelete(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể xóa ảnh.';
      toast.error('Xóa ảnh thất bại', msg);
    } finally {
      setIsDeleting(false);
    }
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
            placeholder="Tìm theo tag hoặc mô tả…"
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
            <div
              key={asset.id}
              id={`media-asset-${asset.id}`}
              onClick={() => setSelectedAsset(asset)}
              className="group relative rounded-xl overflow-hidden border border-border hover:border-lime-brand transition-all hover:shadow-accent-glow text-left bg-card cursor-pointer"
            >
              <div className="aspect-square overflow-hidden">
                <img
                  src={asset.thumbnailUrl}
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
              </div>

              {asset.indexingStatus === 'processing' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-white pointer-events-none">
                  <span className="flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-semibold">
                    <Loader2 size={11} className="animate-spin" /> Đang phân tích
                  </span>
                </div>
              )}

              {/* Source badge */}
              <div className="absolute top-1.5 left-1.5 pointer-events-none">
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border backdrop-blur-sm ${badge.class}`}>
                  {badge.label}
                </span>
              </div>

              {/* Quick action buttons (Hover overlay top-right) */}
              <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                <button
                  type="button"
                  title="Chỉnh sửa mô tả & tags"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedAsset(asset);
                  }}
                  className="p-1.5 rounded-lg bg-black/70 hover:bg-primary text-white hover:text-primary-foreground backdrop-blur-sm transition-colors"
                >
                  <Edit2 size={12} />
                </button>
                <button
                  type="button"
                  title="Xóa ảnh"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAssetToDelete(asset);
                  }}
                  className="p-1.5 rounded-lg bg-black/70 hover:bg-red-600 text-white backdrop-blur-sm transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>

              {/* Tags overlay */}
              {asset.tags.length > 0 && (
                <div
                  onClick={() => setSelectedAsset(asset)}
                  className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent px-2.5 py-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <p className="text-[9px] text-white/90 truncate font-medium">
                    {asset.tags.slice(0, 3).join(' · ')}
                  </p>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full py-12 text-center text-sm text-muted-foreground">
            Không có ảnh nào phù hợp
          </div>
        )}
      </div>

      {/* Detail & Edit panel */}
      {selectedAsset && (
        <AssetDetailPanel
          asset={selectedAsset}
          onClose={() => setSelectedAsset(null)}
          onDeleteRequested={(asset) => setAssetToDelete(asset)}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(assetToDelete)}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setAssetToDelete(null)}
      />
    </div>
  );
}
