'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { signInWithPassword } from '@/lib/supabase';

function getSafeNextPath() {
  const next = new URLSearchParams(window.location.search).get('next');
  return next?.startsWith('/') && !next.startsWith('//') ? next : '/';
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      await signInWithPassword(email, password);
      router.replace(getSafeNextPath());
      router.refresh();
    } catch {
      setErrorMessage('Email hoặc mật khẩu không đúng. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-cyan-500/5 blur-3xl" />
        <div className="absolute top-0 left-0 w-72 h-72 rounded-full bg-purple-500/5 blur-3xl" />
      </div>

      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(hsl(var(--primary) / 0.5) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary) / 0.5) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      <div className="relative z-10 w-full max-w-md px-4">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-lime-brand flex items-center justify-center shadow-accent-glow mb-4">
            <span className="text-white dark:text-black font-black text-lg tracking-tighter">CL</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">CrewLab</h1>
          <p className="text-sm text-muted-foreground mt-1">AI Marketing Agency cho F&amp;B SME</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl">
          <h2 className="text-lg font-bold text-foreground mb-1">Đăng nhập</h2>
          <p className="text-sm text-muted-foreground mb-6">Dùng tài khoản CrewLab đã được cấp.</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Email</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input id="login-email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all" />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Mật khẩu</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input id="login-password" type={showPassword ? 'text' : 'password'} required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" className="w-full pl-9 pr-10 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all" />
                <button type="button" aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <div className="flex justify-end mt-1.5"><Link href="/forgot-password" className="text-xs text-lime-brand hover:underline">Quên mật khẩu?</Link></div>
            </div>

            {errorMessage && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-500">{errorMessage}</p>}

            <button id="login-submit" type="submit" disabled={loading} className="w-full py-2.5 btn-lime-glow font-bold text-sm rounded-lg disabled:opacity-60 flex items-center justify-center gap-2">
              {loading ? 'Đang đăng nhập…' : 'Đăng nhập'} {!loading && <ArrowRight size={14} />}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground/50 mt-6">© 2026 CrewLab · AI Marketing Agency</p>
      </div>
    </div>
  );
}
