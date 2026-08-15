'use client';

import React, { useState } from 'react';
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
  const { clientName, brandLogoUrl } = usePortal();
  const [isHovered, setIsHovered] = useState(false);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const handleNavClick = () => {
    // Tự động đóng/thu gọn lại ngay khi chọn tab
    setIsHovered(false);
  };

  const initialLetter = (clientName || 'B').slice(0, 1).toUpperCase();

  return (
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`h-screen flex flex-col fixed left-0 top-0 border-r border-border bg-card/98 backdrop-blur-md z-50 transition-all duration-300 ease-in-out ${
        isHovered ? 'w-60 shadow-2xl' : 'w-[68px]'
      }`}
    >
      {/* Top Header: CrewLab Project Logo (No background, larger typography) */}
      <div className={`py-4 border-b border-border flex items-center transition-all ${isHovered ? 'px-4' : 'px-3 justify-center'}`}>
        <Link href="/" onClick={handleNavClick} className="flex items-center gap-3 min-w-0 group">
          <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105">
            <img
              src="/logo_crewlab_icon.png"
              alt="CrewLab Logo"
              className="w-full h-full object-contain drop-shadow-sm"
            />
          </div>
          {isHovered && (
            <div className="flex flex-col min-w-0 overflow-hidden animate-in fade-in duration-200">
              <span className="font-extrabold text-lg tracking-wide text-foreground">
                Crew<span className="text-lime-brand">Lab</span>
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className={`flex-1 py-3 space-y-1 overflow-y-auto transition-all ${isHovered ? 'px-3' : 'px-2'}`}>
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={handleNavClick}
              id={`sidebar-nav-${label.toLowerCase().replace(/\s+/g, '-')}`}
              className={`flex items-center rounded-lg text-sm font-medium transition-all duration-150 ${
                isHovered
                  ? 'gap-3 px-3 py-2.5'
                  : 'w-10 h-10 mx-auto justify-center'
              } ${
                active
                  ? 'bg-accent-tint text-lime-brand border border-accent-tint shadow-accent-glow font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Icon
                size={isHovered ? 16 : 18}
                className={`flex-shrink-0 ${active ? 'text-lime-brand' : 'text-muted-foreground group-hover:text-foreground'}`}
              />
              {isHovered && (
                <span className="truncate animate-in fade-in duration-150">{label}</span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
