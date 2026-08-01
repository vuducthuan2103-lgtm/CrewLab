import { v4 as uuidv4 } from 'uuid';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Get Supabase token from local storage or session if present
  let token = 'mock_jwt_token_for_dev';
  if (typeof window !== 'undefined') {
    const supabaseAuth = localStorage.getItem('sb-gbpmriiukhfwmjlurkwg-auth-token');
    if (supabaseAuth) {
      try {
        const parsed = JSON.parse(supabaseAuth);
        token = parsed.access_token || token;
      } catch (e) {
        // use fallback
      }
    }
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...(options.headers || {}),
  };

  const response = await fetch(url, { ...options, headers });
  const result = await response.json();
  
  if (!response.ok || (result.success === false)) {
    const errorMsg = result.error?.message || `API Error ${response.status}`;
    throw new Error(errorMsg);
  }
  
  return result.data;
}

// ─── Content Items API (Spec 0009a) ──────────────────────────────────────────
export async function apiFetchContentItems(status?: string) {
  const query = status ? `?status=${status}` : '';
  return fetchAPI(`/api/v1/portal/content-items${query}`);
}

export async function apiApproveContent(itemId: string, editedCaption?: string) {
  const idempotency_key = uuidv4();
  return fetchAPI(`/api/v1/portal/content-items/${itemId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ edited_caption: editedCaption, idempotency_key }),
  });
}

export async function apiRejectContent(itemId: string, reason: string, feedback: string) {
  const idempotency_key = uuidv4();
  return fetchAPI(`/api/v1/portal/content-items/${itemId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reject_reason: reason, feedback_text: feedback, idempotency_key }),
  });
}

export async function apiMarkAsPosted(itemId: string) {
  const idempotency_key = uuidv4();
  return fetchAPI(`/api/v1/portal/content-items/${itemId}/mark-posted`, {
    method: 'POST',
    body: JSON.stringify({ idempotency_key }),
  });
}

export async function apiFetchTaskLogs(limit: number = 50) {
  return fetchAPI(`/api/v1/portal/task-logs?limit=${limit}`);
}
