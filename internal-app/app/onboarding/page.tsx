'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, KeyRound, RefreshCw, UserRound } from 'lucide-react';

import AdminLayout from '@/components/layout/AdminLayout';
import AdminHeader from '@/components/layout/AdminHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  ApiError,
  ProviderConfig,
  ProviderName,
  apiActivateClient,
  apiCreatePortalAdmin,
  apiCreateClient,
  apiGetProviders,
  apiRetestProvider,
  apiSaveCredential,
  apiSetProviderEnabled,
} from '@/lib/api';

const PROVIDER_LABELS: Record<ProviderName, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google Gemini',
  deepseek: 'DeepSeek',
};

const PORTAL_LOGIN_URL = process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3000/login';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientActive, setClientActive] = useState(false);
  const [portalAdminEmail, setPortalAdminEmail] = useState('');
  const [portalPassword, setPortalPassword] = useState('');
  const [portalPasswordConfirmation, setPortalPasswordConfirmation] = useState('');
  const [createdPortalEmail, setCreatedPortalEmail] = useState<string | null>(null);
  const [creatingPortalAdmin, setCreatingPortalAdmin] = useState(false);
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [keys, setKeys] = useState<Partial<Record<ProviderName, string>>>({});
  const [busyProvider, setBusyProvider] = useState<ProviderName | null>(null);
  const [confirmDisable, setConfirmDisable] = useState<{
    provider: ProviderName;
    agents: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    industry: 'Cafe & F&B',
    timezone: 'Asia/Ho_Chi_Minh',
    platforms: ['facebook'] as string[],
  });

  const loadProviders = useCallback(async (id: string) => {
    const result = await apiGetProviders(id);
    setProviders(result.providers);
  }, []);

  useEffect(() => {
    const existingClientId = new URLSearchParams(window.location.search).get('clientId');
    if (!existingClientId) return;
    setClientId(existingClientId);
    setStep(2);
    loadProviders(existingClientId).catch((requestError) =>
      setError(requestError instanceof Error ? requestError.message : 'Không tải được provider'),
    );
  }, [loadProviders]);

  const enabledCount = providers.filter((provider) => provider.is_enabled).length;

  const updateProvider = (updated: ProviderConfig) => {
    setProviders((current) =>
      current.map((provider) =>
        provider.provider === updated.provider
          ? { ...provider, ...updated, models: updated.models ?? provider.models }
          : provider,
      ),
    );
  };

  const createClient = async () => {
    setError(null);
    setMessage(null);
    try {
      const client = await apiCreateClient({
        name: form.name,
        brand_name: form.name,
        industry: form.industry,
        timezone: form.timezone,
        platforms: form.platforms,
      });
      setClientId(client.id);
      await loadProviders(client.id);
      setStep(2);
      setMessage('Đã tạo client ở trạng thái chưa kích hoạt.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không tạo được client');
    }
  };

  const saveCredential = async (provider: ProviderName) => {
    if (!clientId || !keys[provider]?.trim()) return;
    setBusyProvider(provider);
    setError(null);
    setMessage(null);
    try {
      const updated = await apiSaveCredential(clientId, provider, keys[provider]!.trim());
      updateProvider(updated);
      setKeys((current) => ({ ...current, [provider]: '' }));
      setMessage(`${PROVIDER_LABELS[provider]} đã kết nối hợp lệ. Key đầy đủ sẽ không hiển thị lại.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không lưu được API key');
    } finally {
      setBusyProvider(null);
    }
  };

  const retest = async (provider: ProviderName) => {
    if (!clientId) return;
    setBusyProvider(provider);
    setError(null);
    try {
      updateProvider(await apiRetestProvider(clientId, provider));
      setMessage(`Đã kiểm tra lại ${PROVIDER_LABELS[provider]}.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không kiểm tra được provider');
    } finally {
      setBusyProvider(null);
    }
  };

  const setEnabled = async (
    provider: ProviderName,
    isEnabled: boolean,
    confirmed = false,
  ) => {
    if (!clientId) return;
    setBusyProvider(provider);
    setError(null);
    try {
      const updated = await apiSetProviderEnabled(clientId, provider, isEnabled, confirmed);
      updateProvider(updated);
      setConfirmDisable(null);
      setMessage(`${PROVIDER_LABELS[provider]} đã được ${isEnabled ? 'bật' : 'tắt'}.`);
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.code === 'PROVIDER_IN_USE') {
        setConfirmDisable({
          provider,
          agents: (requestError.details?.affected_agents as string[]) || [],
        });
      } else {
        setError(requestError instanceof Error ? requestError.message : 'Không đổi được trạng thái');
      }
    } finally {
      setBusyProvider(null);
    }
  };

  const activate = async () => {
    if (!clientId) return;
    setError(null);
    setMessage(null);
    try {
      await apiActivateClient(clientId);
      setClientActive(true);
      setStep(3);
      setMessage('Client đã được kích hoạt và 6 agent đã có cấu hình model mặc định.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không kích hoạt được client');
    }
  };

  const createPortalAdmin = async () => {
    if (!clientId) return;
    if (portalPassword !== portalPasswordConfirmation) {
      setError('Hai ô mật khẩu chưa khớp.');
      return;
    }
    setCreatingPortalAdmin(true);
    setError(null);
    setMessage(null);
    try {
      const account = await apiCreatePortalAdmin(clientId, {
        email: portalAdminEmail,
        password: portalPassword,
      });
      setCreatedPortalEmail(account.email);
      setPortalPassword('');
      setPortalPasswordConfirmation('');
      setStep(4);
      setMessage('Đã tạo tài khoản Portal. Mật khẩu không được lưu hoặc hiển thị lại trong CrewLab.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không tạo được tài khoản Portal');
    } finally {
      setCreatingPortalAdmin(false);
    }
  };

  return (
    <AdminLayout>
      <AdminHeader
        title="Onboarding & Provider"
        subtitle="Tạo client, kiểm tra tối đa 2 provider, rồi mới kích hoạt"
      />
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          {['Thông tin client', 'Provider & API key', 'Kích hoạt', 'Tài khoản Portal'].map((label, index) => (
            <div
              key={label}
              className={`rounded-lg border px-3 py-2 text-center text-xs font-bold ${
                step >= index + 1
                  ? 'border-lime-admin/40 bg-lime-admin/10 text-lime-admin'
                  : 'border-border text-muted-foreground'
              }`}
            >
              {index + 1}. {label}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-5 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
            <AlertCircle className="mt-0.5 shrink-0" size={16} /> {error}
          </div>
        )}
        {message && (
          <div className="mb-5 flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-400">
            <CheckCircle2 className="mt-0.5 shrink-0" size={16} /> {message}
          </div>
        )}

        {step === 1 && (
          <section className="space-y-5 rounded-xl border border-border bg-card p-6 shadow-sm">
            <div>
              <h2 className="font-bold text-foreground">Thông tin client mới</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Client được tạo ở trạng thái chưa kích hoạt cho tới khi provider hợp lệ.
              </p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Tên thương hiệu *</label>
              <Input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="VD: Bardinh Coffee"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Ngành</label>
                <Input
                  value={form.industry}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, industry: event.target.value }))
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Múi giờ</label>
                <Input value={form.timezone} readOnly />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold text-muted-foreground">Nền tảng</label>
              <div className="flex gap-5 text-sm text-foreground">
                {['facebook', 'instagram'].map((platform) => (
                  <label key={platform} className="flex items-center gap-2 capitalize">
                    <input
                      type="checkbox"
                      checked={form.platforms.includes(platform)}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          platforms: event.target.checked
                            ? [...current.platforms, platform]
                            : current.platforms.filter((item) => item !== platform),
                        }))
                      }
                      className="accent-lime-admin"
                    />
                    {platform}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={createClient}
                disabled={!form.name.trim() || form.platforms.length === 0}
              >
                Tạo client & tiếp tục
              </Button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="space-y-5">
            <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
              <div>
                <h2 className="font-bold text-foreground">Provider đã bật: {enabledCount}/2</h2>
                <p className="text-xs text-muted-foreground">
                  Key được kiểm tra trước khi mã hóa và lưu. Không thể xem lại key đầy đủ.
                </p>
              </div>
              <KeyRound className="text-lime-admin" size={22} />
            </div>

            {providers.map((provider) => {
              const isBusy = busyProvider === provider.provider;
              const canEnable = provider.validation_status === 'valid' && enabledCount < 2;
              return (
                <div key={provider.provider} className="rounded-xl border border-border bg-card p-5 shadow-sm">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-foreground">{PROVIDER_LABELS[provider.provider]}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {provider.key_hint ? `Key đang lưu: ${provider.key_hint}` : 'Chưa có key'}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-bold ${
                        provider.validation_status === 'valid'
                          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                          : provider.validation_status === 'invalid'
                            ? 'border-red-500/20 bg-red-500/10 text-red-400'
                            : 'border-border bg-muted/30 text-muted-foreground'
                      }`}
                    >
                      {provider.validation_status === 'valid'
                        ? 'Hợp lệ'
                        : provider.validation_status === 'invalid'
                          ? 'Không hợp lệ'
                          : 'Chưa cấu hình'}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 md:flex-row">
                    <Input
                      type="password"
                      autoComplete="new-password"
                      value={keys[provider.provider] || ''}
                      onChange={(event) =>
                        setKeys((current) => ({
                          ...current,
                          [provider.provider]: event.target.value,
                        }))
                      }
                      placeholder={provider.key_hint ? 'Nhập key mới để thay thế' : 'Nhập API key'}
                    />
                    <Button
                      onClick={() => saveCredential(provider.provider)}
                      disabled={isBusy || !keys[provider.provider]?.trim()}
                    >
                      {isBusy ? 'Đang kiểm tra...' : 'Lưu & kiểm tra'}
                    </Button>
                  </div>

                  {provider.last_test_error && (
                    <p className="mt-2 text-xs text-red-400">{provider.last_test_error}</p>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
                    {provider.key_hint && (
                      <Button variant="secondary" onClick={() => retest(provider.provider)} disabled={isBusy}>
                        <RefreshCw size={14} /> Kiểm tra lại
                      </Button>
                    )}
                    <Button
                      variant={provider.is_enabled ? 'danger' : 'secondary'}
                      onClick={() => setEnabled(provider.provider, !provider.is_enabled)}
                      disabled={
                        isBusy ||
                        (!provider.is_enabled && !canEnable) ||
                        (!provider.is_enabled && enabledCount >= 2)
                      }
                    >
                      {provider.is_enabled ? 'Tắt provider' : 'Bật provider'}
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {provider.models?.length ?? 0} model được CrewLab phê duyệt
                    </span>
                  </div>
                </div>
              );
            })}

            {confirmDisable && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
                <h3 className="font-bold text-amber-300">Provider đang được agent sử dụng</h3>
                <p className="mt-2 text-sm text-amber-100/80">
                  Các agent bị ảnh hưởng: {confirmDisable.agents.join(', ') || 'Không xác định'}.
                  Sau khi tắt, task mới của các agent này sẽ bị chặn tới khi chọn model thay thế.
                </p>
                <div className="mt-4 flex gap-2">
                  <Button variant="secondary" onClick={() => setConfirmDisable(null)}>Hủy</Button>
                  <Button
                    variant="danger"
                    onClick={() => setEnabled(confirmDisable.provider, false, true)}
                  >
                    Xác nhận tắt
                  </Button>
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="secondary" onClick={() => router.push('/')}>Về danh sách</Button>
              <Button onClick={activate} disabled={enabledCount < 1 || enabledCount > 2}>
                Kích hoạt client
              </Button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="space-y-5 rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-lime-admin/10 p-2 text-lime-admin">
                <UserRound size={20} />
              </div>
              <div>
                <h2 className="font-bold text-foreground">Tạo Portal Admin đầu tiên</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Tài khoản này chỉ có quyền với {form.name || 'client vừa tạo'}. Chọn mật khẩu tạm thời và gửi cho khách qua kênh riêng.
                </p>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Email khách hàng *</label>
              <Input
                type="email"
                autoComplete="email"
                value={portalAdminEmail}
                onChange={(event) => setPortalAdminEmail(event.target.value)}
                placeholder="owner@thuonghieu.vn"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Mật khẩu tạm thời *</label>
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={portalPassword}
                  onChange={(event) => setPortalPassword(event.target.value)}
                  placeholder="Ít nhất 12 ký tự"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Xác nhận mật khẩu *</label>
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={portalPasswordConfirmation}
                  onChange={(event) => setPortalPasswordConfirmation(event.target.value)}
                  placeholder="Nhập lại mật khẩu"
                />
              </div>
            </div>
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-200">
              Mật khẩu cần tối thiểu 12 ký tự, gồm chữ hoa, chữ thường và số. CrewLab không lưu hoặc hiển thị lại mật khẩu sau khi tạo. Khách có thể dùng “Quên mật khẩu” trong Portal để tự đặt mật khẩu mới.
            </div>
            <div className="flex justify-between gap-3">
              <Button variant="secondary" onClick={() => setStep(2)} disabled={creatingPortalAdmin}>
                Quay lại
              </Button>
              <Button
                onClick={createPortalAdmin}
                disabled={
                  creatingPortalAdmin ||
                  !portalAdminEmail.trim() ||
                  !portalPassword ||
                  !portalPasswordConfirmation
                }
              >
                {creatingPortalAdmin ? 'Đang tạo tài khoản...' : 'Tạo tài khoản Portal'}
              </Button>
            </div>
          </section>
        )}

        {step === 4 && (
          <section className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-8 text-center">
            <CheckCircle2 className="mx-auto text-emerald-400" size={42} />
            <h2 className="mt-4 text-xl font-bold text-foreground">Client đã sẵn sàng</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {clientActive
                ? 'Provider đã được khóa theo client, 6 agent có model mặc định và Portal Admin đã được tạo.'
                : 'Cấu hình provider đã hoàn tất.'}
            </p>
            {createdPortalEmail && (
              <p className="mt-3 text-sm text-foreground">
                Đăng nhập Portal: <span className="font-semibold">{createdPortalEmail}</span>
              </p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">{PORTAL_LOGIN_URL}</p>
            <Button className="mt-5" variant="secondary" onClick={() => window.open(PORTAL_LOGIN_URL, '_blank', 'noopener,noreferrer')}>
              Mở Portal để kiểm tra
            </Button>
            <Button className="mt-6" onClick={() => router.push('/')}>
              Về danh sách clients
            </Button>
          </section>
        )}
      </div>
    </AdminLayout>
  );
}
