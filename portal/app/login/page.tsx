'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Zap, ArrowRight, Mail, Lock } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mockLoading, setMockLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => router.push('/'), 800);
  };

  const handleMockLogin = () => {
    setMockLoading(true);
    setTimeout(() => router.push('/'), 600);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[#D4FF00]/5 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-cyan-500/5 blur-3xl" />
        <div className="absolute top-0 left-0 w-72 h-72 rounded-full bg-purple-500/5 blur-3xl" />
      </div>

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(212,255,0,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(212,255,0,0.5) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-[#D4FF00] flex items-center justify-center shadow-[0_0_30px_rgba(212,255,0,0.4)] mb-4">
            <span className="text-black font-black text-lg tracking-tighter">CL</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">CrewLab</h1>
          <p className="text-sm text-muted-foreground mt-1">AI Marketing Agency cho F&amp;B SME</p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl">
          <h2 className="text-lg font-bold text-foreground mb-1">Đăng nhập</h2>
          <p className="text-sm text-muted-foreground mb-6">Chào mừng trở lại!</p>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="login-email" className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                Email
              </label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@bardinh.vn"
                  className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-[#D4FF00]/60 focus:ring-1 focus:ring-[#D4FF00]/30 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="login-password" className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-[#D4FF00]/60 focus:ring-1 focus:ring-[#D4FF00]/30 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <div className="flex justify-end mt-1.5">
                <a href="/forgot-password" className="text-xs text-[#D4FF00] hover:underline">
                  Quên mật khẩu?
                </a>
              </div>
            </div>

            {/* Login button */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#D4FF00] text-black font-bold text-sm rounded-lg hover:bg-[#E5FF55] transition-all shadow-[0_0_20px_rgba(212,255,0,0.3)] hover:shadow-[0_0_30px_rgba(212,255,0,0.5)] disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
              {!loading && <ArrowRight size={14} />}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground font-medium">hoặc</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Mock Login */}
          <button
            id="mock-login-bardinh"
            onClick={handleMockLogin}
            disabled={mockLoading}
            className="w-full py-2.5 border border-[#D4FF00]/30 text-[#D4FF00] font-semibold text-sm rounded-lg hover:bg-[#D4FF00]/10 hover:border-[#D4FF00]/60 transition-all shadow-[0_0_10px_rgba(212,255,0,0.06)] hover:shadow-[0_0_16px_rgba(212,255,0,0.15)] flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Zap size={13} />
            {mockLoading ? 'Đang vào Portal…' : 'Trải nghiệm ngay — Bardinh Coffee'}
          </button>
          <p className="text-[11px] text-muted-foreground/60 text-center mt-2">
            Không cần đăng ký · Dữ liệu demo · Tuần 25
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground/50 mt-6">
          © 2026 CrewLab · AI Marketing Agency
        </p>
      </div>
    </div>
  );
}
