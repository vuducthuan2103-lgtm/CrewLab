'use client';

import React, { useState } from 'react';
import { ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-[#D4FF00]/4 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-[#D4FF00] flex items-center justify-center shadow-[0_0_30px_rgba(212,255,0,0.4)] mb-4">
            <span className="text-black font-black text-lg">CL</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">CrewLab</h1>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl">
          {!sent ? (
            <>
              <h2 className="text-lg font-bold text-foreground mb-1">Quên mật khẩu?</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Nhập email của bạn, chúng tôi sẽ gửi link đặt lại mật khẩu.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="forgot-email" className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                    Email
                  </label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="forgot-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@bardinh.vn"
                      className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-[#D4FF00]/60 focus:ring-1 focus:ring-[#D4FF00]/30 transition-all"
                    />
                  </div>
                </div>

                <button
                  id="forgot-password-submit"
                  type="submit"
                  className="w-full py-2.5 bg-[#D4FF00] text-black font-bold text-sm rounded-lg hover:bg-[#E5FF55] transition-all shadow-[0_0_20px_rgba(212,255,0,0.3)] hover:shadow-[0_0_30px_rgba(212,255,0,0.5)]"
                >
                  Gửi link đặt lại mật khẩu
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-[#D4FF00]/10 border border-[#D4FF00]/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={28} className="text-[#D4FF00]" />
              </div>
              <h2 className="text-lg font-bold text-foreground mb-2">Kiểm tra email của bạn!</h2>
              <p className="text-sm text-muted-foreground">
                Link đặt lại mật khẩu đã được gửi đến{' '}
                <span className="text-foreground font-medium">{email}</span>. Vui lòng kiểm tra hộp thư (kể cả thư mục Spam).
              </p>
            </div>
          )}

          <div className="mt-6 flex justify-center">
            <Link
              href="/login"
              id="back-to-login"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft size={12} /> Quay lại đăng nhập
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
