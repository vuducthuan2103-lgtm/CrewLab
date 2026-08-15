import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ContentPlanTable from '@/components/content-hub/ContentPlanTable';
import MetaPlannerTimeline from '@/components/content-hub/MetaPlannerTimeline';
import WeeklySchedulePopover from '@/components/content-hub/WeeklySchedulePopover';
import { usePortal } from '@/lib/store';
import type { ContentItem, ContentPillar } from '@/lib/types';
import * as api from '@/lib/api';

vi.mock('@/lib/store', () => ({ usePortal: vi.fn() }));
vi.mock('@/lib/api', () => ({
  apiFetchSettings: vi.fn().mockResolvedValue({
    schedule: { weekly_cycle_day: 'monday', weekly_cycle_time: '08:00' },
  }),
  apiUpdateWeeklySchedule: vi.fn().mockResolvedValue({ success: true }),
}));

const mockPillars: ContentPillar[] = [
  {
    id: 'pillar-1',
    label: 'Món Mới',
    emoji: '☕',
    description: 'Giới thiệu các thức uống mới',
    percentage: 50,
    fbRatio: 60,
    igRatio: 40,
    angles: [{ id: 'angle-1', label: 'Hương vị signature' }],
  },
  {
    id: 'pillar-2',
    label: 'Không Gian',
    emoji: '🌿',
    description: 'Góc làm việc và checkin',
    percentage: 50,
    fbRatio: 50,
    igRatio: 50,
    angles: [{ id: 'angle-2', label: 'Góc chill cuối tuần' }],
  },
];

const mockItems: ContentItem[] = [
  {
    id: 'content-1',
    title: 'Cold Brew Muối Biển',
    platform: 'fb',
    caption: 'Thử ngay vị cold brew mới thơm ngon.',
    imageUrl: 'https://example.test/coldbrew.jpg',
    publishTime: new Date('2026-08-17T08:30:00+07:00'), // Thứ Hai
    state: 'pending_content_approval',
    pillarId: 'pillar-1',
    weekNumber: 34,
    needsRealPhoto: false,
  },
  {
    id: 'content-2',
    title: 'Góc ban công ngập nắng',
    platform: 'ig',
    caption: 'Check-in góc sống ảo cực đỉnh.',
    imageUrl: null,
    publishTime: new Date('2026-08-18T14:00:00+07:00'), // Thứ Ba
    state: 'approved_ready_to_post',
    pillarId: 'pillar-2',
    weekNumber: 34,
    needsRealPhoto: true,
  },
];

describe('Planner Redesign Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (usePortal as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      contentItems: mockItems,
      pillars: mockPillars,
      updateContentSchedule: vi.fn(),
      weekApproved: false,
      approveWeek: vi.fn(),
    });
  });

  it('renders WeeklySchedulePopover and saves updated time', async () => {
    render(<WeeklySchedulePopover />);

    // Trigger button is present
    const triggerBtn = screen.getByRole('button', { name: /lịch tạo tự động/i });
    expect(triggerBtn).toBeDefined();

    // Click to open popover
    fireEvent.click(triggerBtn);
    expect(screen.getByText('Hẹn giờ tạo kế hoạch tuần')).toBeDefined();

    // Submit save
    const saveBtn = screen.getByRole('button', { name: /lưu lịch/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(api.apiUpdateWeeklySchedule).toHaveBeenCalled();
    });
  });

  it('renders ContentPlanTable with Meta Planner sub-tab by default and switches to table', () => {
    render(<ContentPlanTable />);

    // Check Subtab buttons
    const timelineSubTab = screen.getByRole('button', { name: /lịch \(meta planner\)/i });
    const tableSubTab = screen.getByRole('button', { name: /bảng dữ liệu/i });
    expect(timelineSubTab).toBeDefined();
    expect(tableSubTab).toBeDefined();

    // Default timeline should render post title
    expect(screen.getByText('Cold Brew Muối Biển')).toBeDefined();

    // Switch to table
    fireEvent.click(tableSubTab);
    expect(screen.getByText('Góc tiếp cận')).toBeDefined();
    expect(screen.getByText('Hương vị signature')).toBeDefined();
  });

  it('renders MetaPlannerTimeline with 7 day columns (T2 to CN) and post cards', () => {
    render(<MetaPlannerTimeline />);

    // Check weekdays header T2 to CN
    expect(screen.getByText('T2')).toBeDefined();
    expect(screen.getByText('T3')).toBeDefined();
    expect(screen.getByText('T4')).toBeDefined();
    expect(screen.getByText('CN')).toBeDefined();

    // Check Post card content
    expect(screen.getByText('Cold Brew Muối Biển')).toBeDefined();
    expect(screen.getByText('Món Mới')).toBeDefined();

    // Check View mode switch
    const weekBtn = screen.getByRole('button', { name: 'Tuần' });
    const monthBtn = screen.getByRole('button', { name: 'Tháng' });
    expect(weekBtn).toBeDefined();
    expect(monthBtn).toBeDefined();

    // Switch to month
    fireEvent.click(monthBtn);
    expect(screen.getByText('Tháng 8 2026')).toBeDefined();
  });
});
