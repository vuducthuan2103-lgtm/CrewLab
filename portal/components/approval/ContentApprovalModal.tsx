'use client';

import React, { useState } from 'react';
import { usePortal } from '@/lib/store';
import {
  X,
  Edit3,
  CheckCircle2,
  XCircle,
  CheckSquare,
  Calendar,
  Eye,
  ThumbsDown,
  ThumbsUp,
  Flag,
  MessageSquare,
} from 'lucide-react';
import { ContentItem, RejectionReason, REJECTION_REASON_LABELS, FSM_STATE_LABELS } from '@/lib/types';

interface ContentApprovalModalProps {
  contentItem: ContentItem;
  onClose: () => void;
}

function FSMBadge({ state }: { state: ContentItem['state'] }) {
  const configs: Record<string, { class: string; label: string }> = {
    pending_content_approval: {
      class: 'bg-accent-tint-15 text-lime-brand border-accent-tint shadow-accent-glow',
      label: FSM_STATE_LABELS['pending_content_approval'],
    },
    approved_ready_to_post: {
      class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      label: FSM_STATE_LABELS['approved_ready_to_post'],
    },
    posted: { class: 'bg-blue-500/10 text-blue-400 border-blue-500/20', label: FSM_STATE_LABELS['posted'] },
    eval_failed: { class: 'bg-amber-500/10 text-amber-400 border-amber-500/20', label: FSM_STATE_LABELS['eval_failed'] },
    waiting_asset: { class: 'bg-orange-500/10 text-orange-400 border-orange-500/20', label: FSM_STATE_LABELS['waiting_asset'] },
  };
  const cfg = configs[state] || { class: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20', label: FSM_STATE_LABELS[state] || state };
  return (
    <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${cfg.class} tracking-wide`}>
      {cfg.label}
    </span>
  );
}

function MockFBPreview({ item, caption }: { item: ContentItem; caption: string }) {
  return (
    <div className="rounded-xl overflow-hidden border border-border bg-[#1C1E21] text-white text-xs">
      {/* FB Post Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/10">
        <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-[10px]">B</div>
        <div>
          <p className="font-semibold text-[11px]">Bardinh Coffee</p>
          <p className="text-[10px] text-white/50">Vừa xong · 🌐</p>
        </div>
        <div className="ml-auto text-white/40">···</div>
      </div>
      {/* Caption */}
      <div className="px-3 py-2">
        <p className="text-[11px] leading-relaxed whitespace-pre-line text-white/90 line-clamp-4">{caption}</p>
      </div>
      {/* Image */}
      {item.imageUrl && (
        <img src={item.imageUrl} alt="" className="w-full h-36 object-cover" />
      )}
      {!item.imageUrl && (
        <div className="w-full h-28 bg-white/5 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl mb-1">📷</div>
            <p className="text-[10px] text-white/30">Đang xử lý ảnh…</p>
          </div>
        </div>
      )}
      {/* Reactions */}
      <div className="px-3 py-2 flex items-center gap-3 text-white/40 text-[10px] border-t border-white/10">
        <span>👍 Thích</span><span>💬 Bình luận</span><span>↗ Chia sẻ</span>
      </div>
    </div>
  );
}

function MockIGPreview({ item, caption }: { item: ContentItem; caption: string }) {
  return (
    <div className="rounded-xl overflow-hidden border border-border bg-[#000] text-white text-xs">
      {/* IG Header */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="w-7 h-7 rounded-full ring-2 ring-emerald-500 flex items-center justify-center bg-emerald-600 text-white font-bold text-[10px]">B</div>
        <div>
          <p className="font-semibold text-[11px]">bardinh.coffee</p>
        </div>
        <div className="ml-auto text-white/40">···</div>
      </div>
      {/* Image */}
      {item.imageUrl ? (
        <img src={item.imageUrl} alt="" className="w-full h-44 object-cover" />
      ) : (
        <div className="w-full h-40 bg-white/5 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl mb-1">🎨</div>
            <p className="text-[10px] text-white/30">D02 đang thiết kế ảnh…</p>
          </div>
        </div>
      )}
      {/* Actions */}
      <div className="px-3 py-2 flex items-center gap-3 text-white/80 text-base">
        <span>🤍</span><span>💬</span><span>✈️</span><span className="ml-auto">🔖</span>
      </div>
      {/* Caption */}
      <div className="px-3 pb-3">
        <p className="text-[11px] leading-relaxed whitespace-pre-line text-white/90 line-clamp-3">
          <span className="font-semibold">bardinh.coffee</span> {caption.split('\n')[0]}
        </p>
      </div>
    </div>
  );
}

export default function ContentApprovalModal({ contentItem, onClose }: ContentApprovalModalProps) {
  const { approveContent, rejectContent, markAsPosted } = usePortal();
  const [editCaption, setEditCaption] = useState(contentItem.clientEditedCaption || contentItem.caption);
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState<RejectionReason>('tone_wrong');
  const [rejectFeedback, setRejectFeedback] = useState('');
  const [actionDone, setActionDone] = useState<'approved' | 'rejected' | 'posted' | null>(null);

  const canApprove = contentItem.state === 'pending_content_approval';
  const canMarkPosted = contentItem.state === 'approved_ready_to_post';
  const isReadOnly = contentItem.state === 'posted' || contentItem.state === 'waiting_asset';

  const handleApprove = () => {
    approveContent(contentItem.id, editCaption);
    setActionDone('approved');
    setTimeout(onClose, 1000);
  };

  const handleReject = () => {
    rejectContent(contentItem.id, rejectReason, rejectFeedback);
    setActionDone('rejected');
    setTimeout(onClose, 1000);
  };

  const handleMarkPosted = () => {
    markAsPosted(contentItem.id);
    setActionDone('posted');
    setTimeout(onClose, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Eye size={14} className="text-lime-brand" />
              <h2 className="text-base font-bold text-foreground">Xem trước & Duyệt bài</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground font-medium">{contentItem.title}</span>
              <span className="text-muted-foreground">·</span>
              <FSMBadge state={contentItem.state} />
              <span className="text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">
                {contentItem.platform === 'fb' ? '🟥 Facebook' : contentItem.platform === 'ig' ? '🟦 Instagram' : '🟥 FB + 🟦 IG'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-4 text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* AI Badge */}
        <div className="px-6 py-2.5 bg-muted/20 border-b border-border flex items-center gap-2 flex-shrink-0">
          <CheckCircle2 size={13} className="text-emerald-400" />
          <span className="text-xs text-muted-foreground">
            <span className="text-emerald-400 font-semibold">AI đã thẩm định đạt chuẩn</span>
            {' — '} E01 Evaluator đã kiểm tra nội dung trước khi trình bạn duyệt.
          </span>
        </div>

        {/* Content: 2-col preview + edit */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 gap-6 p-6">
            {/* Facebook Preview */}
            <div>
              <div className="flex items-center gap-1.5 mb-3">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">🟥 Preview Facebook</span>
              </div>
              <MockFBPreview item={contentItem} caption={editCaption} />
            </div>

            {/* Instagram Preview */}
            <div>
              <div className="flex items-center gap-1.5 mb-3">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">🟦 Preview Instagram</span>
              </div>
              <MockIGPreview item={contentItem} caption={editCaption} />
            </div>
          </div>

          {/* Caption Editor */}
          <div className="px-6 pb-4">
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b border-border">
                <div className="flex items-center gap-1.5">
                  <Edit3 size={12} className="text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground">Caption</span>
                  {isEditingCaption && (
                    <span className="text-[10px] bg-accent-tint-15 text-lime-brand border border-accent-tint rounded-full px-2 py-0.5 font-semibold">
                      Đang chỉnh sửa
                    </span>
                  )}
                </div>
                {!isReadOnly && (
                  <button
                    onClick={() => setIsEditingCaption(!isEditingCaption)}
                    className="text-xs text-lime-brand hover:underline font-medium"
                  >
                    {isEditingCaption ? 'Xong' : 'Chỉnh sửa'}
                  </button>
                )}
              </div>
              <textarea
                id="caption-editor"
                value={editCaption}
                onChange={(e) => setEditCaption(e.target.value)}
                disabled={!isEditingCaption}
                rows={5}
                className="w-full px-4 py-3 bg-background text-sm text-foreground leading-relaxed resize-none focus:outline-none disabled:opacity-70 disabled:cursor-default font-sans"
              />
            </div>
          </div>

          {/* Schedule */}
          <div className="px-6 pb-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar size={12} />
              <span>Giờ đăng dự kiến:</span>
              <span className="font-semibold text-foreground">
                {contentItem.publishTime.toLocaleString('vi-VN', {
                  weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                })}
              </span>
            </div>
          </div>

          {/* Reject Form */}
          {showRejectForm && (
            <div className="mx-6 mb-4 p-4 border border-amber-500/30 bg-amber-500/5 rounded-xl space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <ThumbsDown size={13} className="text-amber-400" />
                <span className="text-xs font-semibold text-amber-400">Lý do từ chối</span>
              </div>
              <select
                id="reject-reason-select"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value as RejectionReason)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary"
              >
                {Object.entries(REJECTION_REASON_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <textarea
                id="reject-feedback-text"
                value={rejectFeedback}
                onChange={(e) => setRejectFeedback(e.target.value)}
                placeholder="Mô tả thêm cho AI hiểu rõ hơn (không bắt buộc)…"
                rows={3}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-amber-500/60 resize-none"
              />
              <div className="flex gap-2">
                <button
                  id="cancel-reject"
                  onClick={() => setShowRejectForm(false)}
                  className="flex-1 py-2 border border-border text-muted-foreground text-xs font-semibold rounded-lg hover:bg-muted/50 transition-colors"
                >
                  Huỷ
                </button>
                <button
                  id="confirm-reject"
                  onClick={handleReject}
                  className="flex-1 py-2 bg-amber-500 text-black text-xs font-bold rounded-lg hover:bg-amber-400 transition-colors flex items-center justify-center gap-1"
                >
                  <XCircle size={12} /> Xác nhận từ chối
                </button>
              </div>
            </div>
          )}

          {/* Action Done Banner */}
          {actionDone && (
            <div
              className={`mx-6 mb-4 p-3 rounded-xl flex items-center gap-2 text-sm font-semibold ${
                actionDone === 'approved'
                  ? 'bg-accent-tint-15 text-lime-brand border border-accent-tint'
                  : actionDone === 'posted'
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}
            >
              {actionDone === 'approved' && <><ThumbsUp size={14} /> Đã duyệt thành công! Bài chờ đăng.</>}
              {actionDone === 'posted' && <><CheckSquare size={14} /> Đã đánh dấu đã đăng! Dashboard đã cập nhật.</>}
              {actionDone === 'rejected' && <><Flag size={14} /> Đã từ chối và gửi feedback về AI.</>}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-border flex-shrink-0 bg-card">
          {canMarkPosted && !actionDone && (
            <button
              id="mark-as-posted-btn"
              onClick={handleMarkPosted}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 text-sm font-semibold rounded-lg hover:bg-blue-500/20 transition-all"
            >
              <CheckSquare size={14} /> Đánh dấu đã đăng
            </button>
          )}
          <div className="flex-1" />
          {canApprove && !showRejectForm && !actionDone && (
            <>
              <button
                id="reject-btn"
                onClick={() => setShowRejectForm(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 border border-border text-muted-foreground text-sm font-semibold rounded-lg hover:border-amber-500/50 hover:text-amber-400 hover:bg-amber-500/5 transition-all"
              >
                <XCircle size={14} /> Từ chối
              </button>
              <button
                id="approve-btn"
                onClick={handleApprove}
                className="flex items-center gap-2 px-5 py-2.5 btn-lime-glow text-sm font-bold rounded-lg transition-all"
              >
                <ThumbsUp size={14} /> Duyệt bài
              </button>
            </>
          )}
          {!canApprove && !canMarkPosted && (
            <button onClick={onClose} className="px-4 py-2.5 border border-border text-muted-foreground text-sm rounded-lg hover:bg-muted/50 transition-colors">
              Đóng
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
