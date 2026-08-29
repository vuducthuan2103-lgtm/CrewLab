'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Box,
  LayoutDashboard,
  BookOpen,
  BarChart3,
  ImageIcon,
  Bot,
  Settings,
  LogOut,
} from 'lucide-react';
import { usePortal } from '@/lib/store';
import { signOut } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/office', icon: Box, label: 'Văn phòng 3D' },
  { href: '/tasks', icon: LayoutDashboard, label: 'Bảng công việc' },
  { href: '/a01-chat', icon: Bot, label: 'Trò chuyện A01' },
  { href: '/content-hub', icon: BookOpen, label: 'Kế hoạch' },
  { href: '/assets', icon: ImageIcon, label: 'Thư viện ảnh' },
  { href: '/reports', icon: BarChart3, label: 'Báo cáo' },
  { href: '/settings', icon: Settings, label: 'Cài đặt' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { clientName, portalUserEmail, brandLogoUrl } = usePortal();
  const [isHovered, setIsHovered] = useState(false);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  const initialLetter = (clientName || 'B').slice(0, 1).toUpperCase();

  return (
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`h-screen flex flex-col justify-between fixed left-0 top-0 border-r border-border bg-[#0e0e14]/95 backdrop-blur-2xl z-50 transition-[width,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-[width] select-none overflow-hidden ${
        isHovered ? 'w-60 shadow-[8px_0_36px_rgba(0,0,0,0.65)]' : 'w-[68px] shadow-none'
      }`}
    >
      {/* ── TOP: BRAND LOGO & CREWLAB TITLE ── */}
      <div>
        <div className="h-16 border-b border-border/80 flex items-center px-4 shrink-0 overflow-hidden">
          <Link href="/" prefetch={true} className="flex items-center gap-3 min-w-0 group">
            <div className="w-9 h-9 flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105">
              <img
                src="/logo_crewlab_icon.png"
                alt="CrewLab Logo"
                className="w-8 h-8 object-contain drop-shadow-md"
              />
            </div>
            <div
              className={`flex flex-col min-w-0 transition-all duration-250 ease-out overflow-hidden ${
                isHovered ? 'opacity-100 translate-x-0 w-auto' : 'opacity-0 -translate-x-3 w-0 pointer-events-none'
              }`}
            >
              <span className="font-black text-lg tracking-tight text-white whitespace-nowrap">
                Crew<span className="text-[#D4FF00]">Lab</span>
              </span>
            </div>
          </Link>
        </div>

        {/* ── MIDDLE: NAVIGATION LINKS ── */}
        <nav className="py-3 px-2.5 space-y-1 overflow-y-auto overflow-x-hidden max-h-[calc(100vh-145px)]">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                prefetch={true}
                onClick={() => setIsHovered(false)}
                id={`sidebar-nav-${label.toLowerCase().replace(/\s+/g, '-')}`}
                className={`flex items-center h-10 rounded-xl text-xs font-semibold transition-colors duration-150 relative group ${
                  active
                    ? 'bg-[#D4FF00]/15 text-[#D4FF00] border border-[#D4FF00]/30 shadow-md shadow-[#D4FF00]/10'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60 border border-transparent'
                }`}
              >
                {/* Fixed-width Icon container — perfectly centered when collapsed */}
                <div className="w-10 h-10 flex items-center justify-center shrink-0">
                  <Icon
                    size={18}
                    className={`transition-transform duration-150 group-hover:scale-110 ${
                      active ? 'text-[#D4FF00]' : 'text-zinc-400 group-hover:text-white'
                    }`}
                  />
                </div>

                {/* Label that smoothly slides & fades in */}
                <div
                  className={`overflow-hidden transition-all duration-200 ease-out whitespace-nowrap ${
                    isHovered ? 'opacity-100 translate-x-0 ml-1' : 'opacity-0 -translate-x-2 w-0 pointer-events-none'
                  }`}
                >
                  <span className="truncate">{label}</span>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* ── BOTTOM: CLIENT BRAND BADGE, USER PROFILE & LOGOUT ── */}
      <div className="p-2 border-t border-border/80 bg-zinc-950/40 space-y-1">
        <Link
          href="/settings"
          prefetch={true}
          className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-zinc-800/50 transition-colors group cursor-pointer"
          title={`Quán: ${clientName || 'Bardinh Coffee'}`}
        >
          {/* Client Logo or Initial Avatar */}
          <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700/80 flex items-center justify-center shrink-0 overflow-hidden shadow-sm group-hover:border-[#D4FF00]/50 transition-colors">
            {brandLogoUrl ? (
              <img src={brandLogoUrl} alt={clientName || 'Brand Logo'} className="w-full h-full object-cover" />
            ) : (
              <span className="text-[#D4FF00] font-black text-sm">{initialLetter}</span>
            )}
          </div>

          {/* Client & Account Details */}
          <div
            className={`flex flex-col min-w-0 transition-all duration-200 ease-out overflow-hidden ${
              isHovered ? 'opacity-100 translate-x-0 w-auto' : 'opacity-0 -translate-x-2 w-0 pointer-events-none'
            }`}
          >
            <p className="text-xs font-bold text-white truncate group-hover:text-[#D4FF00] transition-colors">
              {clientName || 'Bardinh Coffee'}
            </p>
            <p className="text-[10px] text-zinc-400 truncate">
              {portalUserEmail || 'admin@bardinh.vn'}
            </p>
          </div>
        </Link>

        {/* Logout Button */}
        <button
          id="sidebar-logout-btn"
          type="button"
          onClick={handleLogout}
          title="Đăng xuất"
          className="w-full flex items-center h-10 rounded-xl text-xs font-medium text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors duration-150 group cursor-pointer"
        >
          <div className="w-10 h-10 flex items-center justify-center shrink-0">
            <LogOut
              size={18}
              className="text-zinc-400 group-hover:text-red-400 transition-transform duration-150 group-hover:scale-110"
            />
          </div>
          <div
            className={`overflow-hidden transition-all duration-200 ease-out whitespace-nowrap ${
              isHovered ? 'opacity-100 translate-x-0 ml-1' : 'opacity-0 -translate-x-2 w-0 pointer-events-none'
            }`}
          >
            <span className="truncate">Đăng xuất</span>
          </div>
        </button>
      </div>
    </aside>
  );
}

