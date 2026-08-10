import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ContentApprovalModal from '@/components/approval/ContentApprovalModal';
import { usePortal } from '@/lib/store';
import type { ContentItem } from '@/lib/types';

vi.mock('@/lib/store', () => ({ usePortal: vi.fn() }));

const approveContent = vi.fn();
const rejectContent = vi.fn();
const markAsPosted = vi.fn();

function item(state: ContentItem['state']): ContentItem {
  return {
    id: 'content-1',
    title: 'Cold brew cuối tuần',
    platform: 'both',
    caption: 'Caption gốc',
    imageUrl: 'https://example.test/final.jpg',
    publishTime: new Date('2026-08-09T10:00:00+07:00'),
    state,
    pillarId: 'pillar-1',
    weekNumber: 32,
    needsRealPhoto: false,
    imageProvenance: {
      sourceAssetId: 'source-asset-7',
      derivativeAssetId: 'derivative-asset-9',
      generationMode: 'guided_edit',
      selectionRationale: 'Khớp món cold brew và không gian quầy bar',
      selectionScore: 91,
    },
  };
}

function renderModal(state: ContentItem['state']) {
  const onClose = vi.fn();
  render(<ContentApprovalModal contentItem={item(state)} onClose={onClose} />);
  return { onClose };
}

beforeEach(() => {
  approveContent.mockReset();
  rejectContent.mockReset();
  markAsPosted.mockReset();
  vi.mocked(usePortal).mockReturnValue({
    approveContent,
    rejectContent,
    markAsPosted,
    clientName: 'Nhà Mình Coffee',
  } as unknown as ReturnType<typeof usePortal>);
});

describe('Portal HITL content approval', () => {
  it('uses the active tenant brand and exposes D02 image provenance', () => {
    renderModal('pending_content_approval');

    expect(screen.getByText('Nhà Mình Coffee')).toBeInTheDocument();
    expect(screen.getAllByText('nhà.mình.coffee').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('source-asset-7')).toBeInTheDocument();
    expect(screen.getByText('guided_edit')).toBeInTheDocument();
    expect(screen.getByText('91/100')).toBeInTheDocument();
    expect(screen.getByText('Khớp món cold brew và không gian quầy bar')).toBeInTheDocument();
  });

  it('waits for approve, forwards the edited caption, and shows success', async () => {
    let finish!: () => void;
    approveContent.mockReturnValue(new Promise<void>((resolve) => { finish = resolve; }));
    renderModal('pending_content_approval');

    fireEvent.click(screen.getByText('Chỉnh sửa'));
    fireEvent.change(document.querySelector('#caption-editor')!, { target: { value: 'Caption client sửa' } });
    fireEvent.click(document.querySelector('#approve-btn')!);

    expect(approveContent).toHaveBeenCalledWith('content-1', 'Caption client sửa');
    expect(document.querySelector('#approve-btn')).toBeDisabled();
    finish();
    expect(await screen.findByText(/Đã duyệt thành công/)).toBeInTheDocument();
  });

  it('keeps the modal actionable and exposes an approve failure', async () => {
    approveContent.mockRejectedValue(new Error('APPROVE_CONFLICT · REF-APPROVE'));
    renderModal('pending_content_approval');

    fireEvent.click(document.querySelector('#approve-btn')!);

    expect(await screen.findByRole('alert')).toHaveTextContent('APPROVE_CONFLICT · REF-APPROVE');
    await waitFor(() => expect(document.querySelector('#approve-btn')).not.toBeDisabled());
  });

  it('waits for reject and forwards the reason plus feedback', async () => {
    rejectContent.mockResolvedValue(undefined);
    renderModal('pending_content_approval');

    fireEvent.click(document.querySelector('#reject-btn')!);
    fireEvent.change(document.querySelector('#reject-reason-select')!, { target: { value: 'wrong_asset' } });
    fireEvent.change(document.querySelector('#reject-feedback-text')!, { target: { value: 'Ảnh chưa đúng món' } });
    fireEvent.click(document.querySelector('#confirm-reject')!);

    await waitFor(() => expect(rejectContent).toHaveBeenCalledWith('content-1', 'wrong_asset', 'Ảnh chưa đúng món'));
    expect(await screen.findByText(/Đã từ chối và gửi feedback/)).toBeInTheDocument();
  });

  it('keeps rejection form open and exposes a reject failure', async () => {
    rejectContent.mockRejectedValue(new Error('REJECT_WRITE_FAILED · REF-REJECT'));
    renderModal('pending_content_approval');

    fireEvent.click(document.querySelector('#reject-btn')!);
    fireEvent.click(document.querySelector('#confirm-reject')!);

    expect(await screen.findByRole('alert')).toHaveTextContent('REJECT_WRITE_FAILED · REF-REJECT');
    expect(document.querySelector('#reject-feedback-text')).toBeInTheDocument();
    await waitFor(() => expect(document.querySelector('#confirm-reject')).not.toBeDisabled());
  });

  it('marks an approved item as posted only after the request succeeds', async () => {
    markAsPosted.mockResolvedValue(undefined);
    renderModal('approved_ready_to_post');

    fireEvent.click(document.querySelector('#mark-as-posted-btn')!);

    await waitFor(() => expect(markAsPosted).toHaveBeenCalledWith('content-1'));
    expect(await screen.findByText(/Đã đánh dấu đã đăng/)).toBeInTheDocument();
  });

  it('keeps mark-posted available and exposes a request failure', async () => {
    markAsPosted.mockRejectedValue(new Error('INVALID_FSM_TRANSITION · REF-POST'));
    renderModal('approved_ready_to_post');

    fireEvent.click(document.querySelector('#mark-as-posted-btn')!);

    expect(await screen.findByRole('alert')).toHaveTextContent('INVALID_FSM_TRANSITION · REF-POST');
    await waitFor(() => expect(document.querySelector('#mark-as-posted-btn')).not.toBeDisabled());
  });
});
