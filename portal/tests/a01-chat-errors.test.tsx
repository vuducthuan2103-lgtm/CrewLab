import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    apiFetchA01Messages: vi.fn(),
    apiSendA01Message: vi.fn(),
  };
});

import A01Chat from '@/components/chat/A01Chat';
import { ApiError, apiFetchA01Messages, apiSendA01Message } from '@/lib/api';

const history = vi.mocked(apiFetchA01Messages);
const send = vi.mocked(apiSendA01Message);

beforeEach(() => {
  history.mockReset();
  send.mockReset();
  history.mockResolvedValue([]);
});

describe('A01 controlled errors', () => {
  it('renders provider, provider request ID, error code and support reference', async () => {
    send.mockRejectedValue(new ApiError(
      'Provider tạm thời không phản hồi',
      502,
      'LLM_PROVIDER_UNAVAILABLE',
      'support-reference-89abcdef',
      'openai',
      'provider-request-123',
    ));
    render(<A01Chat />);

    const input = await screen.findByRole('textbox', { name: 'Nhắn tin cho A01' });
    fireEvent.change(input, { target: { value: 'Viết một bài cold brew' } });
    fireEvent.submit(input.closest('form')!);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Provider tạm thời không phản hồi');
    expect(alert).toHaveTextContent('LLM_PROVIDER_UNAVAILABLE');
    expect(alert).toHaveTextContent('Provider: openai');
    expect(alert).toHaveTextContent('Provider request: provider-request-123');
    expect(alert).toHaveTextContent('89ABCDEF');
  });

  it('does not send a second A01 request while the first request is pending', async () => {
    let finish!: (value: Awaited<ReturnType<typeof apiSendA01Message>>) => void;
    send.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    render(<A01Chat />);

    const input = await screen.findByRole('textbox', { name: 'Nhắn tin cho A01' });
    fireEvent.change(input, { target: { value: 'Tạo nội dung cuối tuần' } });
    const form = input.closest('form')!;
    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(send).toHaveBeenCalledTimes(1);
    expect(input).toBeDisabled();
    finish({
      id: 'message-1',
      user_message: 'Tạo nội dung cuối tuần',
      assistant_message: 'Đã giao việc',
      action: 'create_content',
      dispatch_status: 'queued',
      content_item_id: 'content-1',
      created_at: '2026-08-09T10:00:00+07:00',
    });
    await waitFor(() => expect(input).not.toBeDisabled());
  });
});
