'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BookOpen,
  BarChart3,
  Bell,
  Settings,
  ImageIcon,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', icon: LayoutDashboard, label: 'Công việc' },
  { href: '/content-hub', icon: BookOpen, label: 'Kế hoạch' },
  { href: '/assets', icon: ImageIcon, label: 'Thư viện ảnh' },
  { href: '/reports', icon: BarChart3, label: 'Báo cáo' },
  { href: '/settings', icon: Settings, label: 'Cài đặt' },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <aside className="h-screen w-56 flex flex-col fixed left-0 top-0 border-r border-border bg-card z-40">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#D4FF00] flex items-center justify-center shadow-[0_0_12px_rgba(212,255,0,0.4)]">
            <span className="text-black font-bold text-xs">CL</span>
          </div>
          <span className="font-bold text-sm tracking-wide text-foreground">CrewLab</span>
        </div>
      </div>

      {/* Client Badge */}
      <div className="px-4 py-3 border-b border-border">
        <div className="rounded-lg bg-muted/50 px-3 py-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Quán đang xem</p>
          <p className="text-xs font-semibold text-foreground mt-0.5 truncate">Bardinh Coffee</p>
          <p className="text-[10px] text-muted-foreground">Tuần 25 • 16–22/06</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            id={`sidebar-nav-${label.toLowerCase().replace(/\s+/g, '-')}`}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
              isActive(href)
                ? 'bg-[#D4FF00]/10 text-[#D4FF00] border border-[#D4FF00]/20 shadow-[0_0_10px_rgba(212,255,0,0.08)]'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <Icon
              size={16}
              className={isActive(href) ? 'text-[#D4FF00]' : 'text-muted-foreground group-hover:text-foreground'}
            />
            {label}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-foreground">
            B
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">Bardinh Admin</p>
            <p className="text-[10px] text-muted-foreground truncate">admin@bardinh.vn</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
