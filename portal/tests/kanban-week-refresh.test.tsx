import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import KanbanBoard from '../components/kanban/KanbanBoard';
import { getISOWeekNumber } from '../lib/dateUtils';
import { ContentItem } from '../lib/types';

const currentWeek = getISOWeekNumber();

const mockRefreshData = vi.fn().mockResolvedValue(undefined);

const sampleItems: ContentItem[] = [
  {
    id: 'item-current-week',
    title: 'Cà phê rang mộc tuần này',
    platform: 'fb',
    caption: 'Thưởng thức cà phê rang mộc',
    imageUrl: 'https://example.com/item1.jpg',
    publishTime: new Date(), // current week
    state: 'pending_content_approval',
    pillarId: 'pillar-1',
    weekNumber: currentWeek,
    needsRealPhoto: false,
  },
  {
    id: 'item-other-week',
    title: 'Đặc sản tuần khác',
    platform: 'ig',
    caption: 'Đặc sản cà phê',
    imageUrl: 'https://example.com/item2.jpg',
    publishTime: new Date(Date.now() + 14 * 86400000), // future week
    state: 'planned',
    pillarId: 'pillar-1',
    weekNumber: currentWeek + 2,
    needsRealPhoto: false,
  },
];

vi.mock('@/lib/store', () => ({
  usePortal: () => ({
    tasks: [],
    contentItems: sampleItems,
    pillars: [
      { id: 'pillar-1', label: 'Sản phẩm', emoji: '☕', description: 'Menu', percentage: 100, fbRatio: 50, igRatio: 50, angles: [] },
    ],
    agentModelConfigs: [],
    weekApproved: true,
    refreshData: mockRefreshData,
    isLoading: false,
  }),
}));

describe('KanbanBoard Week Navigation & Refresh Tests', () => {
  it('calls refreshData when clicking "Làm mới" button and shows feedback', async () => {
    render(<KanbanBoard />);

    const refreshBtn = screen.getByTitle('Làm mới dữ liệu từ máy chủ');
    expect(refreshBtn).toBeInTheDocument();

    fireEvent.click(refreshBtn);
    expect(mockRefreshData).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(screen.getByText('Đã làm mới!')).toBeInTheDocument();
    });
  });

  it('filters tasks dynamically according to selected week and shows/hides "Tuần này" button', () => {
    render(<KanbanBoard />);

    // Initially in currentWeek
    expect(screen.getAllByText(new RegExp(`Tuần ${currentWeek}`)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Cà phê rang mộc tuần này/).length).toBeGreaterThan(0);
    // Task from other week should not appear in current week view
    expect(screen.queryByText(/Đặc sản tuần khác/)).toBeNull();

    // Navigate to next week
    const nextBtn = screen.getByTitle('Tuần sau');
    fireEvent.click(nextBtn);

    // Week label updates
    expect(screen.getAllByText(new RegExp(`Tuần ${currentWeek + 1}`)).length).toBeGreaterThan(0);
    // "Tuần này" button appears
    const thisWeekBtn = screen.getByText('Tuần này');
    expect(thisWeekBtn).toBeInTheDocument();

    // In week (currentWeek + 1) there are no tasks, empty state should show
    expect(screen.getByText(new RegExp(`Chưa có bài viết hay công việc nào trong`))).toBeInTheDocument();

    // Navigate one more week to (currentWeek + 2)
    fireEvent.click(nextBtn);
    expect(screen.getAllByText(new RegExp(`Tuần ${currentWeek + 2}`)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Đặc sản tuần khác/).length).toBeGreaterThan(0);

    // Click "Tuần này" to return to current week
    fireEvent.click(thisWeekBtn);
    expect(screen.getAllByText(new RegExp(`Tuần ${currentWeek}`)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Cà phê rang mộc tuần này/).length).toBeGreaterThan(0);
  });
});
