'use client';

import React, { useState } from 'react';
import PortalLayout from '@/components/layout/PortalLayout';
import MediaLibraryGrid from '@/components/assets/MediaLibraryGrid';
import { usePortal } from '@/lib/store';
import { Settings, Mic2, ImageIcon, Bot, Plug2, Save, CheckCircle2, Plus, X, ChevronDown } from 'lucide-react';

// ─── Tab 1: Brand Voice ───────────────────────────────────────────────────────
function BrandVoiceForm() {
  const { brandVoice, updateBrandVoice } = usePortal();
  const [form, setForm] = useState({ ...brandVoice });
  const [saved, setSaved] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [newAvoid, setNewAvoid] = useState('');

  const handleSave = () => {
    updateBrandVoice(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addKeyword = () => {
    if (newKeyword.trim()) {
      setForm((f) => ({ ...f, personalityKeywords: [...f.personalityKeywords, newKeyword.trim()] }));
      setNewKeyword('');
    }
  };

  const removeKeyword = (i: number) =>
    setForm((f) => ({ ...f, personalityKeywords: f.personalityKeywords.filter((_, idx) => idx !== i) }));

  const addAvoid = () => {
    if (newAvoid.trim()) {
      setForm((f) => ({ ...f, avoidPhrases: [...f.avoidPhrases, newAvoid.trim()] }));
      setNewAvoid('');
    }
  };

  const removeAvoid = (i: number) =>
    setForm((f) => ({ ...f, avoidPhrases: f.avoidPhrases.filter((_, idx) => idx !== i) }));

  return (
    <div className="max-w-2xl space-y-5">
      {/* Tone */}
      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
          Tông giọng thương hiệu
        </label>
        <textarea
          id="brand-voice-tone"
          rows={3}
          value={form.tone}
          onChange={(e) => setForm((f) => ({ ...f, tone: e.target.value }))}
          className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-[#D4FF00]/60 focus:ring-1 focus:ring-[#D4FF00]/20 resize-none"
        />
      </div>

      {/* Keywords */}
      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
          Từ khoá thương hiệu
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {form.personalityKeywords.map((kw, i) => (
            <span key={i} className="flex items-center gap-1.5 bg-muted text-foreground text-xs px-3 py-1 rounded-full border border-border">
              {kw}
              <button onClick={() => removeKeyword(i)} className="text-muted-foreground hover:text-red-400 transition-colors">
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
            placeholder="Thêm từ khoá…"
            className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-xs focus:outline-none focus:border-[#D4FF00]/60"
          />
          <button onClick={addKeyword} id="add-keyword-btn" className="px-3 py-2 border border-border rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            <Plus size={13} />
          </button>
        </div>
      </div>

      {/* Avoid phrases */}
      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
          Từ / cụm từ cần tránh
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {form.avoidPhrases.map((phrase, i) => (
            <span key={i} className="flex items-center gap-1.5 bg-red-500/10 text-red-400 text-xs px-3 py-1 rounded-full border border-red-500/20">
              {phrase}
              <button onClick={() => removeAvoid(i)} className="text-red-400/60 hover:text-red-400 transition-colors">
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newAvoid}
            onChange={(e) => setNewAvoid(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addAvoid()}
            placeholder="Thêm từ cần tránh…"
            className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-xs focus:outline-none focus:border-red-500/50"
          />
          <button onClick={addAvoid} id="add-avoid-btn" className="px-3 py-2 border border-border rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            <Plus size={13} />
          </button>
        </div>
      </div>

      {/* Good / Bad examples */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1.5">✅ Caption mẫu tốt</label>
          <textarea
            id="good-caption-example"
            rows={3}
            value={form.goodCaptionExample}
            onChange={(e) => setForm((f) => ({ ...f, goodCaptionExample: e.target.value }))}
            className="w-full px-3 py-2.5 bg-background border border-emerald-500/30 rounded-xl text-xs text-foreground resize-none focus:outline-none focus:border-emerald-500/60"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-red-400 uppercase tracking-wider mb-1.5">❌ Caption mẫu tệ</label>
          <textarea
            id="bad-caption-example"
            rows={3}
            value={form.badCaptionExample}
            onChange={(e) => setForm((f) => ({ ...f, badCaptionExample: e.target.value }))}
            className="w-full px-3 py-2.5 bg-background border border-red-500/30 rounded-xl text-xs text-foreground resize-none focus:outline-none focus:border-red-500/60"
          />
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          id="save-brand-voice-btn"
          onClick={handleSave}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#D4FF00] text-black font-bold text-sm rounded-lg hover:bg-[#E5FF55] shadow-[0_0_12px_rgba(212,255,0,0.25)] hover:shadow-[0_0_20px_rgba(212,255,0,0.45)] transition-all"
        >
          {saved ? <><CheckCircle2 size={14} /> Đã lưu!</> : <><Save size={14} /> Lưu Brand Voice</>}
        </button>
      </div>
    </div>
  );
}

// ─── Tab 3: Model & Budget ────────────────────────────────────────────────────
const MODEL_OPTIONS = [
  { value: 'gpt-4o', label: 'GPT-4o', tier: 'power', provider: 'OpenAI' },
  { value: 'gpt-4o-mini', label: 'GPT-4o mini', tier: 'standard', provider: 'OpenAI' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', tier: 'power', provider: 'Google' },
  { value: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet', tier: 'standard', provider: 'Anthropic' },
  { value: 'dall-e-3', label: 'DALL-E 3', tier: 'standard', provider: 'OpenAI (Image)' },
];

const AGENT_NAMES: Record<string, string> = {
  A01: '🧠 A01 Orchestrator', B02: '🧭 B02 Content Pillar', B03: '📅 B03 Content Plan',
  D01: '✍️ D01 Caption Writer', D02: '🎨 D02 Image Designer', E01: '✅ E01 Evaluator',
};

function ModelBudgetConfig() {
  const { agentModelConfigs, updateAgentModel, updateAgentBudget } = usePortal();

  return (
    <div className="max-w-2xl">
      <p className="text-xs text-muted-foreground mb-4">Thay đổi sẽ có hiệu lực từ task tiếp theo, không ảnh hưởng task đang chạy.</p>
      <div className="space-y-3">
        {agentModelConfigs.map((cfg) => (
          <div key={cfg.agentCode} className="p-4 border border-border rounded-xl bg-background">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-sm">
                  {AGENT_NAMES[cfg.agentCode]?.split(' ')[0]}
                </div>
                <span className="text-sm font-semibold text-foreground">{AGENT_NAMES[cfg.agentCode]?.slice(2)}</span>
              </div>

              <div className="flex items-center gap-3">
                {/* Model selector */}
                <div className="relative">
                  <select
                    id={`model-select-${cfg.agentCode}`}
                    value={cfg.selectedModel}
                    onChange={(e) => {
                      const m = MODEL_OPTIONS.find((o) => o.value === e.target.value);
                      updateAgentModel(cfg.agentCode, e.target.value, m?.tier || 'standard');
                    }}
                    className="appearance-none pl-3 pr-7 py-2 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-[#D4FF00]/60 cursor-pointer"
                  >
                    {MODEL_OPTIONS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label} ({m.provider})</option>
                    ))}
                  </select>
                  <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>

                {/* Tier badge */}
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  cfg.tier === 'power'
                    ? 'bg-[#D4FF00]/10 text-[#D4FF00] border-[#D4FF00]/30'
                    : 'bg-muted text-muted-foreground border-border'
                }`}>
                  {cfg.tier.toUpperCase()}
                </span>

                {/* Budget */}
                <div className="flex items-center gap-1.5 border border-border rounded-lg px-3 py-1.5">
                  <span className="text-xs text-muted-foreground">$</span>
                  <input
                    type="number"
                    id={`budget-${cfg.agentCode}`}
                    value={cfg.budgetUSD}
                    onChange={(e) => updateAgentBudget(cfg.agentCode, Number(e.target.value))}
                    className="w-12 text-xs text-foreground bg-transparent focus:outline-none text-center"
                    min={1}
                    max={100}
                  />
                  <span className="text-[10px] text-muted-foreground">/tháng</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 border border-border rounded-xl bg-muted/20 flex items-center gap-2">
        <Bot size={13} className="text-muted-foreground" />
        <p className="text-xs text-muted-foreground">
          Tổng ngân sách dự kiến:{' '}
          <span className="font-semibold text-foreground">
            ${agentModelConfigs.reduce((s, c) => s + c.budgetUSD, 0).toFixed(0)} USD/tháng
          </span>
        </p>
      </div>
    </div>
  );
}

// ─── Tab 4: Integration ───────────────────────────────────────────────────────
function MetaIntegrationTab() {
  return (
    <div className="max-w-lg">
      <div className="border border-border rounded-xl p-5 bg-background">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-sm">f</div>
            <div>
              <p className="text-sm font-semibold text-foreground">Meta (Facebook & Instagram)</p>
              <p className="text-xs text-muted-foreground">Fanpage của bạn</p>
            </div>
          </div>
          <span className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-full">
            <CheckCircle2 size={12} /> Đã kết nối
          </span>
        </div>
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between py-1.5 border-b border-border">
            <span className="text-muted-foreground">Page đang kết nối</span>
            <span className="font-medium text-foreground">Bardinh Coffee</span>
          </div>
          <div className="flex items-center justify-between py-1.5 border-b border-border">
            <span className="text-muted-foreground">Trạng thái Instagram</span>
            <span className="font-medium text-foreground">Đã kết nối</span>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <span className="text-muted-foreground">Cấu hình token</span>
            <span className="text-muted-foreground italic">Liên hệ Agency Admin để cập nhật</span>
          </div>
        </div>
        <div className="mt-4 p-3 bg-muted/30 rounded-lg">
          <p className="text-[11px] text-muted-foreground">
            💡 Kết nối và làm mới token Meta do Agency Admin (CrewLab) thực hiện. Bạn chỉ cần theo dõi trạng thái kết nối tại đây.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Settings Page ────────────────────────────────────────────────────────────
const SETTINGS_TABS = [
  { key: 'brand_voice', label: 'Brand Voice', icon: <Mic2 size={13} /> },
  { key: 'media', label: 'Thư viện ảnh', icon: <ImageIcon size={13} /> },
  { key: 'model', label: 'Model & Ngân sách', icon: <Bot size={13} /> },
  { key: 'integration', label: 'Tích hợp', icon: <Plug2 size={13} /> },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('brand_voice');

  return (
    <PortalLayout>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-[#D4FF00]/10 border border-[#D4FF00]/30 flex items-center justify-center">
          <Settings size={15} className="text-[#D4FF00]" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">Cài đặt thương hiệu</h1>
          <p className="text-xs text-muted-foreground">Bardinh Coffee</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 mb-6 border-b border-border">
        {SETTINGS_TABS.map(({ key, label, icon }) => (
          <button
            key={key}
            id={`settings-tab-${key}`}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${
              activeTab === key
                ? 'border-[#D4FF00] text-[#D4FF00]'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {activeTab === 'brand_voice' && <BrandVoiceForm />}
      {activeTab === 'media' && <MediaLibraryGrid />}
      {activeTab === 'model' && <ModelBudgetConfig />}
      {activeTab === 'integration' && <MetaIntegrationTab />}
    </PortalLayout>
  );
}
