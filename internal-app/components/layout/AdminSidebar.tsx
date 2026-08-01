'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Activity,
  ScrollText,
  UserPlus,
  LogOut,
  Shield,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/clients', icon: Users, label: 'Clients' },
  { href: '/task-logs', icon: ScrollText, label: 'Task Logs' },
  { href: '/onboarding', icon: UserPlus, label: 'Onboarding' },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const handleLogout = () => {
    router.push('/login');
  };

  return (
    <aside className="h-screen w-56 flex flex-col fixed left-0 top-0 border-r border-border bg-card z-40">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-lime-admin flex items-center justify-center shadow-glow-lime-sm">
            <span className="text-black font-extrabold text-xs">CL</span>
          </div>
          <div>
            <span className="font-bold text-sm tracking-wide text-foreground">CrewLab</span>
            <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-tint text-cyan-admin border border-cyan-tint font-mono uppercase tracking-wider">
              Admin
            </span>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="px-4 py-3 border-b border-border">
        <div className="rounded-lg bg-muted/50 px-3 py-2">
          <div className="flex items-center gap-1.5">
            <Shield size={11} className="text-cyan-admin" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Agency Operations</p>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <p className="text-[10px] text-emerald-400 font-mono">System Online • 6 Agents</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            id={`admin-nav-${label.toLowerCase().replace(/\s+/g, '-')}`}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
              isActive(href)
                ? 'bg-lime-tint text-lime-admin border border-lime-tint shadow-lime-glow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <Icon
              size={16}
              className={isActive(href) ? 'text-lime-admin' : 'text-muted-foreground group-hover:text-foreground'}
            />
            {label}
          </Link>
        ))}

        {/* Divider */}
        <div className="pt-2 pb-1 px-3">
          <div className="border-t border-border" />
        </div>

        {/* Content Monitor — shows under clients as contextual link */}
        <div className="px-3 pt-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1.5">Per-Client Views</p>
        </div>
        <Link
          href="/clients"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
        >
          <Activity size={14} className="text-cyan-admin" />
          <span>Content Monitor</span>
        </Link>
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-border space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-lime-admin flex items-center justify-center text-xs font-extrabold text-black">
            AG
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">Agency Admin</p>
            <p className="text-[10px] text-muted-foreground truncate">admin@crewlab.vn</p>
          </div>
        </div>
        <button
          id="admin-logout-btn"
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-red-400 hover:bg-red-500/5 border border-transparent hover:border-red-500/20 transition-all"
        >
          <LogOut size={13} />
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}
