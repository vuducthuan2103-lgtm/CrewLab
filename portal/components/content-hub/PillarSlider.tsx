'use client';

import React, { useState } from 'react';
import { Check, Layers3, Lightbulb, RotateCcw, Sparkles } from 'lucide-react';
import { ContentPillar } from '@/lib/types';
import { usePortal } from '@/lib/store';

function PillarEditor({ pillar }: { pillar: ContentPillar }) {
  const { updatePillarPercentage, updatePillarDraft } = usePortal();
  const [newAngle, setNewAngle] = useState('');

  const addAngle = () => {
    const label = newAngle.trim();
    if (!label) return;
    updatePillarDraft(pillar.id, { angles: [...pillar.angles, { id: `${pillar.id}-${Date.now()}`, label }] });
    setNewAngle('');
  };

  return (
    <article className="rounded-xl border border-border bg-background p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground"><Layers3 size={15} /></span>
        <div className="min-w-0 flex-1 space-y-2">
          <input aria-label="Tên trụ nội dung" value={pillar.label} onChange={(event) => updatePillarDraft(pillar.id, { label: event.target.value })} className="w-full rounded bg-transparent px-1 text-sm font-bold text-foreground outline-none ring-primary focus:ring-1" />
          <input aria-label="Mô tả trụ nội dung" value={pillar.description} onChange={(event) => updatePillarDraft(pillar.id, { description: event.target.value })} className="w-full rounded bg-transparent px-1 text-xs text-muted-foreground outline-none ring-primary focus:ring-1" />
        </div>
        <div className="flex items-center rounded-lg border border-border">
          <button type="button" onClick={() => updatePillarPercentage(pillar.id, pillar.percentage - 5)} className="px-2 py-1 text-sm text-muted-foreground hover:text-foreground">−</button>
          <input aria-label="Tỷ trọng pillar" type="number" min={5} max={85} value={pillar.percentage} onChange={(event) => updatePillarPercentage(pillar.id, Number(event.target.value))} className="w-10 bg-transparent py-1 text-center text-sm font-bold outline-none" />
          <span className="pr-2 text-xs text-muted-foreground">%</span>
          <button type="button" onClick={() => updatePillarPercentage(pillar.id, pillar.percentage + 5)} className="px-2 py-1 text-sm text-muted-foreground hover:text-foreground">+</button>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <input
          aria-label="Điều chỉnh tỷ trọng"
          type="range"
          min={5}
          max={85}
          step={5}
          value={pillar.percentage}
          onChange={(event) => updatePillarPercentage(pillar.id, Number(event.target.value))}
          style={{
            background: `linear-gradient(to right, #D4FF00 0%, #D4FF00 ${pillar.percentage}%, #27272A ${pillar.percentage}%, #27272A 100%)`,
          }}
          className="pillar-slider w-full cursor-pointer transition-all focus:ring-2 focus:ring-lime-brand/40"
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[10px] text-muted-foreground">Angles:</span>
        {pillar.angles.map((angle) => <button type="button" key={angle.id} onClick={() => updatePillarDraft(pillar.id, { angles: pillar.angles.filter((item) => item.id !== angle.id) })} title="Bỏ angle" className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] text-muted-foreground hover:border-red-400 hover:text-red-400">{angle.label} ×</button>)}
        <input value={newAngle} onChange={(event) => setNewAngle(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addAngle(); } }} placeholder="Thêm angle" className="w-24 rounded-full border border-dashed border-border bg-transparent px-2 py-0.5 text-[10px] outline-none focus:border-primary" />
        <button type="button" onClick={addAngle} className="rounded-full border border-dashed border-border px-2 py-0.5 text-[10px] text-muted-foreground hover:border-primary hover:text-lime-brand">+ Thêm</button>
      </div>
    </article>
  );
}

