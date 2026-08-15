import { getAccessToken } from './supabase';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export interface AdminClient {
  id: string;
  name: string;
  brand_name: string;
  industry: string | null;
  timezone: string;
  platforms: string[];
  is_active: boolean;
  created_at: string;
}

export type ProviderName = 'openai' | 'anthropic' | 'google' | 'deepseek' | 'qwen';

export interface ProviderConfig {
  provider: ProviderName;
  key_hint: string | null;
  is_enabled: boolean;
  validation_status: 'missing' | 'valid' | 'invalid' | 'untested';
  last_tested_at: string | null;
  last_test_error: string | null;
  models: Array<{
    id: string;
    label: string;
    tier: string;
    capabilities: string[];
    eligible_agents: string[];
  }>;
}

class ApiError extends Error {
  code?: string;
  details?: Record<string, unknown>;

  constructor(message: string, code?: string, details?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

async function fetchAPI<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  if (!API_BASE_URL) throw new Error('NEXT_PUBLIC_API_URL chưa được cấu hình');
  const token = await getAccessToken();
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.success === false) {
    const error = result?.error || result?.detail;
    throw new ApiError(
      error?.message || (typeof error === 'string' ? error : `API Error ${response.status}`),
      error?.error_code,
      error?.details,
    );
  }
  return result.data as T;
}

export function apiListClients() {
  return fetchAPI<AdminClient[]>('/api/v1/internal/clients');
}

export function apiCreateClient(input: {
  name: string;
  brand_name: string;
  industry?: string;
  timezone: string;
  platforms: string[];
}) {
  return fetchAPI<AdminClient>('/api/v1/internal/clients', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function apiGetProviders(clientId: string) {
  return fetchAPI<{ providers: ProviderConfig[] }>(
    `/api/v1/internal/clients/${clientId}/providers`,
  );
}

export function apiSaveCredential(clientId: string, provider: ProviderName, apiKey: string) {
  return fetchAPI<ProviderConfig>(
    `/api/v1/internal/clients/${clientId}/providers/${provider}`,
    {
      method: 'PUT',
      body: JSON.stringify({ api_key: apiKey, idempotency_key: crypto.randomUUID() }),
    },
  );
}

export function apiRetestProvider(clientId: string, provider: ProviderName) {
  return fetchAPI<ProviderConfig>(
    `/api/v1/internal/clients/${clientId}/providers/${provider}/test`,
    { method: 'POST' },
  );
}

export function apiSetProviderEnabled(
  clientId: string,
  provider: ProviderName,
  isEnabled: boolean,
  confirmAffectedAgents = false,
) {
  return fetchAPI<ProviderConfig>(
    `/api/v1/internal/clients/${clientId}/providers/${provider}`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        is_enabled: isEnabled,
        confirm_affected_agents: confirmAffectedAgents,
        idempotency_key: crypto.randomUUID(),
      }),
    },
  );
}

export function apiActivateClient(clientId: string) {
  return fetchAPI<AdminClient>(`/api/v1/internal/clients/${clientId}/activation`, {
    method: 'PATCH',
    body: JSON.stringify({ is_active: true, idempotency_key: crypto.randomUUID() }),
  });
}

export function apiCreatePortalAdmin(clientId: string, input: { email: string; password: string }) {
  return fetchAPI<{ auth_user_id: string; email: string }>(
    `/api/v1/internal/clients/${clientId}/portal-admin`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
}

export { ApiError };
