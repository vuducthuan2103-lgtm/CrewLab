import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  supabaseUrl && supabasePublishableKey && !supabaseUrl.includes('<') && !supabasePublishableKey.includes('<')
    ? createClient(supabaseUrl, supabasePublishableKey)
    : null;

export async function signInWithPassword(email: string, password: string) {
  if (!supabase) throw new Error('Supabase chưa được cấu hình cho Internal App');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const role = data.user?.app_metadata?.role;
  if (role !== 'agency_admin') {
    await supabase.auth.signOut();
    throw new Error('Tài khoản này không có quyền Agency Admin');
  }
}

export async function getAccessToken(): Promise<string> {
  if (!supabase) throw new Error('Supabase chưa được cấu hình cho Internal App');
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session?.access_token) throw new Error('Phiên đăng nhập đã hết hạn');
  return data.session.access_token;
}

export async function signOut() {
  if (supabase) await supabase.auth.signOut();
}
