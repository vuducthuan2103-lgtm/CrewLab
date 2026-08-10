import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({ getAccessToken: vi.fn().mockResolvedValue('test-token') }));

import { ApiError, apiSendA01Message } from '@/lib/api';

describe('Portal API structured errors', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('preserves provider diagnostics returned by the backend for A01', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({
      success: false,
      error: {
        error_code: 'LLM_RATE_LIMITED',
        message: 'A01 đang bận, vui lòng thử lại',
        details: {
          provider: 'anthropic',
          provider_request_id: 'req-provider-77',
          support_reference: 'req-support-88',
        },
      },
    }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'x-request-id': 'req-support-88' },
    }));

    await expect(apiSendA01Message('Tạo bài mới')).rejects.toMatchObject({
      name: 'ApiError',
      status: 429,
      errorCode: 'LLM_RATE_LIMITED',
      supportReference: 'req-support-88',
      provider: 'anthropic',
      providerRequestId: 'req-provider-77',
    });
  });
});