export default function PillarSlider() {
  const { pillars, confirmPillars, resetPillarsToAI, refreshData } = usePortal();
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const total = pillars.reduce((sum, pillar) => sum + pillar.percentage, 0);
  const isValid = total === 100 && pillars.length >= 2 && pillars.length <= 5 && pillars.every((pillar) => pillar.label.trim() && pillar.angles.length > 0);

  const requestAIPillars = async () => {
    setGenerating(true); setMessage(null);
    try {
      const { apiStartWeeklyPreview } = await import('@/lib/api');
      await apiStartWeeklyPreview();
      setMessage('AI (B02) đang tạo bản nháp Trụ nội dung — vui lòng chờ giây lát...');
      setTimeout(async () => {
        await refreshData();
        setGenerating(false);
      }, 3000);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể gửi yêu cầu tạo trụ nội dung.');
      setGenerating(false);
    }
  };

  const confirm = async () => {
    setSaving(true); setMessage(null);
    try {
      await confirmPillars();
      setMessage('Đã xác nhận trụ nội dung. AI (B03) đang lên lịch và tạo các bài đăng theo đúng tỷ trọng các trụ này.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể lưu trụ nội dung.');
    } finally {
      setSaving(false);
    }
  };

  if (!pillars.length) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center bg-card/50">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-lime-brand/10 border border-lime-brand/20 text-lime-brand">
          <Sparkles size={22} />
        </div>
        <h3 className="text-sm font-bold text-foreground">Chưa có Trụ nội dung cho tuần này</h3>
        <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground leading-relaxed">
          AI (B02) sẽ dựa vào Brand Voice của quán để tự động đề xuất các Trụ nội dung, Góc khai thác (Angles) và tỷ trọng phù hợp nhất.
        </p>
        <button
          type="button"
          disabled={generating}
          onClick={requestAIPillars}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-lime-brand px-4 py-2 text-xs font-bold text-black hover:opacity-90 disabled:opacity-50"
        >
          <Sparkles size={14} />
          {generating ? 'AI đang đề xuất...' : 'Nhờ AI gợi ý Trụ nội dung'}
        </button>
        {message && <p className="mt-3 text-xs text-foreground bg-muted/40 p-2 rounded-lg border border-border inline-block">{message}</p>}
      </div>
    );
  }

  return <div>
    <div className="mb-4 flex items-start justify-between gap-4"><div><h2 className="text-base font-bold text-foreground">Trụ nội dung & Angle</h2><p className="mt-1 text-xs text-muted-foreground">Chỉnh trực tiếp tên, mô tả, tỷ trọng và góc khai thác trước khi B03 lập lịch tuần.</p></div><span className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-bold ${isValid ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-red-500/30 bg-red-500/10 text-red-400'}`}>Tổng: {total}%</span></div>
    <div className="mb-4 flex gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4"><Sparkles size={16} className="mt-0.5 shrink-0 text-lime-brand" /><p className="text-xs leading-relaxed text-muted-foreground"><span className="font-semibold text-lime-brand">B02 gợi ý.</span> Mỗi pillar cần ít nhất một angle. Tổng tỷ trọng phải bằng 100% để đảm bảo B03 phân bổ đủ bài trong tuần.</p><button type="button" onClick={resetPillarsToAI} className="ml-auto shrink-0 text-xs text-lime-brand hover:opacity-80"><RotateCcw size={12} className="mr-1 inline" />Đặt lại</button></div>
    <div className="space-y-3">{pillars.map((pillar) => <PillarEditor key={pillar.id} pillar={pillar} />)}</div>
    {message && <p className="mt-4 rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs text-foreground">{message}</p>}
    <div className="mt-4 flex justify-end"><button id="confirm-pillars-btn" type="button" disabled={!isValid || saving} onClick={confirm} className="rounded-lg bg-lime-brand px-5 py-2 text-sm font-bold text-black disabled:cursor-not-allowed disabled:opacity-50"><Check size={14} className="mr-2 inline" />{saving ? 'Đang xác nhận...' : 'Xác nhận trụ nội dung'}</button></div>
  </div>;
}

