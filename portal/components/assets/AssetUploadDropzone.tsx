'use client';

import React, { useState, useRef } from 'react';
import { usePortal } from '@/lib/store';
import { apiUploadAsset } from '@/lib/api';
import { Upload, X, FileImage, CheckCircle2, Camera, StickyNote } from 'lucide-react';

interface AssetUploadDropzoneProps {
  requestId: string;
  onSubmit?: () => void;
}

interface PendingFile {
  file: File;
  preview: string;
  note: string;
}

export default function AssetUploadDropzone({ requestId, onSubmit }: AssetUploadDropzoneProps) {
  const { assetRequests, submitAssets } = usePortal();
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const request = assetRequests.find((r) => r.id === requestId);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newFiles: PendingFile[] = Array.from(files).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      note: '',
    }));
    setPendingFiles((prev) => [...prev, ...newFiles]);
  };

  const updateNote = (idx: number, note: string) => {
    setPendingFiles((prev) => prev.map((f, i) => (i === idx ? { ...f, note } : f)));
  };

  const removeFile = (idx: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = () => {
    if (!pendingFiles.length || uploading) return;
    setUploading(true);
    setError(null);
    void (async () => {
      try {
        const uploaded = [];
        for (const pending of pendingFiles) uploaded.push(await apiUploadAsset(pending.file, requestId));
        await submitAssets(requestId, uploaded.map((asset) => asset.id));
        setSubmitted(true);
        if (onSubmit) onSubmit();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Không thể gửi ảnh');
      } finally {
        setUploading(false);
      }
    })();
  };

  if (!request) return null;

  if (submitted) {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-3">
          <CheckCircle2 size={28} className="text-emerald-400" />
        </div>
        <p className="text-sm font-semibold text-foreground mb-1">Đã gửi ảnh thành công!</p>
        <p className="text-xs text-muted-foreground">AI sẽ xử lý và cập nhật bài viết trong vài phút.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Shot list */}
      {request.shotList.length > 0 && (
        <div className="mb-4 p-4 rounded-xl border border-border bg-muted/20">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Camera size={12} /> Danh sách cần chụp
          </p>
          <ul className="space-y-1.5">
            {request.shotList.map((shot, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                <span className="text-lime-brand font-bold mt-0.5 flex-shrink-0">{i + 1}.</span>
                {shot}
              </li>
            ))}
          </ul>
          <p className="text-[10px] text-muted-foreground mt-2.5">
            Deadline:{' '}
            <span className="text-red-400 font-semibold">
              {request.deadline.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </span>
          </p>
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all mb-4 ${
          dragging
            ? 'border-lime-brand bg-accent-tint shadow-accent-glow'
            : 'border-border hover:border-primary/40 hover:bg-muted/20'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          id="asset-file-input"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="flex flex-col items-center gap-2">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${dragging ? 'bg-accent-tint-15' : 'bg-muted'}`}>
            <Upload size={18} className={dragging ? 'text-lime-brand' : 'text-muted-foreground'} />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Kéo thả ảnh vào đây</p>
            <p className="text-xs text-muted-foreground mt-0.5">hoặc bấm để chọn từ máy · JPG, PNG, WEBP</p>
          </div>
        </div>
      </div>

      {/* Pending files list */}
      {pendingFiles.length > 0 && (
        <div className="space-y-3 mb-4">
          {pendingFiles.map((pf, idx) => (
            <div key={idx} className="flex gap-3 p-3 border border-border rounded-xl bg-background">
              <img src={pf.preview} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0 border border-border" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate mb-1.5">{pf.file.name}</p>
                <div className="flex items-center gap-1 text-muted-foreground mb-1.5">
                  <StickyNote size={11} />
                  <input
                    type="text"
                    value={pf.note}
                    onChange={(e) => updateNote(idx, e.target.value)}
                    placeholder="Ghi chú cho ảnh này…"
                    className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <FileImage size={10} className="text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">{(pf.file.size / 1024).toFixed(0)} KB</span>
                </div>
              </div>
              <button
                onClick={() => removeFile(idx)}
                className="text-muted-foreground hover:text-red-400 transition-colors p-1 flex-shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Submit */}
      {error && <p className="mb-3 text-xs text-red-400">{error}</p>}
      <button
        id="submit-assets-btn"
        onClick={handleSubmit}
        disabled={pendingFiles.length === 0 || uploading}
        className={`w-full py-2.5 rounded-lg text-sm font-bold transition-all ${
          pendingFiles.length > 0
            ? 'btn-lime-glow'
            : 'bg-muted text-muted-foreground cursor-not-allowed'
        }`}
      >
        Gửi {pendingFiles.length > 0 ? `${pendingFiles.length} ảnh` : 'ảnh'} cho AI
      </button>
    </div>
  );
}
