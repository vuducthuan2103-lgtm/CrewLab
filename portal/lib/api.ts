import { v4 as uuidv4 } from 'uuid';
import { A01ChatMessage, BrandVoiceConfig } from './types';
import { getAccessToken } from './supabase';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  if (!API_BASE_URL) throw new Error('NEXT_PUBLIC_API_URL is not configured');
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
    const detail = result?.detail;
    const detailMessage = typeof detail === 'string'
      ? detail
      : Array.isArray(detail)
        ? detail.map((item) => item?.msg).filter(Boolean).join(', ')
        : null;
    throw new Error(
      result?.error?.message
      || detailMessage
      || result?.message
      || `Không thể kết nối máy chủ (${response.status})`,
    );
  }
  return result?.data;
}

const sideEffect = (body: Record<string, unknown>) =>
  JSON.stringify({ ...body, idempotency_key: uuidv4() });

export function apiFetchContentItems(status?: string) {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return fetchAPI(`/api/v1/portal/content-items${query}`);
}

export function apiFetchA01Messages(limit = 50): Promise<A01ChatMessage[]> {
  return fetchAPI(`/api/v1/portal/a01/messages?limit=${limit}`);
}

export function apiSendA01Message(message: string): Promise<A01ChatMessage> {
  return fetchAPI('/api/v1/portal/a01/messages', {
    method: 'POST',
    body: sideEffect({ message }),
  });
}

export function apiFetchTaskLogs(limit = 50) {
  return fetchAPI(`/api/v1/portal/task-logs?limit=${limit}`);
}

export function apiFetchPillars() {
  return fetchAPI('/api/v1/portal/pillars');
}

export function apiFetchAssetRequests() {
  return fetchAPI('/api/v1/portal/asset-requests');
}

export function apiFetchAssets() {
  return fetchAPI('/api/v1/portal/assets');
}

export function apiFetchSettings() {
  return fetchAPI('/api/v1/portal/settings');
}

export function apiApproveContent(itemId: string, editedCaption?: string) {
  return fetchAPI(`/api/v1/portal/content-items/${itemId}/approve`, {
    method: 'POST',
    body: sideEffect({ edited_caption: editedCaption ?? null }),
  });
}

export function apiRejectContent(itemId: string, reason: string, feedback: string) {
  return fetchAPI(`/api/v1/portal/content-items/${itemId}/reject`, {
    method: 'POST',
    body: sideEffect({ reject_reason: reason, feedback_text: feedback }),
  });
}

export function apiMarkAsPosted(itemId: string) {
  return fetchAPI(`/api/v1/portal/content-items/${itemId}/mark-posted`, {
    method: 'POST',
    body: sideEffect({}),
  });
}

export function apiConfirmPillars(pillars: Array<{ pillar_id: string; percentage: number }>) {
  if (!pillars.length) throw new Error('No pillars available to confirm');
  return fetchAPI(`/api/v1/portal/pillars/${pillars[0].pillar_id}/confirm`, {
    method: 'POST',
    body: sideEffect({ pillars: pillars.map((p) => ({ id: p.pillar_id, weight: p.percentage, name: p.pillar_id })) }),
  });
}

export function apiApproveWeek(cycleId: string) {
  return fetchAPI(`/api/v1/portal/cycles/${cycleId}/approve-week`, {
    method: 'POST',
    body: sideEffect({ content_plan_id: cycleId }),
  });
}

export function apiSubmitAssetRequest(requestId: string, assetUrls: string[]) {
  return fetchAPI(`/api/v1/portal/asset-requests/${requestId}/submit`, {
    method: 'POST',
    body: sideEffect({ asset_ids: assetUrls }),
  });
}

export async function apiUploadAsset(file: File, requestId?: string) {
  if (!API_BASE_URL) throw new Error('NEXT_PUBLIC_API_URL is not configured');
  const token = await getAccessToken();
  const query = requestId ? `?asset_request_id=${encodeURIComponent(requestId)}` : '';
  const response = await fetch(`${API_BASE_URL}/api/v1/portal/assets/upload${query}`, {
    method: 'POST', body: file,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': file.type, 'X-File-Name': file.name },
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.success === false) throw new Error(result?.error?.message || `Không thể tải ảnh lên (${response.status})`);
  return result?.data;
}

export function apiUpdateBrandVoice(config: BrandVoiceConfig) {
  const personalityKeywords = config.personalityKeywords
    .map((keyword) => keyword.trim())
    .filter(Boolean);
  const tone = [
    config.facebookTone,
    config.sentenceStyle,
    config.archetype,
    personalityKeywords.join(', '),
  ]
    .map((value) => value.trim())
    .find(Boolean) || '';

  return fetchAPI('/api/v1/portal/settings/brand-voice', {
    method: 'PATCH',
    body: sideEffect({
      tone,
      personality_keywords: personalityKeywords,
      writing_style: ['conversational', 'professional', 'playful'].includes(config.sentenceStyle)
        ? config.sentenceStyle
        : 'conversational',
      avoid_phrases: config.forbiddenWords,
    }),
  });
}

export function apiUpdateAgentModel(agentCode: string, model: string, tier: string, budget = 1) {
  return fetchAPI('/api/v1/portal/settings/agent-config', {
    method: 'PATCH',
    body: sideEffect({ agent_code: agentCode, model, tier, budget_usd_month: budget }),
  });
}

export function apiUpdateAgentBudget(
  agentCode: string,
  budget: number,
  current?: { selectedModel: string; tier: string },
) {
  const model = current?.selectedModel || 'gpt-4o';
  return fetchAPI('/api/v1/portal/settings/agent-config', {
    method: 'PATCH',
    body: sideEffect({
      agent_code: agentCode,
      model,
      tier: current?.tier || 'standard',
      budget_usd_month: budget,
    }),
  });
}
