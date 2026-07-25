'use client';

import React, { useState } from 'react';
import PortalLayout from '@/components/layout/PortalLayout';
import MediaLibraryGrid from '@/components/assets/MediaLibraryGrid';
import { usePortal } from '@/lib/store';
import { Settings, Mic2, ImageIcon, Bot, Plug2, Save, CheckCircle2, Plus, X, ChevronDown } from 'lucide-react';

// ─── Tab 1: Brand Voice (6 Structured Sections) ──────────────────────────────
function BrandVoiceForm() {
  const { brandVoice, updateBrandVoice } = usePortal();
  const [form, setForm] = useState({ ...brandVoice });
  const [saved, setSaved] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'foundation' | 'tone' | 'dos_donts' | 'mechanics' | 'variations' | 'references'>('foundation');

  // Input helpers for lists
  const [newKeyword, setNewKeyword] = useState('');
  const [newForbidden, setNewForbidden] = useState('');
  const [newSignature, setNewSignature] = useState('');
  const [newBenchmark, setNewBenchmark] = useState('');
  const [newRefLink, setNewRefLink] = useState('');

  const handleSave = () => {
    updateBrandVoice(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const subTabs = [
    { id: 'foundation', label: '1. Brand Foundation', icon: '🏢' },
    { id: 'tone', label: '2. Tone & Personality', icon: '🎭' },
    { id: 'dos_donts', label: "3. Do's & Don'ts", icon: '🛑' },
    { id: 'mechanics', label: '4. Language Mechanics', icon: '✍️' },
    { id: 'variations', label: '5. Context Variations', icon: '🔀' },
    { id: 'references', label: '6. Reference Examples', icon: '📚' },
  ];

  return (
    <div className="max-w-3xl space-y-6">
      {/* Sub-tabs header */}
      <div className="flex flex-wrap gap-1.5 p-1.5 bg-muted/60 rounded-xl border border-border">
        {subTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === tab.id
                ? 'bg-background text-foreground shadow-sm border border-border'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Section 1: Brand Foundation */}
      {activeSubTab === 'foundation' && (
        <div className="space-y-4 bg-card border border-border rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            🏢 1. Brand Foundation (Nền tảng thương hiệu)
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Tên Thương Hiệu</label>
              <input
                type="text"
                value={form.brandName || ''}
                onChange={(e) => setForm((f) => ({ ...f, brandName: e.target.value }))}
                placeholder="VD: Bardinh Coffee"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Ngành hàng / Lĩnh vực</label>
              <input
                type="text"
                value={form.category || ''}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                placeholder="VD: Cà phê specialty & Không gian làm việc"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Tagline thương hiệu</label>
            <input
              type="text"
              value={form.tagline || ''}
              onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
              placeholder="VD: Góc lặng giữa lòng Sài Gòn sôi động"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Sứ mệnh / Giá trị cốt lõi ngắn gọn</label>
            <textarea
              rows={2}
              value={form.mission || ''}
              onChange={(e) => setForm((f) => ({ ...f, mission: e.target.value }))}
              placeholder="Mô tả sứ mệnh thương hiệu mang lại cho khách hàng…"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground resize-none focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Target Audience (Ai đọc content này, độ tuổi, insight)</label>
            <textarea
              rows={3}
              value={form.targetAudience || ''}
              onChange={(e) => setForm((f) => ({ ...f, targetAudience: e.target.value }))}
              placeholder="Mô tả chân dung khách hàng mục tiêu, sở thích, insight sâu sắc…"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground resize-none focus:outline-none focus:border-primary"
            />
          </div>
        </div>
      )}

      {/* Section 2: Tone & Personality */}
      {activeSubTab === 'tone' && (
        <div className="space-y-4 bg-card border border-border rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            🎭 2. Tone & Personality (Giọng điệu & Tính cách)
          </h3>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">3-5 Tính từ mô tả giọng thương hiệu</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {(form.personalityKeywords || []).map((kw, i) => (
                <span key={i} className="flex items-center gap-1.5 bg-muted text-foreground text-xs px-3 py-1 rounded-full border border-border font-medium">
                  {kw}
                  <button
                    onClick={() => setForm((f) => ({ ...f, personalityKeywords: f.personalityKeywords.filter((_, idx) => idx !== i) }))}
                    className="text-muted-foreground hover:text-red-400"
                  >
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newKeyword.trim()) {
                    setForm((f) => ({ ...f, personalityKeywords: [...(f.personalityKeywords || []), newKeyword.trim()] }));
                    setNewKeyword('');
                  }
                }}
                placeholder="Thêm tính từ (VD: gần gũi, ấm áp, tinh tế)…"
                className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-xs focus:outline-none focus:border-primary"
              />
              <button
                onClick={() => {
                  if (newKeyword.trim()) {
                    setForm((f) => ({ ...f, personalityKeywords: [...(f.personalityKeywords || []), newKeyword.trim()] }));
                    setNewKeyword('');
                  }
                }}
                className="px-3 py-2 border border-border rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50"
              >
                <Plus size={13} />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Brand Archetype (Brand như một con người là kiểu người nào?)</label>
            <input
              type="text"
              value={form.archetype || ''}
              onChange={(e) => setForm((f) => ({ ...f, archetype: e.target.value }))}
              placeholder="VD: Người bạn thân am hiểu cà phê — chân thành, mộc mạc nhưng gu thẩm mỹ tốt"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-muted-foreground">Mức độ Trang trọng vs Thân mật (Formality Scale)</label>
              <span className="text-xs font-bold text-lime-brand bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                {form.formalityScore || 4}/10 ({form.formalityScore <= 3 ? 'Rất thân mật' : form.formalityScore <= 6 ? 'Vừa phải gần gũi' : 'Chuyên nghiệp trang trọng'})
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={form.formalityScore || 4}
              onChange={(e) => setForm((f) => ({ ...f, formalityScore: Number(e.target.value) }))}
              className="w-full h-2 rounded-full cursor-pointer bg-muted"
            />
          </div>
        </div>
      )}

      {/* Section 3: Do's & Don'ts */}
      {activeSubTab === 'dos_donts' && (
        <div className="space-y-4 bg-card border border-border rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            {"🛑 3. Do's & Don'ts (Quy tắc & Ví dụ)"}
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1">✅ Ví dụ câu viết ĐÚNG tone</label>
              <textarea
                rows={4}
                value={form.goodCaptionExample || ''}
                onChange={(e) => setForm((f) => ({ ...f, goodCaptionExample: e.target.value }))}
                placeholder="Ví dụ caption mẫu viết chuẩn tone brand…"
                className="w-full px-3 py-2 bg-background border border-emerald-500/30 rounded-lg text-xs text-foreground resize-none focus:outline-none focus:border-emerald-500/60"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-red-600 dark:text-red-400 mb-1">❌ Ví dụ câu viết SAI tone (Tránh)</label>
              <textarea
                rows={4}
                value={form.badCaptionExample || ''}
                onChange={(e) => setForm((f) => ({ ...f, badCaptionExample: e.target.value }))}
                placeholder="Ví dụ caption bị lệch tone mà AI/nhân viên cần tuyệt đối tránh…"
                className="w-full px-3 py-2 bg-background border border-red-500/30 rounded-lg text-xs text-foreground resize-none focus:outline-none focus:border-red-500/60"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-red-600 dark:text-red-400 mb-1">🚫 Từ ngữ CẤM DÙNG (Forbidden words)</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {(form.forbiddenWords || []).map((w, i) => (
                <span key={i} className="flex items-center gap-1.5 bg-red-500/10 text-red-600 dark:text-red-400 text-xs px-3 py-1 rounded-full border border-red-500/20 font-medium">
                  {w}
                  <button onClick={() => setForm((f) => ({ ...f, forbiddenWords: f.forbiddenWords.filter((_, idx) => idx !== i) }))} className="text-red-400 hover:text-red-600">
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newForbidden}
                onChange={(e) => setNewForbidden(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newForbidden.trim()) {
                    setForm((f) => ({ ...f, forbiddenWords: [...(f.forbiddenWords || []), newForbidden.trim()] }));
                    setNewForbidden('');
                  }
                }}
                placeholder="Thêm từ cấm (VD: giá rẻ, xả hàng, khuyến mãi khủng)…"
                className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-xs focus:outline-none focus:border-red-500/50"
              />
              <button
                onClick={() => {
                  if (newForbidden.trim()) {
                    setForm((f) => ({ ...f, forbiddenWords: [...(f.forbiddenWords || []), newForbidden.trim()] }));
                    setNewForbidden('');
                  }
                }}
                className="px-3 py-2 border border-border rounded-lg text-xs text-muted-foreground hover:text-foreground"
              >
                <Plus size={13} />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-lime-brand mb-1">✨ Từ ngữ đặc trưng NÊN DÙNG (Signature words)</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {(form.signatureWords || []).map((w, i) => (
                <span key={i} className="flex items-center gap-1.5 bg-primary/10 text-lime-brand text-xs px-3 py-1 rounded-full border border-primary/30 font-medium">
                  {w}
                  <button onClick={() => setForm((f) => ({ ...f, signatureWords: f.signatureWords.filter((_, idx) => idx !== i) }))} className="text-lime-brand hover:opacity-75">
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newSignature}
                onChange={(e) => setNewSignature(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newSignature.trim()) {
                    setForm((f) => ({ ...f, signatureWords: [...(f.signatureWords || []), newSignature.trim()] }));
                    setNewSignature('');
                  }
                }}
                placeholder="Thêm từ đặc trưng (VD: nhâm nhi, thư thái, mộc mạc)…"
                className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-xs focus:outline-none focus:border-primary"
              />
              <button
                onClick={() => {
                  if (newSignature.trim()) {
                    setForm((f) => ({ ...f, signatureWords: [...(f.signatureWords || []), newSignature.trim()] }));
                    setNewSignature('');
                  }
                }}
                className="px-3 py-2 border border-border rounded-lg text-xs text-muted-foreground hover:text-foreground"
              >
                <Plus size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Section 4: Language Mechanics */}
      {activeSubTab === 'mechanics' && (
        <div className="space-y-4 bg-card border border-border rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            ✍️ 4. Language Mechanics (Quy tắc xưng hô & hành văn)
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Xưng hô Brand (Brand xưng là gì?)</label>
              <input
                type="text"
                value={form.brandPronoun || ''}
                onChange={(e) => setForm((f) => ({ ...f, brandPronoun: e.target.value }))}
                placeholder="VD: Bardinh / Chúng mình"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Xưng hô Khách (Gọi khách hàng là gì?)</label>
              <input
                type="text"
                value={form.customerPronoun || ''}
                onChange={(e) => setForm((f) => ({ ...f, customerPronoun: e.target.value }))}
                placeholder="VD: Bạn / Cậu"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Mức độ sử dụng Emoji</label>
            <select
              value={form.emojiUsage || 'moderate'}
              onChange={(e) => setForm((f) => ({ ...f, emojiUsage: e.target.value as any }))}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary"
            >
              <option value="none">🚫 Không dùng emoji</option>
              <option value="minimal">🔹 Tối thiểu (1-2 emoji điểm xuyết)</option>
              <option value="moderate">✨ Vừa phải (3-5 emoji đúng vị trí)</option>
              <option value="heavy">🔥 Nhiều (Sinh động, bắt mắt)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Độ dài câu, cách ngắt dòng, dấu câu đặc trưng</label>
            <textarea
              rows={2}
              value={form.sentenceStyle || ''}
              onChange={(e) => setForm((f) => ({ ...f, sentenceStyle: e.target.value }))}
              placeholder="VD: Câu ngắn, ngắt dòng tự nhiên như trò chuyện tâm sự. Dùng dấu gạch ngang (—) để tạo khoảng lặng."
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground resize-none focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Ngôn ngữ (Thuần Việt hay chêm tiếng Anh?)</label>
            <input
              type="text"
              value={form.languageMixing || ''}
              onChange={(e) => setForm((f) => ({ ...f, languageMixing: e.target.value }))}
              placeholder="VD: Thuần Việt mộc mạc. Chỉ dùng từ tiếng Anh phổ biến (Latte, Cold Brew, Workshop)"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary"
            />
          </div>
        </div>
      )}

      {/* Section 5: Context Variations */}
      {activeSubTab === 'variations' && (
        <div className="space-y-4 bg-card border border-border rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            🔀 5. Context Variations (Biến thể theo kênh & tình huống)
          </h3>
          <p className="text-xs text-muted-foreground">Tùy chỉnh tông giọng linh hoạt cho AI khi phát hành nội dung trên từng nền tảng hoặc tình huống cụ thể.</p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">🟦 Facebook Tone</label>
              <input
                type="text"
                value={form.facebookTone || ''}
                onChange={(e) => setForm((f) => ({ ...f, facebookTone: e.target.value }))}
                placeholder="VD: Trò chuyện sâu sắc, nhiều cảm xúc, caption 100-200 từ…"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">💬 Zalo Tone</label>
              <input
                type="text"
                value={form.zaloTone || ''}
                onChange={(e) => setForm((f) => ({ ...f, zaloTone: e.target.value }))}
                placeholder="VD: Ngắn gọn, rõ ràng, tập trung ưu đãi thành viên và lịch mở cửa…"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">🌐 Website / Blog Tone</label>
              <input
                type="text"
                value={form.websiteTone || ''}
                onChange={(e) => setForm((f) => ({ ...f, websiteTone: e.target.value }))}
                placeholder="VD: Chỉn chu, chuyên nghiệp, đào sâu vào nguồn gốc hạt cà phê và câu chuyện thương hiệu…"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">📣 Quảng cáo / Khuyến mãi Tone</label>
              <input
                type="text"
                value={form.promotionalTone || ''}
                onChange={(e) => setForm((f) => ({ ...f, promotionalTone: e.target.value }))}
                placeholder="VD: Nhẹ nhàng rủ rê ghé quán, không dồn ép mua hàng…"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">🙏 Xử lý khiếu nại / CSKH Tone</label>
              <input
                type="text"
                value={form.customerServiceTone || ''}
                onChange={(e) => setForm((f) => ({ ...f, customerServiceTone: e.target.value }))}
                placeholder="VD: Chân thành lắng nghe, nhận trách nhiệm ngay lập tức với sự cầu thị cao nhất…"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>
      )}

      {/* Section 6: Reference Examples */}
      {activeSubTab === 'references' && (
        <div className="space-y-4 bg-card border border-border rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            📚 6. Reference Examples (Content mẫu & Benchmark)
          </h3>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Caption mẫu chuẩn benchmark (Dành cho AI học tập)</label>
            <div className="space-y-2 mb-2">
              {(form.benchmarkCaptions || []).map((cap, i) => (
                <div key={i} className="p-3 bg-muted/40 border border-border rounded-lg text-xs text-foreground relative group">
                  <p className="pr-6 whitespace-pre-line">{cap}</p>
                  <button
                    onClick={() => setForm((f) => ({ ...f, benchmarkCaptions: f.benchmarkCaptions.filter((_, idx) => idx !== i) }))}
                    className="absolute top-2 right-2 text-muted-foreground hover:text-red-400"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <textarea
                rows={3}
                value={newBenchmark}
                onChange={(e) => setNewBenchmark(e.target.value)}
                placeholder="Dán caption mẫu chuẩn của thương hiệu tại đây…"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground resize-none focus:outline-none focus:border-primary"
              />
              <button
                onClick={() => {
                  if (newBenchmark.trim()) {
                    setForm((f) => ({ ...f, benchmarkCaptions: [...(f.benchmarkCaptions || []), newBenchmark.trim()] }));
                    setNewBenchmark('');
                  }
                }}
                className="px-3 py-2 border border-border rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center gap-1.5"
              >
                <Plus size={13} /> Thêm caption mẫu
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Link brand khác làm tốt (Benchmark bên ngoài)</label>
            <div className="space-y-1.5 mb-2">
              {(form.referenceLinks || []).map((link, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-muted/30 border border-border rounded-lg text-xs text-lime-brand font-mono">
                  <span>{link}</span>
                  <button onClick={() => setForm((f) => ({ ...f, referenceLinks: f.referenceLinks.filter((_, idx) => idx !== i) }))} className="text-muted-foreground hover:text-red-400">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newRefLink}
                onChange={(e) => setNewRefLink(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newRefLink.trim()) {
                    setForm((f) => ({ ...f, referenceLinks: [...(f.referenceLinks || []), newRefLink.trim()] }));
                    setNewRefLink('');
                  }
                }}
                placeholder="Dán URL trang Facebook/IG benchmark…"
                className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary"
              />
              <button
                onClick={() => {
                  if (newRefLink.trim()) {
                    setForm((f) => ({ ...f, referenceLinks: [...(f.referenceLinks || []), newRefLink.trim()] }));
                    setNewRefLink('');
                  }
                }}
                className="px-3 py-2 border border-border rounded-lg text-xs text-muted-foreground hover:text-foreground"
              >
                <Plus size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Save Button */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <p className="text-xs text-muted-foreground">Lưu cấu hình Brand Voice để các Agent (B02, D01, D02, E01) đồng bộ áp dụng.</p>
        <button
          id="save-brand-voice-btn"
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-2.5 bg-lime-brand text-black font-bold text-sm rounded-lg hover:opacity-90 shadow-md transition-all"
        >
          {saved ? <><CheckCircle2 size={15} /> Đã lưu thành công!</> : <><Save size={15} /> Lưu Cấu Hình Brand Voice</>}
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
