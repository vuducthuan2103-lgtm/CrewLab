'use client';

import React, { useState } from 'react';
import { usePortal } from '@/lib/store';
import { ContentPillar } from '@/lib/types';
import { Sparkles, Check, RotateCcw, Plus, Trash2, X } from 'lucide-react';

// ─── Pillar Bar — PRD §2c: slider + input số đồng bộ ────────────────────────
function PillarBar({ pillar, onUpdate }: { pillar: ContentPillar; onUpdate: (id: string, val: number) => void }) {
  return (
    <div className="border border-border rounded-xl p-4 bg-background hover:border-border/60 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{pillar.emoji}</span>
          <div>
            <p className="text-sm font-bold text-foreground">{pillar.label}</p>
            <p className="text-[11px] text-muted-foreground">{pillar.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* % input trực tiếp — đồng bộ với slider */}
          <div className="flex items-center gap-1 border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => onUpdate(pillar.id, Math.max(5, pillar.percentage - 5))}
              className="px-2 py-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 text-sm font-bold transition-colors"
            >
              −
            </button>
            <input
              type="number"
              value={pillar.percentage}
              onChange={(e) => {
                const val = Math.max(5, Math.min(85, Number(e.target.value)));
                onUpdate(pillar.id, val);
              }}
              className="w-10 py-1 text-sm font-bold text-foreground text-center bg-transparent focus:outline-none"
              min={5}
              max={85}
            />
            <span className="text-sm text-muted-foreground pr-1">%</span>
            <button
              onClick={() => onUpdate(pillar.id, Math.min(85, pillar.percentage + 5))}
              className="px-2 py-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 text-sm font-bold transition-colors"
            >
              +
            </button>
          </div>
          <button className="text-muted-foreground/50 hover:text-red-400 transition-colors p-1">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Slider thật (PRD: "slider + input số đồng bộ") */}
      <div className="mb-3">
        <input
          type="range"
          min={5}
          max={85}
          step={5}
          value={pillar.percentage}
          onChange={(e) => onUpdate(pillar.id, Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer bg-muted"
          style={{
            background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${((pillar.percentage - 5) / 80) * 100}%, hsl(var(--muted)) ${((pillar.percentage - 5) / 80) * 100}%, hsl(var(--muted)) 100%)`,
          }}

        />
      </div>

      {/* Platform ratio + angles */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] text-muted-foreground">
          🟥 FB {pillar.fbRatio}% · 🟦 IG {pillar.igRatio}%
        </span>
        <div className="flex flex-wrap gap-1 ml-auto">
          {pillar.angles.map((a) => (
            <span key={a.id} className="text-[10px] bg-muted text-muted-foreground rounded-full px-2 py-0.5 border border-border">
              {a.label}
            </span>
          ))}
          <button className="text-[10px] bg-muted/50 text-muted-foreground rounded-full px-2 py-0.5 border border-dashed border-border hover:border-[#D4FF00]/50 hover:text-[#D4FF00] transition-colors">
            + Thêm
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PillarSlider() {
  const { pillars, updatePillarPercentage, confirmPillars, resetPillarsToAI } = usePortal();
  const [confirmed, setConfirmed] = useState(false);
  const [rejected, setRejected] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectNote, setRejectNote] = useState('');

  const total = pillars.reduce((sum, p) => sum + p.percentage, 0);
  const isValid = total === 100;

  const handleConfirm = () => {
    confirmPillars();
    setConfirmed(true);
    setTimeout(() => setConfirmed(false), 2500);
  };

  const handleReject = () => {
    // PRD: "Từ chối" → agent B02 nhận feedback, đề xuất lại
    setRejected(true);
    setShowRejectForm(false);
    setTimeout(() => setRejected(false), 2500);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-foreground">Trụ nội dung & Góc khai thác</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Tuần 25 · Còn 72h để xác nhận</p>
        </div>
        {/* Total % indicator */}
        <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border ${
          isValid
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            : 'bg-red-500/10 text-red-400 border-red-500/30'
        }`}>
          Tổng: {total}%
          {isValid ? <Check size={12} /> : <span className="ml-1">≠ 100</span>}
        </div>
      </div>

      {/* AI Suggestion Banner */}
      <div className="flex items-start gap-3 p-4 mb-4 border border-primary/30 bg-primary/5 rounded-xl">
        <Sparkles size={16} className="text-lime-brand flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-xs font-semibold text-lime-brand mb-0.5">💡 B02 gợi ý</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Tăng <strong className="text-foreground">Behind the Scenes</strong> lên 35% — engagement tuần trước đạt <strong className="text-foreground">4.2%</strong> (cao nhất 3 tuần gần đây).
            Giảm Product Spotlight xuống 35% để cân bằng nội dung.
          </p>
        </div>
        <button
          id="apply-ai-suggestion"
          onClick={resetPillarsToAI}
          className="flex items-center gap-1 text-[10px] text-lime-brand border border-primary/30 rounded-lg px-2 py-1 hover:bg-primary/10 transition-colors flex-shrink-0 font-medium"
        >
          <RotateCcw size={10} /> Áp dụng
        </button>
      </div>

      {/* Pillar list */}
      <div className="space-y-3 mb-4">
        {pillars.map((p) => (
          <PillarBar key={p.id} pillar={p} onUpdate={updatePillarPercentage} />
        ))}
      </div>

      {/* Add pillar */}
      <button
        id="add-pillar-btn"
        className="w-full py-2.5 border border-dashed border-border text-xs text-muted-foreground rounded-xl hover:border-primary/50 hover:text-lime-brand transition-colors flex items-center justify-center gap-1.5 mb-4"
      >
        <Plus size={13} /> Thêm Trụ nội dung mới
      </button>

      {/* Reject with feedback form */}
      {showRejectForm && (
        <div className="mb-4 p-4 border border-amber-500/30 bg-amber-500/5 rounded-xl space-y-3">
          <div className="flex items-center gap-2">
            <X size={13} className="text-amber-500 dark:text-amber-400" />
            <span className="text-xs font-semibold text-amber-500 dark:text-amber-400">Gửi phản hồi cho B02</span>
          </div>
          <textarea
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            placeholder="Mô tả điều bạn muốn thay đổi — B02 sẽ đề xuất lại dựa trên phản hồi này…"
            rows={3}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-amber-500/50 resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setShowRejectForm(false)}
              className="flex-1 py-2 border border-border text-xs font-medium text-muted-foreground rounded-lg hover:bg-muted/50 transition-colors"
            >
              Huỷ
            </button>
            <button
              id="confirm-reject-pillars"
              onClick={handleReject}
              className="flex-1 py-2 bg-amber-500 text-black text-xs font-bold rounded-lg hover:bg-amber-400 transition-colors"
            >
              Gửi phản hồi cho B02
            </button>
          </div>
        </div>
      )}

      {/* Feedback banners */}
      {confirmed && (
        <div className="mb-3 p-3 rounded-xl bg-primary/10 border border-primary/30 text-lime-brand text-xs font-semibold flex items-center gap-2">
          <Check size={13} /> Trụ nội dung đã xác nhận! B03 sẽ bắt đầu lên kế hoạch.
        </div>
      )}
      {rejected && (
        <div className="mb-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 dark:text-amber-400 text-xs font-semibold flex items-center gap-2">
          <RotateCcw size={13} /> Đã gửi phản hồi — B02 đang đề xuất lại Trụ nội dung.
        </div>
      )}

      {/* Actions — theo PRD: [Đặt lại về đề xuất AI]  [Từ chối]  [Xác nhận ✓] */}
      <div className="flex items-center gap-2">
        <button
          id="reset-pillars-btn"
          onClick={resetPillarsToAI}
          className="flex items-center gap-1.5 px-4 py-2 border border-border text-xs font-medium text-muted-foreground rounded-lg hover:bg-muted/50 transition-colors"
        >
          <RotateCcw size={12} /> Đặt lại về đề xuất AI
        </button>
        <div className="flex-1" />
        {/* Từ chối — PRD §2c: [Từ chối] */}
        {!showRejectForm && (
          <button
            id="reject-pillars-btn"
            onClick={() => setShowRejectForm(true)}
            className="flex items-center gap-1.5 px-4 py-2 border border-border text-xs font-semibold text-muted-foreground rounded-lg hover:border-amber-500/50 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-amber-500/5 transition-all"
          >
            <X size={12} /> Từ chối
          </button>
        )}
        {/* Xác nhận ✓ */}
        <button
          id="confirm-pillars-btn"
          onClick={handleConfirm}
          disabled={!isValid || confirmed}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${
            isValid && !confirmed
              ? 'bg-lime-brand shadow-md hover:opacity-95'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          }`}
        >
          <Check size={14} />
          {confirmed ? 'Đã xác nhận!' : 'Xác nhận ✓'}
        </button>
      </div>

    </div>
  );
}
