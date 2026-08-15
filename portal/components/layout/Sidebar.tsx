'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BookOpen,
  BarChart3,
  ImageIcon,
  Bot,
} from 'lucide-react';
import { usePortal } from '@/lib/store';

const NAV_ITEMS = [
  { href: '/', icon: LayoutDashboard, label: 'Công việc' },
  { href: '/a01-chat', icon: Bot, label: 'Trò chuyện A01' },
  { href: '/content-hub', icon: BookOpen, label: 'Kế hoạch' },
  { href: '/assets', icon: ImageIcon, label: 'Thư viện ảnh' },
  { href: '/reports', icon: BarChart3, label: 'Báo cáo' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { clientName } = usePortal();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <aside className="h-screen w-56 flex flex-col fixed left-0 top-0 border-r border-border bg-card z-40">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-lime-brand flex items-center justify-center shadow-accent-glow">
            <span className="text-white dark:text-black font-bold text-xs">CL</span>
          </div>
          <span className="font-bold text-sm tracking-wide text-foreground">CrewLab</span>
        </div>
      </div>

      {/* Client Badge */}
      <div className="px-4 py-3 border-b border-border">
        <div className="rounded-lg bg-muted/50 px-3 py-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Quán đang xem</p>
          <p className="text-xs font-semibold text-foreground mt-0.5 truncate">{clientName || 'Đang tải client…'}</p>
          <p className="text-[10px] text-muted-foreground">Dữ liệu tài khoản của bạn</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            id={`sidebar-nav-${label.toLowerCase().replace(/\s+/g, '-')}`}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
              isActive(href)
                ? 'bg-accent-tint text-lime-brand border border-accent-tint shadow-accent-glow'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <Icon
              size={16}
              className={isActive(href) ? 'text-lime-brand' : 'text-muted-foreground group-hover:text-foreground'}
            />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
