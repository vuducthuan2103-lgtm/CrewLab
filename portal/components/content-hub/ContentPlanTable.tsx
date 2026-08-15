'use client';

import React, { useState } from 'react';
import { usePortal } from '@/lib/store';
import { toast } from '@/components/ui/Toast';
import { ContentItem, ContentPillar, FSM_STATE_LABELS } from '@/lib/types';
import ContentApprovalModal, { FacebookLogo, InstagramLogo } from '@/components/approval/ContentApprovalModal';
import MetaPlannerTimeline from '@/components/content-hub/MetaPlannerTimeline';
import {
  CalendarDays,
  Check,
  CheckSquare,
  ChevronRight,
  Download,
  ImageIcon,
  TableProperties,
} from 'lucide-react';

type PillarStyle = { bg: string; text: string; border: string };

const PILLAR_STYLES: PillarStyle[] = [
  { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },
  { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
];
const UNKNOWN_PILLAR_STYLE: PillarStyle = {
  bg: 'bg-zinc-500/10',
  text: 'text-zinc-400',
  border: 'border-zinc-500/20',
};

function getPillarMeta(item: ContentItem, pillars: ContentPillar[]) {
  const pillarIndex = pillars.findIndex((pillar) => pillar.id === item.pillarId);
  const pillar = pillarIndex >= 0 ? pillars[pillarIndex] : undefined;
  const angles = pillar?.angles ?? [];
  const angleIndex = angles.length ? item.id.charCodeAt(item.id.length - 1) % angles.length : 0;
  return {
    label: pillar?.label ?? 'Chưa gán trụ',
    angle: angles[angleIndex]?.label ?? 'Góc tiếp cận chung',
    style: pillarIndex >= 0 ? PILLAR_STYLES[pillarIndex % PILLAR_STYLES.length] : UNKNOWN_PILLAR_STYLE,
  };
}

function StateBadge({ state }: { state: ContentItem['state'] }) {
  const configs: Record<string, { class: string }> = {
    pending_content_approval: {
      class: 'bg-accent-tint-15 text-lime-brand border-accent-tint shadow-accent-glow',
    },
    approved_ready_to_post: {
      class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    },
    posted: { class: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    eval_failed: { class: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    planned: { class: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' },
    ready_for_generation: { class: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
    evaluating: { class: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  };
  const cfg = configs[state] ?? { class: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' };
  return (
    <span
      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.class} tracking-wide`}
    >
      {FSM_STATE_LABELS[state] ?? state}
    </span>
  );
}

function PlatformBadge({ platform }: { platform: ContentItem['platform'] }) {
  if (platform === 'fb')
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20 rounded-full px-2 py-0.5">
        <FacebookLogo className="w-3 h-3" />
        Facebook
      </span>
    );
  if (platform === 'ig')
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20 rounded-full px-2 py-0.5">
        <InstagramLogo className="w-3 h-3" />
        Instagram
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-full px-2 py-0.5">
      <FacebookLogo className="w-3 h-3" />
      <span className="text-zinc-500">+</span>
      <InstagramLogo className="w-3 h-3" />
    </span>
  );
}

function ScheduleEditor({
  item,
  onScheduleChange,
}: {
  item: ContentItem;
  onScheduleChange: (item: ContentItem, value: Date) => Promise<void>;
}) {
  const isEditable = item.state === 'planned' || item.state === 'pending_content_approval';
  const dateValue = `${item.publishTime.getFullYear()}-${String(
    item.publishTime.getMonth() + 1
  ).padStart(2, '0')}-${String(item.publishTime.getDate()).padStart(2, '0')}`;
  const timeValue = `${String(item.publishTime.getHours()).padStart(2, '0')}:${String(
    item.publishTime.getMinutes()
  ).padStart(2, '0')}`;

  const update = (part: 'date' | 'time', rawValue: string) => {
    const next = new Date(item.publishTime);
    if (part === 'date') {
      const [year, month, day] = rawValue.split('-').map(Number);
      next.setFullYear(year, month - 1, day);
    } else {
      const [hour, minute] = rawValue.split(':').map(Number);
      next.setHours(hour, minute, 0, 0);
    }
    void onScheduleChange(item, next);
  };

  if (!isEditable)
    return (
      <span className="font-mono text-xs">
        {item.publishTime.toLocaleString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </span>
    );

  return (
    <div className="flex min-w-40 gap-1.5" onClick={(e) => e.stopPropagation()}>
      <input
        aria-label={`Ngày đăng ${item.title}`}
        type="date"
        value={dateValue}
        onChange={(event) => update('date', event.target.value)}
        className="h-7 w-28 rounded-lg border border-border bg-background px-1.5 text-[11px] font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-lime-brand"
      />
      <input
        aria-label={`Giờ đăng ${item.title}`}
        type="time"
        value={timeValue}
        onChange={(event) => update('time', event.target.value)}
        className="h-7 w-20 rounded-lg border border-border bg-background px-1.5 text-[11px] font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-lime-brand"
      />
    </div>
  );
}

function Thumbnail({ item }: { item: ContentItem }) {
  return item.imageUrl ? (
    <img
      src={item.imageUrl}
      alt={item.title}
      className="w-10 h-10 rounded-lg object-cover border border-border shrink-0"
    />
  ) : (
    <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center border border-border shrink-0">
      <ImageIcon size={16} className="text-muted-foreground" />
    </div>
  );
}

function EmptyPlan() {
  return (
    <div className="border border-dashed border-border rounded-xl p-12 text-center text-sm text-muted-foreground space-y-1">
      <p className="font-semibold text-foreground">Chưa có bài đăng nào trong kế hoạch</p>
      <p className="text-xs">
        AI sẽ tự động lên kế hoạch theo lịch tuần, hoặc bạn có thể duyệt Trụ nội dung để kích hoạt.
      </p>
    </div>
  );
}

function TableView({
  items,
  pillars,
  onItemClick,
  onScheduleChange,
}: {
  items: ContentItem[];
  pillars: ContentPillar[];
  onItemClick: (item: ContentItem) => void;
  onScheduleChange: (item: ContentItem, value: Date) => Promise<void>;
}) {
  if (!items.length) return <EmptyPlan />;
  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/40 text-muted-foreground text-[11px] font-semibold uppercase tracking-wider border-b border-border">
              <th className="px-4 py-3 text-left w-12">STT</th>
              <th className="px-4 py-3 text-left">Trụ nội dung</th>
              <th className="px-4 py-3 text-left">Góc tiếp cận</th>
              <th className="px-4 py-3 text-left min-w-[240px]">Bài đăng</th>
              <th className="px-4 py-3 text-center">Kênh</th>
              <th className="px-4 py-3 text-left min-w-[180px]">Ngày giờ đăng</th>
              <th className="px-4 py-3 text-left">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((item, index) => {
              const meta = getPillarMeta(item, pillars);
              return (
                <tr
                  key={item.id}
                  onClick={() => onItemClick(item)}
                  className="hover:bg-muted/30 cursor-pointer transition-colors group"
                >
                  <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                    {String(index + 1).padStart(2, '0')}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${meta.style.bg} ${meta.style.text} ${meta.style.border}`}
                    >
                      {meta.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-[160px] truncate">
                    {meta.angle}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Thumbnail item={item} />
                      <span className="text-xs font-semibold text-foreground group-hover:text-lime-brand transition-colors line-clamp-2">
                        {item.title}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <PlatformBadge platform={item.platform} />
                  </td>
                  <td className="px-4 py-3 text-xs text-foreground font-medium">
                    <ScheduleEditor item={item} onScheduleChange={onScheduleChange} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <StateBadge state={item.state} />
                      <ChevronRight
                        size={13}
                        className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ContentPlanTable() {
  const { contentItems, pillars, updateContentSchedule, weekApproved, approveWeek } = usePortal();
  const [subTab, setSubTab] = useState<'table' | 'timeline'>('timeline');
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [approvedAnimation, setApprovedAnimation] = useState(false);

  const sorted = [...contentItems].sort(
    (a, b) => a.publishTime.getTime() - b.publishTime.getTime()
  );

  const handleApproveWeek = async () => {
    try {
      await approveWeek();
      setApprovedAnimation(true);
      toast.success('Đã duyệt kế hoạch tuần!', 'Toàn bộ bài viết trong tuần đã sẵn sàng xuất bản.');
      setTimeout(() => setApprovedAnimation(false), 2000);
    } catch {
      toast.error('Không thể duyệt kế hoạch tuần. Vui lòng thử lại.');
    }
  };

  const exportTablePlan = () => {
    const headers = ['STT', 'Tên bài viết', 'Trụ nội dung', 'Kênh', 'Ngày giờ đăng', 'Trạng thái'];
    const rows = sorted.map((item, index) => {
      const meta = getPillarMeta(item, pillars);
      return [
        index + 1,
        `"${item.title.replace(/"/g, '""')}"`,
        `"${meta.label.replace(/"/g, '""')}"`,
        item.platform.toUpperCase(),
        item.publishTime.toLocaleString('vi-VN'),
        FSM_STATE_LABELS[item.state] ?? item.state,
      ];
    });
    const uri = encodeURI(
      `data:text/csv;charset=utf-8,\uFEFF${[headers.join(','), ...rows.map((row) => row.join(','))].join('\n')}`
    );
    const link = document.createElement('a');
    link.href = uri;
    link.download = `CrewLab_BangKeHoach.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.info('Đã xuất bảng kế hoạch ra file CSV!');
  };

  return (
    <div className="space-y-4">
      {/* Sub-tabs switch: Bảng vs Lịch */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">Chế độ xem:</span>
          <div className="flex items-center rounded-lg border border-border bg-card p-0.5 shadow-sm">
            <button
              type="button"
              id="subtab-btn-timeline"
              onClick={() => setSubTab('timeline')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                subTab === 'timeline'
                  ? 'bg-lime-brand text-black shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <CalendarDays size={13} />
              Lịch (Meta Planner)
            </button>
            <button
              type="button"
              id="subtab-btn-table"
              onClick={() => setSubTab('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                subTab === 'table'
                  ? 'bg-lime-brand text-black shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <TableProperties size={13} />
              Bảng dữ liệu
            </button>
          </div>
          <span className="text-xs font-mono text-muted-foreground ml-2">
            ({sorted.length} bài đăng)
          </span>
        </div>

        {/* Global actions in table mode */}
        {subTab === 'table' && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportTablePlan}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <Download size={13} />
              Xuất CSV
            </button>
            <button
              type="button"
              onClick={() => void handleApproveWeek()}
              disabled={weekApproved || approvedAnimation || sorted.length === 0}
              className={`flex items-center gap-1.5 h-8 px-3.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                weekApproved || approvedAnimation
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default'
                  : 'bg-lime-brand text-black hover:opacity-90 disabled:opacity-50'
              }`}
            >
              {weekApproved || approvedAnimation ? <Check size={13} /> : <CheckSquare size={13} />}
              {weekApproved ? 'Đã duyệt tuần' : 'Duyệt tất cả tuần'}
            </button>
          </div>
        )}
      </div>

      {/* Render sub-tab content */}
      {subTab === 'timeline' ? (
        <MetaPlannerTimeline />
      ) : (
        <TableView
          items={sorted}
          pillars={pillars}
          onItemClick={setSelectedItem}
          onScheduleChange={async (item, value) => updateContentSchedule(item.id, value)}
        />
      )}

      {selectedItem && (
        <ContentApprovalModal
          contentItem={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}
