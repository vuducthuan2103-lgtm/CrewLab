import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AssetsPage from '@/app/assets/page';
import MediaLibraryGrid from '@/components/assets/MediaLibraryGrid';
import { usePortal } from '@/lib/store';
import type { MediaAsset } from '@/lib/types';

vi.mock('@/lib/store', () => ({ usePortal: vi.fn() }));
vi.mock('@/components/layout/PortalLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

const loadAssets = vi.fn();
const uploadAsset = vi.fn();

function asset(indexingStatus: NonNullable<MediaAsset['indexingStatus']>): MediaAsset {
  return {
    id: `asset-${indexingStatus}`,
    url: 'https://example.test/source.jpg',
    thumbnailUrl: 'https://example.test/source.jpg',
    source: 'real_photo',
    tags: ['cold brew'],
    uploadedAt: new Date('2026-08-09T09:00:00+07:00'),
    usedInItems: [],
    notes: 'Ly cold brew trên quầy sáng',
    indexingStatus,
    indexingReason: indexingStatus === 'failed' ? 'VISION_INVALID_OUTPUT · REF-ASSET' : null,
  };
}

beforeEach(() => {
  loadAssets.mockReset().mockResolvedValue(undefined);
  uploadAsset.mockReset();
});

describe('Spec 0017 asset lifecycle in Portal', () => {
  it('polls while an upload is processing and stops at a terminal state', () => {
    vi.useFakeTimers();
    const state = {
      assetsStatus: 'ready',
      assetsError: null,
      mediaAssets: [asset('processing')],
      loadAssets,
      uploadAsset,
    };
    vi.mocked(usePortal).mockImplementation(() => state as unknown as ReturnType<typeof usePortal>);
    const view = render(<AssetsPage />);

    expect(loadAssets).toHaveBeenCalledWith();
    loadAssets.mockClear();
    act(() => vi.advanceTimersByTime(5000));
    expect(loadAssets).toHaveBeenCalledWith(true);

    state.mediaAssets = [asset('ready')];
    view.rerender(<AssetsPage />);
    loadAssets.mockClear();
    act(() => vi.advanceTimersByTime(15000));
    expect(loadAssets).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('keeps the upload control pending until the API resolves', async () => {
    let finish!: () => void;
    uploadAsset.mockReturnValue(new Promise<void>((resolve) => { finish = resolve; }));
    vi.mocked(usePortal).mockReturnValue({ mediaAssets: [], uploadAsset } as unknown as ReturnType<typeof usePortal>);
    const { container } = render(<MediaLibraryGrid />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [new File(['image'], 'cold-brew.jpg', { type: 'image/jpeg' })] } });

    expect(uploadAsset).toHaveBeenCalledTimes(1);
    expect(uploadAsset).toHaveBeenCalledWith(expect.any(File), true);
    expect(document.querySelector('#media-library-upload-btn')).toBeDisabled();
    finish();
    await waitFor(() => expect(document.querySelector('#media-library-upload-btn')).not.toBeDisabled());
  });

  it('shows the exact terminal indexing state and safe failure reason', () => {
    vi.mocked(usePortal).mockReturnValue({ mediaAssets: [asset('failed')], uploadAsset } as unknown as ReturnType<typeof usePortal>);
    render(<MediaLibraryGrid />);

    fireEvent.click(document.querySelector('#media-asset-asset-failed')!);

    expect(screen.getByText('Xử lý thất bại')).toBeInTheDocument();
    expect(screen.getByText('VISION_INVALID_OUTPUT · REF-ASSET')).toBeInTheDocument();
    expect(screen.getByText('Ly cold brew trên quầy sáng')).toBeInTheDocument();
  });

  it('reports upload errors without replacing the usable library', async () => {
    uploadAsset.mockRejectedValue(new Error('UPLOAD_STORAGE_FAILED · REF-UPLOAD'));
    vi.mocked(usePortal).mockReturnValue({ mediaAssets: [asset('ready')], uploadAsset } as unknown as ReturnType<typeof usePortal>);
    const { container } = render(<MediaLibraryGrid />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [new File(['image'], 'cold-brew.jpg', { type: 'image/jpeg' })] } });

    expect(await screen.findByText('UPLOAD_STORAGE_FAILED · REF-UPLOAD')).toBeInTheDocument();
    expect(document.querySelector('#media-asset-asset-ready')).toBeInTheDocument();
  });

  it('triggers delete asset confirmation and calls deleteAsset upon confirmation', async () => {
    const deleteAsset = vi.fn().mockResolvedValue(undefined);
    vi.mocked(usePortal).mockReturnValue({
      mediaAssets: [asset('ready')],
      uploadAsset,
      deleteAsset,
    } as unknown as ReturnType<typeof usePortal>);

    render(<MediaLibraryGrid />);

    // Click on quick delete button on card
    const deleteBtn = screen.getByTitle('Xóa ảnh');
    fireEvent.click(deleteBtn);

    // Confirm modal should appear
    expect(screen.getByText('Xác nhận xóa ảnh')).toBeInTheDocument();

    // Click confirm button
    const confirmBtn = screen.getByRole('button', { name: /Xóa vĩnh viễn/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(deleteAsset).toHaveBeenCalledWith('asset-ready');
    });
  });

  it('allows editing description and tags and calls updateAsset with new values', async () => {
    const updateAsset = vi.fn().mockResolvedValue(undefined);
    vi.mocked(usePortal).mockReturnValue({
      mediaAssets: [asset('ready')],
      uploadAsset,
      updateAsset,
    } as unknown as ReturnType<typeof usePortal>);

    render(<MediaLibraryGrid />);

    // Open detail modal
    fireEvent.click(document.querySelector('#media-asset-asset-ready')!);
    expect(screen.getByText('Chi tiết & Chỉnh sửa ảnh')).toBeInTheDocument();

    // Edit description
    const editDescBtn = screen.getByRole('button', { name: /^Chỉnh sửa$/i });
    fireEvent.click(editDescBtn);

    const textarea = screen.getByPlaceholderText(/Nhập mô tả chi tiết/i);
    fireEvent.change(textarea, { target: { value: 'Mô tả cà phê cold brew mới' } });

    // Add new tag
    const tagInput = screen.getByPlaceholderText(/Thêm tag mới/i);
    fireEvent.change(tagInput, { target: { value: 'caphe' } });
    fireEvent.keyDown(tagInput, { key: 'Enter' });

    // Remove existing tag 'cold brew'
    const removeTagBtns = screen.getAllByTitle('Xóa tag');
    fireEvent.click(removeTagBtns[0]);

    // Save changes
    const saveBtn = screen.getByRole('button', { name: /Lưu thay đổi/i });
    expect(saveBtn).not.toBeDisabled();
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateAsset).toHaveBeenCalledWith('asset-ready', {
        notes: 'Mô tả cà phê cold brew mới',
        tags: ['caphe'],
      });
    });
  });
});
