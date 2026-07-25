'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
  Building2,
  ChevronLeft,
  Upload,
  X,
  CheckCircle2,
  Store,
  Instagram,
  Facebook,
  Globe,
  Clock,
  Sparkles,
  CoffeeIcon,
  UtensilsCrossed,
  Cake,
  GlassWater,
  ShoppingBag,
  Gem,
  Loader2,
  ArrowRight,
  User,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────
type PlatformKey = 'facebook' | 'instagram';
type PlanKey = 'starter' | 'growth' | 'pro';

interface FormState {
  brandName: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  industry: string;
  platforms: PlatformKey[];
  timezone: string;
  plan: PlanKey | '';
  logoFile: File | null;
  logoPreview: string | null;
  notes: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────
const INDUSTRIES = [
  { key: 'cafe', label: 'Cà Phê', icon: CoffeeIcon },
  { key: 'restaurant', label: 'Nhà Hàng', icon: UtensilsCrossed },
  { key: 'pho_bun', label: 'Phở / Bún', icon: GlassWater },
  { key: 'bakery', label: 'Bánh & Tiệm', icon: Cake },
  { key: 'bubble_tea', label: 'Trà Sữa', icon: GlassWater },
  { key: 'fast_food', label: 'Đồ Ăn Nhanh', icon: ShoppingBag },
  { key: 'bar_pub', label: 'Bar / Pub', icon: GlassWater },
  { key: 'fine_dining', label: 'Fine Dining', icon: Gem },
];

const TIMEZONES = [
  { value: 'Asia/Ho_Chi_Minh', label: 'Hồ Chí Minh (UTC+7) — Việt Nam' },
  { value: 'Asia/Bangkok', label: 'Bangkok (UTC+7) — Thái Lan' },
  { value: 'Asia/Singapore', label: 'Singapore (UTC+8)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (UTC+9) — Nhật Bản' },
  { value: 'Europe/London', label: 'London (UTC+0/+1)' },
  { value: 'America/New_York', label: 'New York (UTC-5/-4)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (UTC-8/-7)' },
];

const PLANS: { key: PlanKey; name: string; price: string; features: string[]; highlight?: boolean }[] = [
  {
    key: 'starter',
    name: 'Starter',
    price: '2.500.000đ',
    features: ['3 bài đăng/tuần', '2 Platform (FB + IG)', '2 AI Agent (D01, D02)', 'Hỗ trợ email'],
  },
  {
    key: 'growth',
    name: 'Growth',
    price: '4.500.000đ',
    features: ['5 bài đăng/tuần', 'FB + IG + TikTok', '6 AI Agent đầy đủ', 'Asset Request flow', 'Hỗ trợ ưu tiên'],
    highlight: true,
  },
  {
    key: 'pro',
    name: 'Pro',
    price: '8.000.000đ',
    features: ['Không giới hạn bài đăng', 'Tất cả platform', '6 Agent + cấu hình model riêng', 'Brand Voice nâng cao', 'Account Manager riêng'],
  },
];

// ─── Helper Components ──────────────────────────────────────────────────────
function SectionTitle({ number, title, description }: { number: string; title: string; description?: string }) {
  return (
    <div className="flex items-start gap-4 mb-6">
      <div className="w-8 h-8 rounded-lg bg-[#D4FF00]/10 border border-[#D4FF00]/30 flex items-center justify-center flex-shrink-0">
        <span className="text-[#D4FF00] font-bold text-xs font-mono">{number}</span>
      </div>
      <div>
        <h2 className="text-base font-bold text-white">{title}</h2>
        {description && <p className="text-xs text-zinc-400 mt-0.5">{description}</p>}
      </div>
    </div>
  );
}

function FormLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
      {children}
      {required && <span className="text-[#D4FF00] ml-1">*</span>}
    </label>
  );
}

