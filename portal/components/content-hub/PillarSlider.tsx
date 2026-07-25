'use client';

import React, { useState } from 'react';
import { usePortal } from '@/lib/store';
import { ContentPillar } from '@/lib/types';
import { Sparkles, Check, RotateCcw, Plus, Trash2, ChevronDown } from 'lucide-react';

function PillarBar({ pillar, onUpdate }: { pillar: ContentPillar; onUpdate: (id: string, val: number) => void }) {
  const total = 100; // context
  const barWidth = `${pillar.percentage}%`;

  return (
    <div className="border border-border rounded-xl p-4 bg-background hover:border-border/80 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{pillar.emoji}</span>
          <div>
            <p className="text-sm font-bold text-foreground">{pillar.label}</p>
            <p className="text-[11px] text-muted-foreground">{pillar.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => onUpdate(pillar.id, Math.max(5, pillar.percentage - 5))}
              className="px-2 py-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 text-sm font-bold transition-colors"
            >
              −
            </button>
            <span className="px-2 py-1 text-sm font-bold text-foreground min-w-[3ch] text-center">
              {pillar.percentage}%
            </span>
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

      {/* Progress bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
        <div
          className="h-full rounded-full transition-all duration-300 bg-[#D4FF00]"
          style={{ width: barWidth, boxShadow: '0 0 8px rgba(212,255,0,0.4)' }}
        />
      </div>

      {/* Platform ratio + angles */}
      <div className="flex items-center gap-3 mt-2">
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

export default function PillarSlider() {
  const { pillars, updatePillarPercentage, confirmPillars, resetPillarsToAI } = usePortal();
  const [confirmed, setConfirmed] = useState(false);

  const total = pillars.reduce((sum, p) => sum + p.percentage, 0);
  const isValid = total === 100;

  const handleConfirm = () => {
    confirmPillars();
    setConfirmed(true);
    setTimeout(() => setConfirmed(false), 2000);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-foreground">Trụ nội dung & Góc khai thác</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Tuần 25 · Còn 72h để xác nhận</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Total indicator */}
          <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border ${
            isValid
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'bg-red-500/10 text-red-400 border-red-500/30'
          }`}>
            Tổng: {total}%
            {isValid ? <Check size={12} /> : <span className="ml-1">≠ 100</span>}
          </div>
        </div>
      </div>

      {/* AI Suggestion Banner */}
      <div className="flex items-start gap-3 p-4 mb-4 border border-[#D4FF00]/20 bg-[#D4FF00]/5 rounded-xl">
        <Sparkles size={16} className="text-[#D4FF00] flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-xs font-semibold text-[#D4FF00] mb-0.5">💡 B02 gợi ý</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Tăng <strong className="text-foreground">Behind the Scenes</strong> lên 35% — engagement tuần trước đạt <strong className="text-foreground">4.2%</strong> (cao nhất 3 tuần gần đây).
            Giảm Product Spotlight xuống 35% để cân bằng nội dung.
          </p>
        </div>
        <button
          id="reset-to-ai"
          onClick={resetPillarsToAI}
          className="flex items-center gap-1 text-[10px] text-[#D4FF00] border border-[#D4FF00]/30 rounded-lg px-2 py-1 hover:bg-[#D4FF00]/10 transition-colors flex-shrink-0 font-medium"
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
        className="w-full py-2.5 border border-dashed border-border text-xs text-muted-foreground rounded-xl hover:border-[#D4FF00]/40 hover:text-[#D4FF00] transition-colors flex items-center justify-center gap-1.5 mb-4"
      >
        <Plus size={13} /> Thêm Trụ nội dung mới
      </button>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          id="reset-pillars"
          onClick={resetPillarsToAI}
          className="flex items-center gap-1.5 px-4 py-2 border border-border text-xs font-medium text-muted-foreground rounded-lg hover:bg-muted/50 transition-colors"
        >
          <RotateCcw size={12} /> Đặt lại về đề xuất AI
        </button>
        <div className="flex-1" />
        <button
          id="confirm-pillars-btn"
          onClick={handleConfirm}
          disabled={!isValid}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${
            isValid
              ? 'bg-[#D4FF00] text-black hover:bg-[#E5FF55] shadow-[0_0_14px_rgba(212,255,0,0.3)] hover:shadow-[0_0_22px_rgba(212,255,0,0.5)]'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          }`}
        >
          {confirmed ? (
            <><Check size={14} /> Đã xác nhận!</>
          ) : (
            <><Check size={14} /> Xác nhận ✓</>
          )}
        </button>
      </div>
    </div>
  );
}
