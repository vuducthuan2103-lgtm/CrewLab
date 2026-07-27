'use client';

import React, { useState } from 'react';
import { usePortal } from '@/lib/store';
import { Sparkles, X, Send, AlertCircle, Calendar } from 'lucide-react';

interface CreateBriefModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateBriefModal({ isOpen, onClose }: CreateBriefModalProps) {
  const { createClientBrief } = usePortal();
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [platform, setPlatform] = useState<'all' | 'fb' | 'ig'>('all');
  const [urgency, setUrgency] = useState<'standard' | 'high' | 'urgent'>('high');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    createClientBrief(title, details, urgency, platform);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setTitle('');
      setDetails('');
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-lime-brand">
              <Sparkles size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Gửi Brief / Yêu cầu bài mới cho A01</h3>
              <p className="text-[11px] text-muted-foreground">A01 Orchestrator sẽ điều phối D01 & D02 xử lý ngay</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Modal Body */}
        {submitted ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 mx-auto flex items-center justify-center text-xl">
              ✨
            </div>
            <h4 className="text-base font-bold text-foreground">Đã gửi Brief thành công!</h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Agent A01 đã tiếp nhận Brief và đang giao việc cho D01 (Caption Writer) & D02 (Image Design).
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Tên chủ đề / Sự kiện cần viết bài <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Chương trình Khai Trương Cơ Sở 2 - Giảm 20% toàn menu"
                className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
              />
            </div>

            {/* Details */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Mô tả chi tiết / Nội dung cần lưu ý
              </label>
              <textarea
                rows={3}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Mô tả ưu đãi, thông điệp chính, đối tượng áp dụng hoặc ghi chú hình ảnh chụp thực tế nếu có…"
                className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 resize-none"
              />
            </div>

            {/* Platform & Urgency */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Nền tảng phát hành</label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value as any)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="all">🟥🟦 Cả Facebook & Instagram</option>
                  <option value="fb">🟥 Facebook Post</option>
                  <option value="ig">🟦 Instagram Post</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Mức độ ưu tiên / Deadline</label>
                <select
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value as any)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="standard">📅 Theo kế hoạch tuần</option>
                  <option value="high">⚡ Gấp (Xử lý trong 24h)</option>
                  <option value="urgent">🔥 Siêu gấp (Xử lý trong 6h)</option>
                </select>
              </div>
            </div>

            {/* AI Auto-assign info banner */}
            <div className="p-3 rounded-xl bg-muted/40 border border-border flex items-start gap-2.5 text-[11px] text-muted-foreground">
              <AlertCircle size={14} className="text-lime-brand flex-shrink-0 mt-0.5" />
              <span>
                Brief của bạn sẽ được AI tự động phân tích Brand Voice, chọn Trụ nội dung phù hợp và lên bài duyệt trong thời gian sớm nhất.
              </span>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-border text-xs font-semibold text-muted-foreground rounded-xl hover:bg-muted/50 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2 bg-lime-brand text-black font-bold text-xs rounded-xl shadow-md hover:opacity-90 transition-all"
              >
                <Send size={12} /> Gửi Brief Cho A01
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
