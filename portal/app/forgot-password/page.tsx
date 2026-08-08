'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Mail } from 'lucide-react';
import { requestPasswordReset } from '@/lib/supabase';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch {
      setErrorMessage('Không thể gửi email đặt lại mật khẩu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-2xl">
        {!sent ? (
          <>
            <h1 className="text-lg font-bold text-foreground">Đặt lại mật khẩu</h1>
            <p className="mt-1 text-sm text-muted-foreground">Nhập email tài khoản CrewLab để nhận link đặt lại mật khẩu.</p>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="forgot-password-email" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input id="forgot-password-email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30" />
                </div>
              </div>
              {errorMessage && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-500">{errorMessage}</p>}
              <button id="forgot-password-submit" type="submit" disabled={loading} className="w-full rounded-lg py-2.5 text-sm font-bold btn-lime-glow disabled:opacity-60">{loading ? 'Đang gửi…' : 'Gửi link đặt lại mật khẩu'}</button>
            </form>
          </>
        ) : (
          <div className="py-4 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-accent-tint bg-accent-tint"><CheckCircle2 size={28} className="text-lime-brand" /></div>
            <h1 className="text-lg font-bold text-foreground">Kiểm tra email của bạn</h1>
            <p className="mt-2 text-sm text-muted-foreground">Nếu email tồn tại, Supabase đã gửi link đặt lại mật khẩu đến <span className="font-medium text-foreground">{email}</span>.</p>
          </div>
        )}
        <div className="mt-6 flex justify-center"><Link href="/login" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft size={12} /> Quay lại đăng nhập</Link></div>
      </div>
    </div>
  );
}
