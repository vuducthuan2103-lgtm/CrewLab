'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Mock auth — accept admin@crewlab.vn with any password
    await new Promise(r => setTimeout(r, 800));

    if (email === 'admin@crewlab.vn') {
      localStorage.setItem('crewlab_admin_auth', 'true');
      router.push('/');
    } else {
      setError('Email không hợp lệ. Dùng admin@crewlab.vn để đăng nhập.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090B] relative overflow-hidden">
      {/* Background grid effect */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(212,255,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(212,255,0,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />

      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#D4FF00]/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/3 w-64 h-64 bg-cyan-500/5 rounded-full blur-[100px]" />

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-[#D4FF00] flex items-center justify-center shadow-glow-lime">
              <span className="text-black font-extrabold text-lg">CL</span>
            </div>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">CrewLab</h1>
          <div className="flex items-center justify-center gap-2 mt-2">
            <Shield size={13} className="text-cyan-admin" />
            <span className="text-xs font-bold text-cyan-admin font-mono uppercase tracking-wider">
              Agency Admin Operations
            </span>
          </div>
        </div>

        {/* Login Form */}
        <div className="bg-zinc-900/80 backdrop-blur-sm rounded-2xl border border-zinc-800 p-8 shadow-2xl">
          <h2 className="text-sm font-bold text-white mb-1">Đăng nhập Admin</h2>
          <p className="text-xs text-zinc-500 mb-6">Truy cập bảng điều khiển Agency</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-zinc-400 block mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@crewlab.vn"
                className="w-full px-4 py-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:border-[#D4FF00]/60 focus:ring-1 focus:ring-[#D4FF00]/20 outline-none transition-all"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-400 block mb-1.5">Mật khẩu</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:border-[#D4FF00]/60 focus:ring-1 focus:ring-[#D4FF00]/20 outline-none transition-all pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg btn-lime-glow text-sm font-extrabold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Đang xác thực...
                </span>
              ) : (
                'Đăng nhập →'
              )}
            </button>
          </form>

          {/* Hint */}
          <div className="mt-4 pt-4 border-t border-zinc-800/50">
            <p className="text-[10px] text-zinc-600 text-center font-mono">
              Demo: admin@crewlab.vn / bất kỳ mật khẩu
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-zinc-700 mt-6 font-mono">
          CrewLab © 2026 • Internal Use Only
        </p>
      </div>
    </div>
  );
}
