'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePortal } from '@/lib/store';
import {
  Bell,
  X,
  CheckCircle2,
  BarChart3,
  ChevronRight,
  Settings,
  LogOut,
  ChevronDown,
  User,
} from 'lucide-react';
import { AppNotification, NotificationType } from '@/lib/types';
import { signOut } from '@/lib/supabase';

function NotificationIcon({ type }: { type: NotificationType }) {
  if (type === 'content_ready_for_approval') return <CheckCircle2 size={14} className="text-lime-brand" />;
  if (type === 'strategy_ready_for_approval') return <BarChart3 size={14} className="text-purple-400" />;
  return <Bell size={14} className="text-muted-foreground" />;
}

function NotificationItem({ notif, onClose }: { notif: AppNotification; onClose: () => void }) {
  const { markNotificationRead } = usePortal();
  return (
    <div
      onClick={() => {
        markNotificationRead(notif.id);
        onClose();
      }}
      className={`flex gap-3 p-3 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${!notif.read ? 'bg-muted/30' : ''}`}
    >
      <div className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center">
        <NotificationIcon type={notif.type} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-semibold mb-0.5 ${!notif.read ? 'text-foreground' : 'text-muted-foreground'}`}>{notif.title}</p>
        <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{notif.body}</p>
        <p className="text-[10px] text-muted-foreground/60 mt-1">
          {notif.createdAt.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
        </p>
      </div>
      {!notif.read && <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-lime-brand flex-shrink-0 shadow-accent-glow" />}
    </div>
  );
}

export default function Header() {
  const router = useRouter();
  const { notifications, unreadCount, clientName, portalUserEmail } = usePortal();
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = async () => {
    setProfileOpen(false);
    await signOut();
    router.push('/login');
  };

  const initialLetter = (clientName || portalUserEmail || 'B').slice(0, 1).toUpperCase();

  return (
    <header className="fixed top-0 left-56 right-0 h-14 z-30 border-b border-border bg-background/95 backdrop-blur-sm flex items-center px-6 gap-4 justify-between">
      {/* Left side spacer */}
      <div className="flex-1" />

      {/* Right side controls: Notifications + User Profile */}
      <div className="flex items-center gap-3">
        {/* Notifications Bell */}
        <div className="relative">
          <button
            id="notification-bell"
            onClick={() => {
              setNotifOpen(!notifOpen);
              setProfileOpen(false);
            }}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent hover:border-border transition-all duration-150 relative"
            title="Thông báo"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-lime-brand font-bold flex items-center justify-center text-[9px] text-black shadow-sm">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {notifOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
              <div className="absolute right-0 top-11 w-80 z-50 rounded-xl border border-border bg-card shadow-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Bell size={14} className="text-lime-brand" />
                    <span className="text-sm font-semibold">Thông báo</span>
                  </div>
                  <button onClick={() => setNotifOpen(false)} className="text-muted-foreground hover:text-foreground">
                    <X size={14} />
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto p-2 space-y-0.5">
                  {notifications.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">Không có thông báo mới</p>
                  ) : (
                    notifications.map((n) => (
                      <NotificationItem key={n.id} notif={n} onClose={() => setNotifOpen(false)} />
                    ))
                  )}
                </div>
                <div className="px-4 py-2.5 border-t border-border">
                  <button className="text-[11px] text-lime-brand hover:underline flex items-center gap-1">
                    Xem tất cả thông báo <ChevronRight size={11} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Vertical Divider */}
        <div className="w-[1px] h-6 bg-border mx-1" />

        {/* User / Brand Profile Dropdown in Top-Right Corner */}
        <div className="relative">
          <button
            id="user-profile-menu-btn"
            onClick={() => {
              setProfileOpen(!profileOpen);
              setNotifOpen(false);
            }}
            className="flex items-center gap-2.5 p-1.5 pl-2 rounded-xl hover:bg-muted/50 border border-transparent hover:border-border transition-all duration-150 text-left"
          >
            {/* Avatar */}
            <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-200">
              {initialLetter}
            </div>

            {/* User Info (hidden on very small screens) */}
            <div className="hidden md:block max-w-[140px]">
              <p className="text-xs font-semibold text-foreground truncate leading-tight">
                {clientName || 'Bardinh Coffee'}
              </p>
              <p className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">
                {portalUserEmail || 'ndmtruong183@gmail.com'}
              </p>
            </div>

            <ChevronDown size={14} className="text-muted-foreground ml-0.5" />
          </button>

          {/* Profile Dropdown Menu */}
          {profileOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
              <div className="absolute right-0 top-12 w-64 z-50 rounded-xl border border-border bg-card shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                {/* Header User Card */}
                <div className="p-3.5 border-b border-border bg-muted/30">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-100 shrink-0">
                      {initialLetter}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-foreground truncate">
                        {clientName || 'Bardinh Coffee'}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {portalUserEmail || 'ndmtruong183@gmail.com'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Menu Options */}
                <div className="p-1.5 space-y-0.5">
                  <Link
                    href="/settings"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-muted/60 transition-colors"
                  >
                    <Settings size={14} className="text-muted-foreground" />
                    <span>Cài đặt thương hiệu & AI</span>
                  </Link>
                </div>

                {/* Logout Button */}
                <div className="p-1.5 border-t border-border">
                  <button
                    id="header-logout-btn"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-red-500 hover:bg-red-500/10 transition-colors text-left"
                  >
                    <LogOut size={14} />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
