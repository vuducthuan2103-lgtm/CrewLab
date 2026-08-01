'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/layout/AdminLayout';
import AdminHeader from '@/components/layout/AdminHeader';
import { ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const totalSteps = 9;

  // Mock State for Wizard
  const [form, setForm] = useState({
    name: '',
    vertical: 'Cafe & F&B',
    timezone: 'Asia/Ho_Chi_Minh',
    desc: '',
    platforms: ['facebook'],
    postsPerWeek: 6,
    budget: 50,
  });

  const nextStep = () => setStep((s) => Math.min(s + 1, totalSteps));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const renderProgressBar = () => (
    <div className="flex items-center justify-between mb-8 relative">
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-muted/50 -z-10 rounded" />
      <div 
        className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-lime-admin -z-10 rounded transition-all duration-300"
        style={{ width: `${((step - 1) / (totalSteps - 1)) * 100}%` }}
      />
      {Array.from({ length: totalSteps }).map((_, i) => {
        const isActive = step >= i + 1;
        return (
          <div 
            key={i} 
            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 
              ${isActive ? 'bg-lime-admin text-black border-lime-admin shadow-glow-lime-sm' : 'bg-card text-muted-foreground border-border'}`}
          >
            {i + 1}
          </div>
        );
      })}
    </div>
  );

  return (
    <AdminLayout>
      <AdminHeader
        title="Onboard Client Mới"
        subtitle="Thiết lập 9 bước để đưa client vào hệ thống"
      />
      <div className="max-w-3xl mx-auto px-6 py-8">
        {renderProgressBar()}

        <div className="bg-card border border-border rounded-xl p-6 shadow-sm min-h-[400px] flex flex-col">
          
          {/* STEP 1: Thông tin cơ bản */}
          {step === 1 && (
            <div className="flex-1">
              <h2 className="text-lg font-bold text-foreground mb-4">Bước 1 — Thông tin cơ bản</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Tên client *</label>
                  <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm focus:border-lime-admin outline-none text-foreground" placeholder="VD: Bardinh Coffee" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Vertical *</label>
                  <select value={form.vertical} onChange={e => setForm({...form, vertical: e.target.value})} className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm focus:border-lime-admin outline-none text-foreground">
                    <option>Cafe & F&B</option>
                    <option>Nhà Hàng</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Timezone *</label>
                  <select value={form.timezone} onChange={e => setForm({...form, timezone: e.target.value})} className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm focus:border-lime-admin outline-none text-foreground">
                    <option>Asia/Ho_Chi_Minh</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Mô tả ngắn (internal)</label>
                  <textarea value={form.desc} onChange={e => setForm({...form, desc: e.target.value})} className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm focus:border-lime-admin outline-none h-20 text-foreground" />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Nền tảng */}
          {step === 2 && (
            <div className="flex-1">
              <h2 className="text-lg font-bold text-foreground mb-4">Bước 2 — Nền tảng & lịch đăng bài</h2>
              <div className="space-y-4 text-sm">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-2">Platform *</label>
                  <div className="flex gap-4 text-foreground">
                    <label className="flex items-center gap-2"><input type="checkbox" checked={form.platforms.includes('facebook')} onChange={() => {}} className="accent-lime-admin"/> Facebook</label>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={form.platforms.includes('instagram')} onChange={() => {}} className="accent-lime-admin"/> Instagram</label>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Số bài/tuần *</label>
                  <input type="number" value={form.postsPerWeek} onChange={e => setForm({...form, postsPerWeek: Number(e.target.value)})} className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm focus:border-lime-admin outline-none text-foreground" />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: ChromaDB */}
          {step === 3 && (
            <div className="flex-1">
              <h2 className="text-lg font-bold text-foreground mb-4">Bước 3 — Khởi tạo ChromaDB</h2>
              <p className="text-sm text-muted-foreground mb-4">Hệ thống sẽ tạo 3 collections riêng cho client này.</p>
              <button className="bg-muted/50 border border-border px-4 py-2 text-foreground rounded-lg text-sm font-bold flex items-center gap-2 mb-4 hover:bg-muted transition-colors">
                <RefreshCw size={14} /> Khởi tạo ChromaDB
              </button>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-emerald-400"><CheckCircle2 size={16}/> {form.name ? form.name.toLowerCase().replace(/\s+/g,'-') : 'client'}_brand — OK</div>
                <div className="flex items-center gap-2 text-emerald-400"><CheckCircle2 size={16}/> {form.name ? form.name.toLowerCase().replace(/\s+/g,'-') : 'client'}_content_history — OK</div>
                <div className="flex items-center gap-2 text-emerald-400"><CheckCircle2 size={16}/> {form.name ? form.name.toLowerCase().replace(/\s+/g,'-') : 'client'}_tmp — OK</div>
              </div>
            </div>
          )}

          {/* STEP 4: Memory Banks */}
          {step === 4 && (
            <div className="flex-1">
              <h2 className="text-lg font-bold text-foreground mb-4">Bước 4 — Khởi tạo Hindsight Memory Banks</h2>
              <button className="bg-muted/50 border border-border px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 mb-4 hover:bg-muted transition-colors text-foreground">
                <RefreshCw size={14} /> Khởi tạo Memory Banks
              </button>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-emerald-400"><CheckCircle2 size={16}/> A01 · B01 · B02 · B03 · D01 · D02 · E01 · F01</div>
                <div className="flex items-center gap-2 text-emerald-400"><CheckCircle2 size={16}/> G01 · G02 · G03 · G04 · H01</div>
                <div className="text-muted-foreground mt-2 font-mono text-xs">13/13 banks sẵn sàng</div>
              </div>
            </div>
          )}

          {/* STEP 5: Upload Brand */}
          {step === 5 && (
            <div className="flex-1">
              <h2 className="text-lg font-bold text-foreground mb-4">Bước 5 — Upload tài liệu brand</h2>
              <div className="border-2 border-dashed border-border rounded-xl p-8 flex items-center justify-center text-muted-foreground text-sm cursor-pointer hover:border-lime-admin/50 transition-colors mb-4">
                + Kéo thả file hoặc click để chọn (PDF, DOCX, TXT, MD)
              </div>
              <button className="bg-muted/50 border border-border px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 mb-4 hover:bg-muted transition-colors text-foreground">
                <RefreshCw size={14} /> Ingest vào ChromaDB
              </button>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-emerald-400"><CheckCircle2 size={16}/> menu_2026.pdf — 47 chunks</div>
              </div>
            </div>
          )}

          {/* STEP 6: Admin User */}
          {step === 6 && (
            <div className="flex-1">
              <h2 className="text-lg font-bold text-foreground mb-4">Bước 6 — Tạo Client Admin User</h2>
              <div className="space-y-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Email *</label>
                  <input type="email" className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm focus:border-lime-admin outline-none text-foreground" defaultValue="client@example.com" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Tên hiển thị *</label>
                  <input type="text" className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm focus:border-lime-admin outline-none text-foreground" defaultValue={form.name ? `Admin - ${form.name}` : 'Admin'} />
                </div>
              </div>
              <button className="bg-muted/50 border border-border px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 mb-4 hover:bg-muted transition-colors text-foreground">
                Tạo tài khoản
              </button>
              <div className="flex items-center gap-2 text-sm text-emerald-400"><CheckCircle2 size={16}/> User đã tạo · Email đặt mật khẩu đã gửi</div>
            </div>
          )}

          {/* STEP 7: Meta */}
          {step === 7 && (
            <div className="flex-1">
              <h2 className="text-lg font-bold text-foreground mb-4">Bước 7 — Kết nối Meta</h2>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 mb-4 transition-colors">
                Kết nối tài khoản Meta
              </button>
              <div className="flex items-center gap-2 text-sm text-emerald-400 mb-4"><CheckCircle2 size={16}/> Đã xác thực</div>
              <div className="space-y-2 text-sm text-foreground">
                <p>Chọn Facebook Page: <span className="font-bold">{form.name || 'Client'} (ID: 123456789)</span></p>
                <p>Chọn Instagram Account: <span className="font-bold">@{form.name?.replace(/\s+/g,'').toLowerCase() || 'client'} (ID: 987654321)</span></p>
              </div>
            </div>
          )}

          {/* STEP 8: Budget */}
          {step === 8 && (
            <div className="flex-1">
              <h2 className="text-lg font-bold text-foreground mb-4">Bước 8 — LLM Provider & Budget</h2>
              <div className="space-y-6">
                <div className="p-4 rounded-xl border border-border bg-muted/20">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-foreground">ANTHROPIC</span>
                    <span className="text-xs text-lime-admin font-bold bg-lime-admin/10 px-2 py-0.5 rounded border border-lime-admin/20">Bật</span>
                  </div>
                  <input type="password" value="sk-ant-123456" readOnly className="w-full bg-muted/50 border border-border rounded px-3 py-1.5 text-xs mb-2 outline-none text-foreground" />
                  <div className="flex items-center gap-2 text-xs text-emerald-400"><CheckCircle2 size={14}/> Hợp lệ — Sonnet 4.6, Haiku 4.5 available</div>
                </div>

                <div className="p-4 rounded-xl border border-border bg-muted/20">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-foreground">OPENAI</span>
                    <span className="text-xs text-lime-admin font-bold bg-lime-admin/10 px-2 py-0.5 rounded border border-lime-admin/20">Bật</span>
                  </div>
                  <input type="password" value="sk-123456" readOnly className="w-full bg-muted/50 border border-border rounded px-3 py-1.5 text-xs mb-2 outline-none text-foreground" />
                  <div className="flex items-center gap-2 text-xs text-emerald-400"><CheckCircle2 size={14}/> Hợp lệ — GPT-Image-2 available</div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Ngân sách tổng/tháng *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <input type="number" value={form.budget} onChange={e => setForm({...form, budget: Number(e.target.value)})} className="w-full bg-muted/30 border border-border rounded-lg pl-8 pr-3 py-2 text-sm focus:border-lime-admin outline-none text-foreground" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 9: Smoke Test */}
          {step === 9 && (
            <div className="flex-1">
              <h2 className="text-lg font-bold text-foreground mb-4">Bước 9 — Đăng ký tự động & Smoke Test</h2>
              <p className="text-sm text-muted-foreground mb-4">Các task tự động sẽ tạo: weekly_cycle (T2 06:00), reflect_job (T2 04:00)...</p>
              
              <button className="bg-lime-admin text-black px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 mb-4 hover:bg-lime-400 transition-colors">
                <RefreshCw size={14} /> Kích hoạt & Chạy Smoke Test
              </button>

              <div className="space-y-2 text-sm mb-6">
                <div className="flex items-center gap-2 text-emerald-400"><CheckCircle2 size={16}/> ChromaDB collections — Accessible</div>
                <div className="flex items-center gap-2 text-emerald-400"><CheckCircle2 size={16}/> Hindsight Memory Banks — 13/13 respond</div>
                <div className="flex items-center gap-2 text-emerald-400"><CheckCircle2 size={16}/> Celery task dispatch — Test task thành công</div>
                <div className="flex items-center gap-2 text-emerald-400"><CheckCircle2 size={16}/> Meta API token — Valid</div>
                <div className="flex items-center gap-2 text-emerald-400"><CheckCircle2 size={16}/> Client Portal login — OK</div>
                <div className="flex items-center gap-2 text-emerald-400"><CheckCircle2 size={16}/> LLM Provider — Anthropic + OpenAI test call thành công</div>
                <div className="text-muted-foreground mt-2 font-mono text-xs">6/6 checks passed</div>
              </div>

              <div className="p-4 bg-lime-admin/10 border border-lime-admin/20 rounded-xl">
                <h3 className="font-bold text-lime-admin text-lg mb-1">🎉 {form.name || 'Client'} đã sẵn sàng!</h3>
                <p className="text-sm text-foreground">Cycle đầu tiên: Thứ 2 lúc 06:00</p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-4 border-t border-border">
            {step > 1 ? (
              <button onClick={prevStep} className="px-4 py-2 rounded-lg text-sm font-bold border border-border bg-card hover:bg-muted/50 transition-colors flex items-center gap-2 text-foreground">
                <ChevronLeft size={16} /> Quay lại
              </button>
            ) : <div />}
            
            {step < totalSteps ? (
              <button 
                onClick={nextStep}
                disabled={step === 1 && !form.name}
                className="px-4 py-2 rounded-lg text-sm font-bold bg-lime-admin text-black hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
              >
                Lưu & Tiếp tục <ChevronRight size={16} />
              </button>
            ) : (
              <button onClick={() => router.push('/')} className="px-4 py-2 rounded-lg text-sm font-bold bg-lime-admin text-black hover:opacity-90 transition-opacity flex items-center gap-2">
                Về Client List
              </button>
            )}
          </div>

        </div>
      </div>
    </AdminLayout>
  );
}
