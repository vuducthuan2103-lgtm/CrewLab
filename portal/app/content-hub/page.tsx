'use client';

import React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import PortalLayout from '@/components/layout/PortalLayout';
import CampaignPlaceholder from '@/components/content-hub/CampaignPlaceholder';
import PillarSlider from '@/components/content-hub/PillarSlider';
import ContentCalendar from '@/components/content-hub/ContentCalendar';
import { Megaphone, Columns3, CalendarDays, BookOpen } from 'lucide-react';
import { Suspense } from 'react';

type Tab = 'campaign' | 'pillar' | 'calendar';

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'campaign', label: 'Campaign', icon: <Megaphone size={13} /> },
  { key: 'pillar', label: 'Trụ nội dung', icon: <Columns3 size={13} /> },
  { key: 'calendar', label: 'Lịch nội dung', icon: <CalendarDays size={13} /> },
];

function ContentHubInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = (searchParams.get('tab') as Tab) || 'calendar';

  const setTab = (t: Tab) => {
    router.push(`/content-hub?tab=${t}`);
  };

  return (
    <PortalLayout>
      {/* Page title */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-[#D4FF00]/10 border border-[#D4FF00]/30 flex items-center justify-center">
          <BookOpen size={15} className="text-[#D4FF00]" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">Kế hoạch nội dung</h1>
          <p className="text-xs text-muted-foreground">Tuần 25 (16–22/06) · Bardinh Coffee</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 mb-6 border-b border-border">
        {TABS.map(({ key, label, icon }) => (
          <button
            key={key}
            id={`content-hub-tab-${key}`}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${
              tab === key
                ? 'border-[#D4FF00] text-[#D4FF00]'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'campaign' && <CampaignPlaceholder />}
      {tab === 'pillar' && <PillarSlider />}
      {tab === 'calendar' && <ContentCalendar />}
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
