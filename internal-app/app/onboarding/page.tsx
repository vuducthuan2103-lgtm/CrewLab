'use client';

import React, { useState, useRef, useCallback } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import AdminHeader from '@/components/layout/AdminHeader';
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
      <div className="w-8 h-8 rounded-lg bg-lime-tint border border-lime-tint flex items-center justify-center flex-shrink-0">
        <span className="text-lime-admin font-bold text-xs font-mono">{number}</span>
      </div>
      <div>
        <h2 className="text-base font-bold text-foreground">{title}</h2>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
    </div>
  );
}

function FormLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
      {children}
      {required && <span className="text-lime-admin ml-1">*</span>}
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
        <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
      )}
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground 
          focus-admin transition-all duration-200 py-2.5 ${Icon ? 'pl-10 pr-4' : 'px-4'}`}
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
    await new Promise((r) => setTimeout(r, 1500));
    setIsSubmitting(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <AdminLayout>
        <AdminHeader title="Onboard Khách Hàng Mới" />
        <div className="max-w-md mx-auto py-16 px-4 text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full bg-lime-tint animate-ping" />
            <div className="relative w-20 h-20 rounded-full bg-lime-tint border border-lime-tint flex items-center justify-center shadow-lime-glow">
              <CheckCircle2 className="w-9 h-9 text-lime-admin" />
            </div>
          </div>
          <h1 className="text-2xl font-extrabold text-foreground mb-2">
            Tạo tài khoản thành công!
          </h1>
          <p className="text-muted-foreground text-sm mb-2">
            <span className="text-lime-admin font-semibold">{form.brandName}</span> đã được thêm vào hệ thống CrewLab.
          </p>
          <p className="text-muted-foreground text-xs mb-8">
            6 AI Agent đang được khởi tạo. Email kích hoạt sẽ gửi đến{' '}
            <span className="text-foreground font-mono">{form.email}</span>.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => { setSubmitted(false); setForm({ brandName: '', contactName: '', phone: '', email: '', address: '', industry: '', platforms: [], timezone: 'Asia/Ho_Chi_Minh', plan: '', logoFile: null, logoPreview: null, notes: '' }); }}
              className="px-5 py-2.5 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-muted transition-all"
            >
              Thêm khách hàng khác
            </button>
            <a
              href="/clients"
              className="px-5 py-2.5 rounded-xl btn-lime-glow text-sm font-extrabold flex items-center gap-2 justify-center"
            >
              <ArrowRight className="w-4 h-4" /> Về Danh sách Clients
            </a>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <AdminHeader
        title="Onboard Khách Hàng F&B Mới"
        subtitle="Khởi tạo tài khoản, cấu hình platform và kích hoạt 6 AI Agents"
      />

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {/* Progress steps */}
        <div className="flex items-center gap-4 border-b border-border pb-4">
          {[
            { n: '01', label: 'Thông tin cơ bản' },
            { n: '02', label: 'Platform & Timezone' },
            { n: '03', label: 'Logo thương hiệu' },
            { n: '04', label: 'Gói dịch vụ' },
          ].map((s) => (
            <div key={s.n} className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-md bg-muted border border-border text-lime-admin text-[10px] font-bold font-mono flex items-center justify-center">
                {s.n}
              </span>
              <span className="text-[11px] text-muted-foreground hidden sm:block">{s.label}</span>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>

          {/* SECTION 01 */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <SectionTitle number="01" title="Thông tin thương hiệu" description="Tên quán, người liên hệ và địa chỉ liên lạc chính" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          {/* SECTION 02 */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <SectionTitle number="02" title="Ngành & Platform mạng xã hội" description="Phân loại ngành hàng và các kênh mạng xã hội sẽ đăng bài" />

            <div>
              <FormLabel required>Ngành F&B</FormLabel>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-2">
                {INDUSTRIES.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => update('industry', key)}
                    className={`flex flex-col items-center gap-2 p-3.5 rounded-xl border text-center transition-all duration-200 cursor-pointer ${
                      form.industry === key
                        ? 'bg-lime-tint border-lime-admin text-lime-admin font-bold'
                        : 'bg-muted/40 border-border text-muted-foreground hover:border-border/80'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${form.industry === key ? 'text-lime-admin' : 'text-muted-foreground'}`} />
                    <span className="text-xs font-semibold">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <FormLabel required>Platform đăng bài</FormLabel>
              <div className="flex gap-3 mt-2">
                {([
                  { key: 'facebook' as PlatformKey, label: 'Facebook Page', icon: Facebook, color: 'text-blue-400' },
                  { key: 'instagram' as PlatformKey, label: 'Instagram', icon: Instagram, color: 'text-pink-400' },
                ]).map(({ key, label, icon: Icon, color }) => {
                  const active = form.platforms.includes(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => togglePlatform(key)}
                      className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border font-semibold text-sm transition-all duration-200 cursor-pointer ${
                        active
                          ? 'bg-lime-tint border-lime-admin text-foreground shadow-lime-glow-sm'
                          : 'bg-muted/40 border-border text-muted-foreground hover:border-border/80'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${active ? color : 'text-muted-foreground'}`} />
                      {label}
                      {active && <CheckCircle2 className="w-3.5 h-3.5 text-lime-admin ml-auto" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <FormLabel>Múi giờ (Timezone)</FormLabel>
              <div className="relative mt-1">
                <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <select
                  value={form.timezone}
                  onChange={(e) => update('timezone', e.target.value)}
                  className="w-full bg-card border border-border rounded-xl text-sm text-foreground focus-admin py-2.5 pl-10 pr-4 appearance-none cursor-pointer"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value} className="bg-card">
                      {tz.label}
                    </option>
                  ))}
                </select>
                <Globe className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>

          {/* SECTION 03 */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <SectionTitle number="03" title="Logo & Hình ảnh thương hiệu" description="Upload logo để AI Agent D02 nhận diện style hình ảnh" />

            {form.logoPreview ? (
              <div className="flex items-center gap-5">
                <div className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-lime-admin shadow-lime-glow-sm flex-shrink-0">
                  <img src={form.logoPreview} alt="Logo preview" className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground mb-0.5">{form.logoFile?.name}</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    {form.logoFile ? (form.logoFile.size / 1024).toFixed(1) + ' KB' : ''}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted transition-all"
                    >
                      Thay logo khác
                    </button>
                    <button
                      type="button"
                      onClick={removeLogo}
                      className="px-3 py-1.5 rounded-lg border border-red-500/20 text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-all flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" /> Xoá
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-border rounded-2xl p-8 flex flex-col items-center gap-3 hover:border-lime-admin hover:bg-lime-tint transition-all duration-300 cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-2xl bg-muted border border-border flex items-center justify-center group-hover:border-lime-admin transition-all">
                  <Upload className="w-5 h-5 text-muted-foreground group-hover:text-lime-admin transition-colors" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-foreground">Kéo thả hoặc bấm để upload logo</p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG, SVG, WEBP — tối đa 5MB</p>
                </div>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              className="hidden"
              onChange={handleLogoChange}
            />
          </div>

          {/* SECTION 04 */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <SectionTitle number="04" title="Gói dịch vụ" description="Chọn gói phù hợp với quy mô khách hàng" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {PLANS.map((plan) => {
                const active = form.plan === plan.key;
                return (
                  <button
                    key={plan.key}
                    type="button"
                    onClick={() => update('plan', plan.key)}
                    className={`relative text-left p-5 rounded-2xl border transition-all duration-200 cursor-pointer ${
                      active
                        ? 'bg-lime-tint border-lime-admin shadow-lime-glow-sm'
                        : 'bg-muted/20 border-border hover:border-border/80'
                    }`}
                  >
                    {plan.highlight && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-lime-admin text-black text-[10px] font-extrabold tracking-wide whitespace-nowrap">
                        ✦ PHỔ BIẾN NHẤT
                      </span>
                    )}
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-sm font-extrabold ${active ? 'text-lime-admin' : 'text-foreground'}`}>
                        {plan.name}
                      </span>
                      {active && <CheckCircle2 className="w-4 h-4 text-lime-admin" />}
                    </div>
                    <p className="text-lg font-extrabold text-foreground mb-0.5">{plan.price}</p>
                    <p className="text-[10px] text-muted-foreground mb-4">/ tháng</p>
                    <ul className="space-y-1.5">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="submit"
              disabled={!isValid || isSubmitting}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-extrabold transition-all duration-200 ${
                isValid && !isSubmitting
                  ? 'btn-lime-glow cursor-pointer'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
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

        </form>
      </div>
    </AdminLayout>
  );
}
