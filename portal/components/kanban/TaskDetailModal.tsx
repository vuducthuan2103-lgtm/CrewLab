'use client';

import React, { useState } from 'react';
import { CircleAlert } from 'lucide-react';
import { TaskCard, ContentItem } from '@/lib/types';
import { AGENT_REGISTRY, humanizeTaskTitle, getSubtasksForTask } from '@/lib/taskHumanizer';
import { usePortal } from '@/lib/store';

interface TaskDetailModalProps {
  task: TaskCard;
  onClose: () => void;
}

export default function TaskDetailModal({ task, onClose }: TaskDetailModalProps) {
  const { contentItems, approveContent, rejectContent } = usePortal();
  const [rejectReason, setRejectReason] = useState<string>('tone_wrong');
  const [feedbackText, setFeedbackText] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const linkedItem = task.linkedContentItemId
    ? contentItems.find((ci) => ci.id === task.linkedContentItemId) || null
    : null;

  const agent = AGENT_REGISTRY[task.assigneeCode] || AGENT_REGISTRY.A01;
  const humanTitle = humanizeTaskTitle(task.assigneeCode, task.title, linkedItem);
  const subtasks = getSubtasksForTask(task, linkedItem);

  const canReview = task.column === 'review' || linkedItem?.state === 'pending_content_approval' || (Boolean(linkedItem?.caption) && linkedItem?.state === 'eval_failed');

  const handleApprove = async () => {
    if (!linkedItem) return;
    setIsSubmitting(true);
    try {
      await approveContent(linkedItem.id);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!linkedItem) return;
    setIsSubmitting(true);
    try {
      await rejectContent(linkedItem.id, rejectReason as any, feedbackText);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden text-zinc-100 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between p-6 border-b border-zinc-800 bg-zinc-900/40">
          <div className="space-y-2 max-w-lg">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-200">
                {agent.code} • {agent.name}
              </span>
              <span
                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                  task.column === 'done'
                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                    : task.column === 'in_progress'
                    ? 'bg-cyan-950/60 text-cyan-300 border-cyan-800/60'
                    : task.column === 'review'
                    ? 'bg-lime-500/15 text-lime-brand border-lime-500/30'
                    : task.hasError || linkedItem?.state === 'eval_failed'
                    ? 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                }`}
              >
                {task.column === 'done'
                  ? 'Hoàn thành'
                  : task.column === 'in_progress'
                  ? 'Đang xử lý'
                  : task.column === 'review'
                  ? 'Chờ duyệt'
                  : task.hasError || linkedItem?.state === 'eval_failed'
                  ? 'Tạm dừng / Lỗi AI'
                  : 'Chờ thực hiện'}
              </span>
            </div>
            <h2 className="text-base font-bold text-white leading-snug">{humanTitle}</h2>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 flex items-center justify-center transition-colors text-sm font-semibold"
          >
            ✕
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Alert Banner if Task Failed or Paused */}
          {(linkedItem?.state === 'eval_failed' || task.hasError) && (
            <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-600/40 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                <CircleAlert size={14} />
                <span>Thông báo trạng thái AI</span>
              </div>
              <p className="text-xs text-amber-200/90 leading-relaxed">
                {linkedItem?.fixInstructions || task.errorMessage || 'Tác vụ tạo ảnh AI tạm dừng do tài khoản nhà cung cấp hết credit.'}
              </p>
              {linkedItem?.caption && (
                <p className="text-[11px] text-zinc-400 italic">
                  💡 Caption bài viết đã được soạn thảo hoàn tất bên dưới. Bạn có thể bấm <strong>Phê duyệt & Sẵn sàng đăng bài</strong> để sử dụng bài viết này ngay (đăng dạng text hoặc tự bổ sung ảnh sau).
                </p>
              )}
            </div>
          )}

          {/* Section: Quy trình các bước thực hiện (Subtasks Timeline) */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Tiến trình các bước thực hiện
            </h3>
            <div className="space-y-2">
              {subtasks.map((step, idx) => (
                <div
                  key={step.id}
                  className={`p-3 rounded-xl border transition-all ${
                    step.status === 'done'
                      ? 'bg-zinc-900/40 border-zinc-800 text-zinc-200'
                      : step.status === 'in_progress'
                      ? 'bg-cyan-950/20 border-cyan-800/60 text-cyan-200'
                      : step.status === 'failed'
                      ? 'bg-amber-950/25 border-amber-800/70 text-amber-200'
                      : 'bg-zinc-950/40 border-zinc-900 text-zinc-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-mono font-bold ${
                          step.status === 'done'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-700'
                            : step.status === 'in_progress'
                            ? 'bg-cyan-950 text-cyan-400 border border-cyan-700'
                            : step.status === 'failed'
                            ? 'bg-amber-950 text-amber-400 border border-amber-700'
                            : 'bg-zinc-900 text-zinc-600 border border-zinc-800'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <span className="text-xs font-semibold">{step.title}</span>
                    </div>

                    <span className="text-[10px] font-mono">
                      {step.status === 'done' ? (
                        <span className="text-emerald-400">Xong</span>
                      ) : step.status === 'in_progress' ? (
                        <span className="text-cyan-400">Đang chạy...</span>
                      ) : step.status === 'failed' ? (
                        <span className="text-amber-400 font-bold">Chưa đạt / Tạm dừng</span>
                      ) : (
                        <span className="text-zinc-600">Chờ</span>
                      )}
                    </span>
                  </div>

                  {step.description && (
                    <p className="text-[11px] text-zinc-400 mt-1.5 ml-7.5 leading-relaxed">
                      {step.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Section: Thành phẩm đính kèm (Deliverable Preview) */}
          {linkedItem && (
            <div className="space-y-3 pt-3 border-t border-zinc-800/60">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Nội dung thành phẩm đính kèm
              </h3>

              <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white">{linkedItem.title}</span>
                  <span className="text-zinc-400 font-mono text-[11px]">
                    Kênh: {linkedItem.platform === 'both' ? 'Facebook & Instagram' : linkedItem.platform.toUpperCase()}
                  </span>
                </div>

                {linkedItem.imageUrl && (
                  <div className="relative rounded-lg overflow-hidden border border-zinc-800 max-h-56 bg-black flex items-center justify-center">
                    <img
                      src={linkedItem.imageUrl}
                      alt={linkedItem.title}
                      className="max-h-56 w-auto object-contain"
                    />
                  </div>
                )}

                {linkedItem.caption && (
                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800/80 text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto font-sans">
                    {linkedItem.caption}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section: Giao diện Phê duyệt nếu là Task Review hoặc bài viết có Caption */}
          {canReview && linkedItem && (
            <div className="p-4 rounded-xl bg-lime-950/20 border border-lime-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-lime-brand uppercase tracking-wider">
                  {linkedItem.state === 'eval_failed' ? 'Kiểm duyệt bài viết (Dạng Text)' : 'Yêu cầu bạn kiểm duyệt bài viết'}
                </span>
                <span className="text-[11px] text-zinc-400 font-medium">
                  {linkedItem.state === 'eval_failed' ? 'Duyệt dùng Caption đã hoàn tất' : 'Đã thẩm định chuẩn Brand Voice'}
                </span>
              </div>

              {!showRejectForm ? (
                <div className="flex items-center gap-3 pt-1">
                  <button
                    disabled={isSubmitting}
                    onClick={handleApprove}
                    className="flex-1 py-2.5 px-4 rounded-lg bg-lime-brand text-black font-bold text-xs hover:opacity-90 transition-opacity disabled:opacity-50 text-center"
                  >
                    {isSubmitting ? 'Đang xử lý...' : 'Phê duyệt & Sẵn sàng đăng bài'}
                  </button>
                  <button
                    disabled={isSubmitting}
                    onClick={() => setShowRejectForm(true)}
                    className="py-2.5 px-4 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-300 font-semibold text-xs hover:bg-zinc-800 transition-colors"
                  >
                    Yêu cầu viết lại
                  </button>
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-zinc-300">Lý do chưa ưng ý:</label>
                    <select
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="w-full text-xs bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-zinc-200 outline-none"
                    >
                      <option value="tone_wrong">Sai tông giọng thương hiệu</option>
                      <option value="info_incorrect">Thông tin món/giá chưa chính xác</option>
                      <option value="visual_poor">Ảnh chưa đẹp / chưa đúng món</option>
                      <option value="bad_timing">Thời điểm đăng chưa phù hợp</option>
                      <option value="other">Lý do khác</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-zinc-300">Ghi chú cụ thể cho AI:</label>
                    <textarea
                      rows={2}
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="Ví dụ: Giọng văn cần trẻ trung hơn, nhấn mạnh vào vị phô mai kéo sợi..."
                      className="w-full text-xs bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-zinc-200 placeholder:text-zinc-600 outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      disabled={isSubmitting || !feedbackText.trim()}
                      onClick={handleReject}
                      className="flex-1 py-2 px-3 rounded-lg bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      Gửi yêu cầu sửa
                    </button>
                    <button
                      onClick={() => setShowRejectForm(false)}
                      className="py-2 px-3 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/30 flex items-center justify-between">
          <div className="text-[11px] font-mono text-zinc-500">
            Khởi tạo: {new Date(task.createdAt).toLocaleString('vi-VN')}
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
