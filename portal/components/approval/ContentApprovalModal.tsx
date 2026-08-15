'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePortal } from '@/lib/store';
import { toast } from '@/components/ui/Toast';
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
  AlertCircle,
  Loader2,
  Globe,
  MoreHorizontal,
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  Share2,
  Camera,
  Palette,
  Copy,
} from 'lucide-react';
import { ContentItem, RejectionReason, REJECTION_REASON_LABELS, FSM_STATE_LABELS } from '@/lib/types';

interface ContentApprovalModalProps {
  contentItem: ContentItem;
  onClose: () => void;
}

export function FacebookLogo({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="#1877F2" aria-label="Facebook">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

export function InstagramLogo({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-label="Instagram">
      <radialGradient id="modal-ig-grad" r="150%" cx="30%" cy="107%">
        <stop stopColor="#fdf497" offset="0%" />
        <stop stopColor="#fdf497" offset="5%" />
        <stop stopColor="#fd5949" offset="45%" />
        <stop stopColor="#d6249f" offset="60%" />
        <stop stopColor="#285AEB" offset="90%" />
      </radialGradient>
      <rect width="24" height="24" rx="6" fill="url(#modal-ig-grad)" />
      <path
        fill="#fff"
        d="M12 5.838c3.045 0 3.408.012 4.604.066 1.108.05 1.71.233 2.11.388.53.206.908.452 1.306.85.398.398.644.776.85 1.306.155.4.338 1.002.388 2.11.054 1.196.066 1.559.066 4.604 0 3.045-.012 3.408-.066 4.604-.05 1.108-.233 1.71-.388 2.11-.206.53-.452.908-.85 1.306-.398.398-.776.644-1.306.85-.4.155-1.002.338-2.11.388-1.196.054-1.559.066-4.604.066-3.045 0-3.408-.012-4.604-.066-1.108-.05-1.71-.233-2.11-.388-.53-.206-.908-.452-1.306-.85-.398-.398-.644-.776-.85-1.306-.155-.4-.338-1.002-.388-2.11-.054-1.196-.066-1.559-.066-4.604 0-3.045.012-3.408.066-4.604.05-1.108.233-1.71.388-2.11.206-.53.452-.908.85-1.306.398-.398.776-.644 1.306-.85.4-.155 1.002-.338 2.11-.388 1.196-.054 1.559-.066 4.604-.066zm0-1.838c-3.103 0-3.492.013-4.71.068-1.215.056-2.046.25-2.772.532-.751.292-1.388.683-2.023 1.318-.635.635-1.026 1.272-1.318 2.023-.282.726-.476 1.557-.532 2.772-.055 1.218-.068 1.607-.068 4.71s.013 3.492.068 4.71c.056 1.215.25 2.046.532 2.772.292.751.683 1.388 1.318 2.023.635.635 1.272 1.026 2.023 1.318.726.282 1.557.476 2.772.532 1.218.055 1.607.068 4.71.068s3.492-.013 4.71-.068c1.215-.056 2.046-.25 2.772-.532.751-.292 1.388-.683 2.023-1.318.635-.635 1.026-1.272 1.318-2.023.282-.726.476-1.557.532-2.772.055-1.218.068-1.607.068-4.71s-.013-3.492-.068-4.71c-.056-1.215-.25-2.046-.532-2.772-.292-.751-.683-1.388-1.318-2.023-.635-.635-1.272-1.026-2.023-1.318-.726-.282-1.557-.476-2.772-.532-1.218-.055-1.607-.068-4.71-.068zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.162 6.162 6.162 6.162-2.759 6.162-6.162-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"
      />
    </svg>
  );
}

function FSMBadge({ state }: { state: ContentItem['state'] }) {
  const configs: Record<string, { class: string; label: string }> = {
    pending_content_approval: {
      class: 'bg-lime-500/10 text-lime-400 border-lime-500/30 shadow-sm',
      label: FSM_STATE_LABELS['pending_content_approval'],
    },
    approved_ready_to_post: {
      class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      label: FSM_STATE_LABELS['approved_ready_to_post'],
    },
    posted: { class: 'bg-blue-500/10 text-blue-400 border-blue-500/20', label: FSM_STATE_LABELS['posted'] },
    eval_failed: { class: 'bg-amber-500/10 text-amber-400 border-amber-500/20', label: FSM_STATE_LABELS['eval_failed'] },
  };
  const cfg = configs[state] || { class: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20', label: FSM_STATE_LABELS[state] || state };
  return (
    <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${cfg.class} tracking-wide`}>
      {cfg.label}
    </span>
  );
}

function HighlightText({ text }: { text: string }) {
  const parts = text.split(/(#[a-zA-Z0-9_\u00C0-\u1EF9]+)/g);
  return (
    <>
      {parts.map((part, index) =>
        part.startsWith('#') ? (
          <span key={index} className="text-[#4599FF] hover:underline cursor-pointer">
            {part}
          </span>
        ) : (
          part
        )
      )}
    </>
  );
}

function MockFBPreview({
  item,
  caption,
  brandName,
  brandLogoUrl,
}: {
  item: ContentItem;
  caption: string;
  brandName: string;
  brandLogoUrl?: string | null;
}) {
  const displayName = brandName || 'Bardinh Coffee';
  const initial = displayName.slice(0, 1).toUpperCase();

  return (
    <div className="rounded-2xl overflow-hidden border border-[#3a3b3c] bg-[#242526] text-[#e4e6eb] text-xs shadow-xl flex flex-col h-full justify-between">
      {/* Top section: Header + Caption */}
      <div>
        {/* FB Post Header */}
        <div className="flex items-center gap-2.5 px-3.5 py-3 border-b border-[#3a3b3c]/50">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 border border-white/10 flex items-center justify-center text-white font-bold text-xs shrink-0 overflow-hidden shadow-sm">
            {brandLogoUrl ? (
              <img src={brandLogoUrl} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              initial
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-[12px] text-white truncate hover:underline cursor-pointer">
              {displayName}
            </p>
            <div className="flex items-center gap-1 text-[10px] text-[#b0b3b8]">
              <span>Vừa xong</span>
              <span>·</span>
              <Globe size={11} className="text-[#b0b3b8]" />
            </div>
          </div>
          <button type="button" className="text-[#b0b3b8] hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors">
            <MoreHorizontal size={16} />
          </button>
        </div>

        {/* FB Caption */}
        <div className="px-3.5 py-2.5 min-h-[52px]">
          <p className="text-[12px] leading-relaxed whitespace-pre-line text-[#e4e6eb] line-clamp-3">
            <HighlightText text={caption} />
          </p>
        </div>
      </div>

      {/* FB Image Container (Matched 1:1 Aspect Ratio) */}
      <div className="relative w-full aspect-square bg-[#18191a] border-y border-[#3a3b3c] overflow-hidden flex items-center justify-center">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-zinc-900/60">
            <div className="w-10 h-10 rounded-2xl bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-lime-brand shadow-sm mb-2">
              <Camera size={18} />
            </div>
            <p className="text-[11px] font-medium text-zinc-300">Đang xử lý hình ảnh...</p>
            <p className="text-[9px] text-zinc-500 mt-0.5">D02 đang xử lý và ghép visual bài đăng</p>
          </div>
        )}
      </div>

      {/* Bottom section: Reactions + Action Buttons */}
      <div>
        {/* FB Reaction Summary Bar */}
        <div className="px-3.5 py-2 flex items-center justify-between text-[#b0b3b8] text-[10px] border-b border-[#3a3b3c]">
          <div className="flex items-center gap-1">
            <span className="flex items-center -space-x-1">
              <span className="w-4 h-4 rounded-full bg-[#1877F2] flex items-center justify-center text-[8px] text-white ring-1 ring-[#242526]">👍</span>
              <span className="w-4 h-4 rounded-full bg-[#FA3E3E] flex items-center justify-center text-[8px] text-white ring-1 ring-[#242526]">❤️</span>
            </span>
            <span className="ml-1 hover:underline cursor-pointer">48</span>
          </div>
          <div className="flex items-center gap-2 hover:underline cursor-pointer">
            <span>6 bình luận</span>
            <span>·</span>
            <span>2 lượt chia sẻ</span>
          </div>
        </div>

        {/* FB Action Buttons */}
        <div className="px-1 py-1 grid grid-cols-3 gap-0.5 text-[#b0b3b8] text-[11px] font-medium">
          <button type="button" className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg hover:bg-white/5 hover:text-white transition-colors">
            <ThumbsUp size={14} />
            <span>Thích</span>
          </button>
          <button type="button" className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg hover:bg-white/5 hover:text-white transition-colors">
            <MessageCircle size={14} />
            <span>Bình luận</span>
          </button>
          <button type="button" className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg hover:bg-white/5 hover:text-white transition-colors">
            <Share2 size={14} />
            <span>Chia sẻ</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function MockIGPreview({
  item,
  caption,
  brandName,
  brandLogoUrl,
}: {
  item: ContentItem;
  caption: string;
  brandName: string;
  brandLogoUrl?: string | null;
}) {
  const displayName = brandName || 'Bardinh Coffee';
  const handle = displayName.toLocaleLowerCase('vi-VN').replace(/\s+/g, '.');
  const initial = displayName.slice(0, 1).toUpperCase();

  return (
    <div className="rounded-2xl overflow-hidden border border-zinc-800 bg-[#000000] text-white text-xs shadow-xl flex flex-col h-full justify-between">
      {/* IG Header */}
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-zinc-800/80">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-[1.5px] rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 shrink-0">
            <div className="w-8 h-8 rounded-full bg-zinc-900 border border-black flex items-center justify-center text-white font-bold text-xs overflow-hidden">
              {brandLogoUrl ? (
                <img src={brandLogoUrl} alt={handle} className="w-full h-full object-cover" />
              ) : (
                initial
              )}
            </div>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-[12px] text-white leading-tight truncate hover:opacity-80 cursor-pointer">
              {handle}
            </p>
            <p className="text-[10px] text-zinc-400 leading-tight truncate">Âm thanh gốc · Hà Nội</p>
          </div>
        </div>
        <button type="button" className="text-zinc-400 hover:text-white p-1">
          <MoreHorizontal size={15} />
        </button>
      </div>

      {/* IG Media Container (Matched 1:1 Aspect Ratio) */}
      <div className="relative w-full aspect-square bg-zinc-950 border-b border-zinc-800/80 overflow-hidden flex items-center justify-center">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center bg-zinc-900/60 w-full h-full">
            <div className="w-10 h-10 rounded-2xl bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-rose-400 shadow-sm mb-2">
              <Palette size={18} />
            </div>
            <p className="text-[11px] font-medium text-zinc-300">D02 đang thiết kế ảnh...</p>
            <p className="text-[9px] text-zinc-500 mt-0.5">Tỷ lệ chuẩn Instagram</p>
          </div>
        )}
      </div>

      {/* Bottom section: Actions + Likes & Caption */}
      <div>
        {/* IG Action Icons */}
        <div className="px-3.5 pt-2 pb-1 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <button type="button" className="hover:text-red-500 hover:scale-110 transition-transform">
              <Heart size={18} />
            </button>
            <button type="button" className="hover:text-zinc-300 hover:scale-110 transition-transform">
              <MessageCircle size={18} />
            </button>
            <button type="button" className="hover:text-zinc-300 hover:scale-110 transition-transform">
              <Send size={18} />
            </button>
          </div>
          <button type="button" className="hover:text-zinc-300 hover:scale-110 transition-transform">
            <Bookmark size={18} />
          </button>
        </div>

        {/* IG Likes & Caption */}
        <div className="px-3.5 pb-3 space-y-1">
          <p className="text-[10px] font-semibold text-white">86 lượt thích</p>
          <div className="min-h-[38px]">
            <p className="text-[11px] leading-relaxed text-zinc-200 line-clamp-2">
              <span className="font-semibold text-white mr-1.5">{handle}</span>
              <HighlightText text={caption} />
            </p>
          </div>
          <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-0.5">
            <span className="cursor-pointer hover:text-zinc-400">Xem tất cả 8 bình luận</span>
            <span className="text-[8px] font-mono uppercase tracking-wider">VỪA XONG</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ContentApprovalModal({ contentItem, onClose }: ContentApprovalModalProps) {
  const { approveContent, rejectContent, markAsPosted, clientName, brandLogoUrl } = usePortal();
  const [editCaption, setEditCaption] = useState(contentItem.clientEditedCaption || contentItem.caption);
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState<RejectionReason>('tone_wrong');
  const [rejectFeedback, setRejectFeedback] = useState('');
  const [actionDone, setActionDone] = useState<'approved' | 'rejected' | 'posted' | null>(null);
  const [actionPending, setActionPending] = useState<'approved' | 'rejected' | 'posted' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Prevent background scrolling while modal is open
    const originalStyle = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !actionPending) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalStyle;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [actionPending, onClose]);

  const canApprove = contentItem.state === 'pending_content_approval';
  const canMarkPosted = contentItem.state === 'approved_ready_to_post';
  const isReadOnly = contentItem.state === 'posted';

  const runAction = async (
    action: 'approved' | 'rejected' | 'posted',
    operation: () => Promise<void>,
  ) => {
    if (actionPending) return;
    setActionPending(action);
    setActionError(null);
    try {
      await operation();
      setActionDone(action);
      if (action === 'approved') {
        toast.success('Duyệt bài thành công!', 'Bài viết đã sẵn sàng vào lịch đăng.');
      } else if (action === 'posted') {
        toast.success('Đã đánh dấu đã đăng!', 'Bài viết đã hoàn tất phát hành.');
      } else if (action === 'rejected') {
        toast.info('Đã từ chối bài viết', 'Phản hồi đã được gửi lại cho AI để chỉnh sửa.');
      }
      setTimeout(onClose, 1000);
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : 'Không thể hoàn tất thao tác. Vui lòng thử lại.';
      setActionError(msg);
      toast.error('Thao tác không thành công', msg);
    } finally {
      setActionPending(null);
    }
  };

  const handleApprove = () => void runAction('approved', () => approveContent(contentItem.id, editCaption));

  const handleReject = () => void runAction(
    'rejected',
    () => rejectContent(contentItem.id, rejectReason, rejectFeedback),
  );

  const handleMarkPosted = () => void runAction('posted', () => markAsPosted(contentItem.id));

  const modalContent = (
    <div className="fixed inset-0 z-[100] w-screen h-screen flex items-center justify-center p-3 sm:p-6 overflow-hidden">
      {/* 100% Full-screen Backdrop Blur without any gaps */}
      <div
        className="absolute inset-0 bg-black/85 backdrop-blur-md transition-opacity"
        onClick={actionPending ? undefined : onClose}
      />

      {/* Modal Card */}
      <div className="relative bg-card border border-border/80 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-3.5 border-b border-border/80 flex-shrink-0 bg-card/95 backdrop-blur-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Eye size={15} className="text-lime-brand" />
              <h2 className="text-base font-bold text-foreground">Xem trước & Duyệt bài</h2>
            </div>
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="text-muted-foreground font-medium">{contentItem.title}</span>
              <span className="text-muted-foreground">·</span>
              <FSMBadge state={contentItem.state} />
              <span className="text-muted-foreground">·</span>
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-800/80 border border-zinc-700/70 text-[11px] font-medium text-zinc-300">
                {contentItem.platform === 'fb' ? (
                  <>
                    <FacebookLogo className="w-3.5 h-3.5" />
                    <span>Facebook</span>
                  </>
                ) : contentItem.platform === 'ig' ? (
                  <>
                    <InstagramLogo className="w-3.5 h-3.5" />
                    <span>Instagram</span>
                  </>
                ) : (
                  <>
                    <FacebookLogo className="w-3.5 h-3.5" />
                    <span>FB</span>
                    <span className="text-zinc-500">+</span>
                    <InstagramLogo className="w-3.5 h-3.5" />
                    <span>IG</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-4 text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-zinc-800"
            title="Đóng modal (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* AI Badge */}
        <div className="px-6 py-2 bg-emerald-950/30 border-b border-emerald-500/20 flex items-center gap-2 flex-shrink-0">
          <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
          <span className="text-xs text-muted-foreground">
            <span className="text-emerald-400 font-semibold">AI đã thẩm định đạt chuẩn</span>
            {' — '} E01 Evaluator đã kiểm tra brand voice và nội dung trước khi trình bạn duyệt.
          </span>
        </div>

        {/* Content: 2-col realistic previews + caption editor */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 items-stretch">
            {/* Facebook Column */}
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-2 mb-3">
                <FacebookLogo className="w-4 h-4" />
                <span className="text-xs font-bold text-foreground tracking-wide">Bản xem trước Facebook</span>
              </div>
              <div className="flex-1 flex flex-col">
                <MockFBPreview
                  item={contentItem}
                  caption={editCaption}
                  brandName={clientName}
                  brandLogoUrl={brandLogoUrl}
                />
              </div>
            </div>

            {/* Instagram Column */}
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-2 mb-3">
                <InstagramLogo className="w-4 h-4" />
                <span className="text-xs font-bold text-foreground tracking-wide">Bản xem trước Instagram</span>
              </div>
              <div className="flex-1 flex flex-col">
                <MockIGPreview
                  item={contentItem}
                  caption={editCaption}
                  brandName={clientName}
                  brandLogoUrl={brandLogoUrl}
                />
              </div>
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
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof navigator !== 'undefined' && navigator.clipboard) {
                        navigator.clipboard.writeText(editCaption);
                        toast.copy('Đã sao chép caption vào bộ nhớ tạm');
                      }
                    }}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-medium px-2 py-1 rounded hover:bg-muted/50 transition-colors"
                    title="Sao chép nội dung caption"
                  >
                    <Copy size={12} />
                    <span>Sao chép</span>
                  </button>
                  {!isReadOnly && (
                    <button
                      onClick={() => setIsEditingCaption(!isEditingCaption)}
                      className="text-xs text-lime-brand hover:underline font-medium ml-1"
                    >
                      {isEditingCaption ? 'Xong' : 'Chỉnh sửa'}
                    </button>
                  )}
                </div>
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

          {contentItem.imageProvenance && (
            <div className="px-6 pb-4">
              <div className="rounded-xl border border-border bg-muted/20 p-3 text-xs">
                <p className="mb-2 font-semibold text-foreground">Nguồn gốc hình ảnh D02</p>
                <div className="space-y-1 text-muted-foreground">
                  <p>Chế độ: <span className="text-foreground">{contentItem.imageProvenance.generationMode || 'Không xác định'}</span></p>
                  <p>Ảnh nguồn: <span className="text-foreground">{contentItem.imageProvenance.sourceAssetId || 'Không dùng ảnh nguồn'}</span></p>
                  {contentItem.imageProvenance.selectionScore !== null && contentItem.imageProvenance.selectionScore !== undefined && <p>Điểm phù hợp: <span className="text-foreground">{contentItem.imageProvenance.selectionScore}/100</span></p>}
                  {contentItem.imageProvenance.selectionRationale && <p>Lý do chọn: <span className="text-foreground">{contentItem.imageProvenance.selectionRationale}</span></p>}
                </div>
              </div>
            </div>
          )}

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
                  disabled={Boolean(actionPending)}
                  className="flex-1 py-2 bg-amber-500 text-black text-xs font-bold rounded-lg hover:bg-amber-400 transition-colors flex items-center justify-center gap-1"
                >
                  {actionPending === 'rejected' ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />} Xác nhận từ chối
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
          {actionError && (
            <div role="alert" className="mx-6 mb-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-border flex-shrink-0 bg-card">
          {canMarkPosted && !actionDone && (
            <button
              id="mark-as-posted-btn"
              onClick={handleMarkPosted}
              disabled={Boolean(actionPending)}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 text-sm font-semibold rounded-lg hover:bg-blue-500/20 transition-all"
            >
              {actionPending === 'posted' ? <Loader2 size={14} className="animate-spin" /> : <CheckSquare size={14} />} Đánh dấu đã đăng
            </button>
          )}
          <div className="flex-1" />
          {canApprove && !showRejectForm && !actionDone && (
            <>
              <button
                id="reject-btn"
                onClick={() => setShowRejectForm(true)}
                disabled={Boolean(actionPending)}
                className="flex items-center gap-1.5 px-4 py-2.5 border border-border text-muted-foreground text-sm font-semibold rounded-lg hover:border-amber-500/50 hover:text-amber-400 hover:bg-amber-500/5 transition-all"
              >
                <XCircle size={14} /> Từ chối
              </button>
              <button
                id="approve-btn"
                onClick={handleApprove}
                disabled={Boolean(actionPending)}
                className="flex items-center gap-2 px-5 py-2.5 btn-lime-glow text-sm font-bold rounded-lg transition-all"
              >
                {actionPending === 'approved' ? <Loader2 size={14} className="animate-spin" /> : <ThumbsUp size={14} />} Duyệt bài
              </button>
            </>
          )}
          {!canApprove && !canMarkPosted && (
            <button
              onClick={onClose}
              className="px-4 py-2.5 border border-border text-muted-foreground text-sm font-semibold rounded-lg hover:bg-muted/50 transition-colors"
            >
              Đóng
            </button>
          )}
        </div>
      </div>
    </div>
  );

  if (!mounted) {
    return modalContent;
  }

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
}

