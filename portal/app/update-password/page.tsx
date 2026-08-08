'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      setErrorMessage('Hai mật khẩu chưa khớp.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setErrorMessage('Không thể cập nhật mật khẩu. Vui lòng yêu cầu link mới.');
      setLoading(false);
      return;
    }

    router.replace('/');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-2xl space-y-4">
        <div><h1 className="text-lg font-bold text-foreground">Tạo mật khẩu mới</h1><p className="mt-1 text-sm text-muted-foreground">Chọn mật khẩu mới cho tài khoản CrewLab.</p></div>
        <div><label htmlFor="new-password" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mật khẩu mới</label><div className="relative"><Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input id="new-password" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-4 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30" /></div></div>
        <div><label htmlFor="confirm-password" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Xác nhận mật khẩu</label><input id="confirm-password" type="password" required minLength={8} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30" /></div>
        {errorMessage && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-500">{errorMessage}</p>}
        <button type="submit" disabled={loading} className="w-full rounded-lg py-2.5 text-sm font-bold btn-lime-glow disabled:opacity-60">{loading ? 'Đang cập nhật…' : 'Cập nhật mật khẩu'}</button>
      </form>
    </div>
  );
}