function InputField({
  id,
  value,
  onChange,
  placeholder,
  type = 'text',
  icon: Icon,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  icon?: React.ElementType;
}) {
  return (
    <div className="relative">
      {Icon && (
        <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
      )}
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-white placeholder:text-zinc-600 
          focus:outline-none focus:border-[#D4FF00]/60 focus:ring-1 focus:ring-[#D4FF00]/20 
          transition-all duration-200 py-2.5 ${Icon ? 'pl-10 pr-4' : 'px-4'}`}
      />
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState<FormState>({
    brandName: '',
    contactName: '',
    phone: '',
    email: '',
    address: '',
    industry: '',
    platforms: [],
    timezone: 'Asia/Ho_Chi_Minh',
    plan: '',
    logoFile: null,
    logoPreview: null,
    notes: '',
  });

  const update = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const togglePlatform = (p: PlatformKey) => {
    setForm((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(p)
        ? prev.platforms.filter((x) => x !== p)
        : [...prev.platforms, p],
    }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      update('logoFile', file);
      update('logoPreview', ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    update('logoFile', null);
    update('logoPreview', null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isValid =
    form.brandName.trim() &&
    form.contactName.trim() &&
    form.phone.trim() &&
    form.email.trim() &&
    form.industry &&
    form.platforms.length > 0 &&
    form.plan;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setIsSubmitting(true);
    // Simulate API call
    await new Promise((r) => setTimeout(r, 2000));
    setIsSubmitting(false);
    setSubmitted(true);
  };

  // ── Success Screen ──────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full bg-[#D4FF00]/10 animate-ping" />
            <div className="relative w-20 h-20 rounded-full bg-[#D4FF00]/15 border border-[#D4FF00]/40 flex items-center justify-center shadow-[0_0_40px_rgba(212,255,0,0.3)]">
              <CheckCircle2 className="w-9 h-9 text-[#D4FF00]" />
            </div>
          </div>
          <h1 className="text-2xl font-extrabold text-white mb-2">
            Tạo tài khoản thành công!
          </h1>
          <p className="text-zinc-400 text-sm mb-2">
            <span className="text-[#D4FF00] font-semibold">{form.brandName}</span> đã được thêm vào hệ thống CrewLab.
          </p>
          <p className="text-zinc-500 text-xs mb-8">
            6 AI Agent đang được khởi tạo. Email kích hoạt sẽ được gửi đến{' '}
            <span className="text-zinc-300">{form.email}</span>.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => { setSubmitted(false); setForm({ brandName: '', contactName: '', phone: '', email: '', address: '', industry: '', platforms: [], timezone: 'Asia/Ho_Chi_Minh', plan: '', logoFile: null, logoPreview: null, notes: '' }); }}
              className="px-5 py-2.5 rounded-xl border border-zinc-700 text-sm font-semibold text-zinc-300 hover:bg-zinc-800 transition-all"
            >
              Thêm khách hàng mới
            </button>
            <a
              href="/"
              className="px-5 py-2.5 rounded-xl bg-[#D4FF00] text-black text-sm font-extrabold hover:bg-[#E5FF55] shadow-[0_0_20px_rgba(212,255,0,0.35)] hover:shadow-[0_0_30px_rgba(212,255,0,0.5)] transition-all flex items-center gap-2 justify-center"
            >
              <ArrowRight className="w-4 h-4" /> Về Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ── Main Form ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#09090B] text-white">
      {/* ─ Navbar ─ */}
      <header className="sticky top-0 z-40 border-b border-zinc-800 bg-[#09090B]/90 backdrop-blur-md px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors group"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Dashboard
          </a>
          <span className="text-zinc-700">|</span>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#D4FF00]/10 border border-[#D4FF00]/30 flex items-center justify-center">
              <Building2 className="w-3.5 h-3.5 text-[#D4FF00]" />
            </div>
            <span className="font-bold text-sm text-white">Onboarding khách hàng mới</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-zinc-800 text-[#D4FF00] border border-zinc-700 font-mono uppercase tracking-wider">
            Agency Admin
          </span>
          <div className="w-8 h-8 rounded-full bg-[#D4FF00] text-black font-extrabold flex items-center justify-center text-xs shadow-[0_2px_10px_rgba(212,255,0,0.3)]">
            AG
          </div>
        </div>
      </header>

      {/* ─ Page Header ─ */}
      <div className="border-b border-zinc-800/60 bg-gradient-to-b from-zinc-900/40 to-transparent px-6 pt-8 pb-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-xl bg-[#D4FF00]/10 border border-[#D4FF00]/20">
            <Sparkles className="w-5 h-5 text-[#D4FF00]" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">Tạo tài khoản khách hàng F&B</h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Điền đầy đủ thông tin bên dưới để khởi tạo 6 AI Agent và portal cho khách hàng mới
            </p>
          </div>
        </div>

        {/* Progress hint */}
        <div className="flex items-center gap-4 mt-4">
          {[
            { n: '01', label: 'Thông tin cơ bản' },
            { n: '02', label: 'Platform & Timezone' },
            { n: '03', label: 'Logo thương hiệu' },
            { n: '04', label: 'Gói dịch vụ' },
          ].map((s) => (
            <div key={s.n} className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-md bg-zinc-800 border border-zinc-700 text-[#D4FF00] text-[10px] font-bold font-mono flex items-center justify-center">
                {s.n}
              </span>
              <span className="text-[11px] text-zinc-500 hidden sm:block">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ─ Form ─ */}
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto px-6 py-8 space-y-8" noValidate>

        {/* ════════ SECTION 01 — THÔNG TIN CƠ BẢN ════════ */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6">
          <SectionTitle number="01" title="Thông tin thương hiệu" description="Tên quán, người liên hệ và địa chỉ liên lạc chính" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Brand Name */}
            <div className="md:col-span-2">
              <FormLabel required>Tên thương hiệu / Tên quán</FormLabel>
              <InputField
                id="brandName"
                value={form.brandName}
                onChange={(v) => update('brandName', v)}
                placeholder="Ví dụ: Cà Phê Muối Chú Lắm, Phở Thìn Hà Nội..."
                icon={Store}
              />
            </div>

            {/* Contact Name */}
            <div>
              <FormLabel required>Tên người liên hệ</FormLabel>
              <InputField
                id="contactName"
                value={form.contactName}
                onChange={(v) => update('contactName', v)}
                placeholder="Họ tên chủ quán hoặc người phụ trách"
                icon={User}
              />
            </div>

            {/* Phone */}
            <div>
              <FormLabel required>Số điện thoại</FormLabel>
              <InputField
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(v) => update('phone', v)}
                placeholder="0912 345 678"
                icon={Phone}
              />
            </div>

            {/* Email */}
            <div>
              <FormLabel required>Email liên lạc</FormLabel>
              <InputField
                id="email"
                type="email"
                value={form.email}
                onChange={(v) => update('email', v)}
                placeholder="owner@quan.vn"
                icon={Mail}
              />
            </div>

            {/* Address */}
            <div>
              <FormLabel>Địa chỉ cơ sở chính</FormLabel>
              <InputField
                id="address"
                value={form.address}
                onChange={(v) => update('address', v)}
                placeholder="Số nhà, đường, quận/huyện, thành phố"
                icon={MapPin}
              />
            </div>
          </div>
        </div>

        {/* ════════ SECTION 02 — NGÀNH & PLATFORM ════════ */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6">
          <SectionTitle number="02" title="Ngành & Platform mạng xã hội" description="Phân loại ngành hàng và các kênh mạng xã hội sẽ đăng bài" />

          {/* Industry Grid */}
          <div className="mb-6">
            <FormLabel required>Ngành F&B</FormLabel>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-2">
              {INDUSTRIES.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  id={`industry-${key}`}
                  onClick={() => update('industry', key)}
                  className={`flex flex-col items-center gap-2 p-3.5 rounded-xl border text-center transition-all duration-200 cursor-pointer ${
                    form.industry === key
                      ? 'bg-[#D4FF00]/10 border-[#D4FF00]/60 shadow-[0_0_16px_rgba(212,255,0,0.15)]'
                      : 'bg-zinc-900 border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/60'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 ${
                      form.industry === key ? 'text-[#D4FF00]' : 'text-zinc-400'
                    }`}
                  />
                  <span
                    className={`text-xs font-semibold ${
                      form.industry === key ? 'text-[#D4FF00]' : 'text-zinc-300'
                    }`}
                  >
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Platform Toggle */}
          <div className="mb-6">
            <FormLabel required>Platform đăng bài</FormLabel>
            <p className="text-[11px] text-zinc-500 mb-2.5">Chọn ít nhất 1 platform — AI Agent D01/D02 sẽ tối ưu caption và format ảnh theo platform này</p>
            <div className="flex gap-3">
              {([
                { key: 'facebook' as PlatformKey, label: 'Facebook Page', icon: Facebook, color: 'text-blue-400' },
                { key: 'instagram' as PlatformKey, label: 'Instagram', icon: Instagram, color: 'text-pink-400' },
              ]).map(({ key, label, icon: Icon, color }) => {
                const active = form.platforms.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    id={`platform-${key}`}
                    onClick={() => togglePlatform(key)}
                    className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border font-semibold text-sm transition-all duration-200 cursor-pointer ${
                      active
                        ? 'bg-[#D4FF00]/10 border-[#D4FF00]/50 text-white shadow-[0_0_16px_rgba(212,255,0,0.12)]'
                        : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${active ? color : 'text-zinc-500'}`} />
                    {label}
                    {active && <CheckCircle2 className="w-3.5 h-3.5 text-[#D4FF00] ml-auto" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Timezone */}
          <div>
            <FormLabel>Múi giờ (Timezone)</FormLabel>
            <div className="relative">
              <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
              <select
                id="timezone"
                value={form.timezone}
                onChange={(e) => update('timezone', e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-white 
                  focus:outline-none focus:border-[#D4FF00]/60 focus:ring-1 focus:ring-[#D4FF00]/20 
                  transition-all duration-200 py-2.5 pl-10 pr-4 appearance-none cursor-pointer"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value} className="bg-zinc-900">
                    {tz.label}
                  </option>
                ))}
              </select>
              <Globe className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* ════════ SECTION 03 — LOGO ════════ */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6">
          <SectionTitle number="03" title="Logo & Hình ảnh thương hiệu" description="Upload logo để AI Agent D02 nhận diện style hình ảnh nhất quán với thương hiệu" />

          {form.logoPreview ? (
            <div className="flex items-center gap-5">
              <div className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-[#D4FF00]/40 shadow-[0_0_20px_rgba(212,255,0,0.15)] flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.logoPreview} alt="Logo preview" className="w-full h-full object-cover" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white mb-0.5">{form.logoFile?.name}</p>
                <p className="text-xs text-zinc-500 mb-3">
                  {form.logoFile ? (form.logoFile.size / 1024).toFixed(1) + ' KB' : ''}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg border border-zinc-600 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-all"
                  >
                    Thay logo khác
                  </button>
                  <button
                    type="button"
                    onClick={removeLogo}
                    className="px-3 py-1.5 rounded-lg border border-red-900 text-xs font-semibold text-red-400 hover:bg-red-950/40 transition-all flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" /> Xoá
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              id="upload-logo-btn"
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-zinc-700 rounded-2xl p-8 flex flex-col items-center gap-3 hover:border-[#D4FF00]/40 hover:bg-[#D4FF00]/5 transition-all duration-300 cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center group-hover:border-[#D4FF00]/30 group-hover:bg-[#D4FF00]/10 transition-all">
                <Upload className="w-5 h-5 text-zinc-400 group-hover:text-[#D4FF00] transition-colors" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-zinc-300 group-hover:text-white transition-colors">
                  Kéo thả hoặc bấm để upload logo
                </p>
                <p className="text-xs text-zinc-500 mt-1">PNG, JPG, SVG, WEBP — tối đa 5MB</p>
              </div>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            className="hidden"
            onChange={handleLogoChange}
            id="logo-file-input"
          />
        </div>

        {/* ════════ SECTION 04 — GÓI DỊCH VỤ ════════ */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6">
          <SectionTitle number="04" title="Gói dịch vụ" description="Chọn gói phù hợp với quy mô và ngân sách của khách hàng" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PLANS.map((plan) => {
              const active = form.plan === plan.key;
              return (
                <button
                  key={plan.key}
                  type="button"
                  id={`plan-${plan.key}`}
                  onClick={() => update('plan', plan.key)}
                  className={`relative text-left p-5 rounded-2xl border transition-all duration-200 cursor-pointer ${
                    active
                      ? plan.highlight
                        ? 'bg-[#D4FF00]/10 border-[#D4FF00] shadow-[0_0_30px_rgba(212,255,0,0.2)]'
                        : 'bg-zinc-800 border-[#D4FF00]/70 shadow-[0_0_20px_rgba(212,255,0,0.1)]'
                      : plan.highlight
                      ? 'bg-zinc-900 border-zinc-600 hover:border-zinc-500'
                      : 'bg-zinc-900 border-zinc-700 hover:border-zinc-600'
                  }`}
                >
                  {plan.highlight && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#D4FF00] text-black text-[10px] font-extrabold tracking-wide whitespace-nowrap shadow-[0_0_15px_rgba(212,255,0,0.4)]">
                      ✦ PHỔ BIẾN NHẤT
                    </span>
                  )}
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-sm font-extrabold ${active ? 'text-[#D4FF00]' : 'text-white'}`}>
                      {plan.name}
                    </span>
                    {active && <CheckCircle2 className="w-4 h-4 text-[#D4FF00]" />}
                  </div>
                  <p className="text-lg font-extrabold text-white mb-0.5">{plan.price}</p>
                  <p className="text-[10px] text-zinc-500 mb-4">/ tháng</p>
                  <ul className="space-y-1.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-zinc-400">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>
        </div>

        {/* ════════ NOTES ════════ */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6">
          <FormLabel>Ghi chú thêm (không bắt buộc)</FormLabel>
          <textarea
            id="notes"
            value={form.notes}
            onChange={(e) => update('notes', e.target.value)}
            placeholder="Yêu cầu đặc biệt về thương hiệu, tone giọng, khung giờ đăng bài ưu tiên, hoặc bất kỳ lưu ý nào cần truyền đạt cho AI Agents..."
            rows={4}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-white placeholder:text-zinc-600 
              focus:outline-none focus:border-[#D4FF00]/60 focus:ring-1 focus:ring-[#D4FF00]/20 
              transition-all duration-200 py-3 px-4 resize-none"
          />
        </div>

        {/* ════════ SUBMIT BAR ════════ */}
        <div className="sticky bottom-0 bg-[#09090B]/95 backdrop-blur-md border-t border-zinc-800 -mx-6 px-6 py-4 flex items-center justify-between gap-4">
          <div className="text-xs text-zinc-500">
            {isValid ? (
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Tất cả thông tin bắt buộc đã đầy đủ
              </span>
            ) : (
              <span className="text-zinc-500">Điền đủ các trường có dấu <span className="text-[#D4FF00]">*</span> để tiếp tục</span>
            )}
          </div>

          <div className="flex gap-3">
            <a
              href="/"
              className="px-4 py-2.5 rounded-xl border border-zinc-700 text-sm font-semibold text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all"
            >
              Huỷ
            </a>
            <button
              type="submit"
              id="submit-onboarding"
              disabled={!isValid || isSubmitting}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-extrabold transition-all duration-200 ${
                isValid && !isSubmitting
                  ? 'bg-[#D4FF00] text-black hover:bg-[#E5FF55] shadow-[0_0_20px_rgba(212,255,0,0.35)] hover:shadow-[0_0_30px_rgba(212,255,0,0.5)] hover:-translate-y-0.5 active:scale-95 cursor-pointer'
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang tạo tài khoản...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Tạo tài khoản & Khởi động AI
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
