'use client';

import React, { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import PortalLayout from '@/components/layout/PortalLayout';
import PillarSlider from '@/components/content-hub/PillarSlider';
import ContentPlanTable from '@/components/content-hub/ContentPlanTable';
import WeeklySchedulePopover from '@/components/content-hub/WeeklySchedulePopover';
import { CalendarDays } from 'lucide-react';

type Tab = 'pillar' | 'plan';

const TABS: { key: Tab; label: string }[] = [
  { key: 'pillar', label: 'Trụ nội dung' },
  { key: 'plan', label: 'Bảng kế hoạch' },
];

function ContentHubInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get('tab');

  // Normalize legacy tab keys
  const activeTab: Tab =
    rawTab === 'pillar'
      ? 'pillar'
      : rawTab === 'plan' || rawTab === 'plan-table' || rawTab === 'calendar'
      ? 'plan'
      : 'plan';

  return (
    <PortalLayout>
      {/* ─── Header Toolbar ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-accent-tint border border-accent-tint flex items-center justify-center shadow-accent-glow shrink-0">
            <CalendarDays size={18} className="text-lime-brand" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground tracking-tight">
              Công cụ lập kế hoạch
            </h1>
            <p className="text-xs text-muted-foreground">
              Lập lịch, quản lý trụ nội dung và theo dõi kế hoạch đăng bài tuần/tháng
            </p>
          </div>
        </div>

        {/* Compact Weekly Schedule Popover on the top right */}
        <WeeklySchedulePopover />
      </div>

      {/* ─── Level 1 Primary Tabs ────────────────────────────────────────────── */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            id={`content-hub-tab-${key}`}
            onClick={() => router.push(`/content-hub?tab=${key}`)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all -mb-px ${
              activeTab === key
                ? 'border-lime-brand text-lime-brand'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ─── Tab Contents ────────────────────────────────────────────────────── */}
      {activeTab === 'pillar' && <PillarSlider />}
      {activeTab === 'plan' && <ContentPlanTable />}
    </PortalLayout>
  );
}

export default function ContentHubPage() {
  return (
    <Suspense>
      <ContentHubInner />
    </Suspense>
  );
}
