'use client';

import React, { useState } from 'react';
import { usePortal } from '@/lib/store';
import { Bell, Sun, Moon, Zap, X, CheckCircle2, Image as ImageIcon, BarChart3, ChevronRight } from 'lucide-react';
import { AppNotification, NotificationType } from '@/lib/types';

function NotificationIcon({ type }: { type: NotificationType }) {
  if (type === 'content_ready_for_approval') return <CheckCircle2 size={14} className="text-lime-brand" />;
  if (type === 'asset_request_created') return <ImageIcon size={14} className="text-cyan-400" />;
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
      className={`flex gap-3 p-3 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${
        !notif.read ? 'bg-muted/30' : ''
      }`}
    >
      <div className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center">
        <NotificationIcon type={notif.type} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-semibold mb-0.5 ${!notif.read ? 'text-foreground' : 'text-muted-foreground'}`}>
          {notif.title}
        </p>
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
  const { isDark, toggleTheme, notifications, unreadCount, triggerDemoAiEvent } = usePortal();
  const [notifOpen, setNotifOpen] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const handleDemoTrigger = () => {
    setDemoLoading(true);
    setTimeout(() => {
      triggerDemoAiEvent();
      setDemoLoading(false);
    }, 800);
  };

  return (
    <header className="fixed top-0 left-56 right-0 h-14 z-30 border-b border-border bg-background/95 backdrop-blur-sm flex items-center px-6 gap-4">
      {/* Left: Page title area */}
      <div className="flex-1" />

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Demo Trigger */}
        <button
          id="demo-trigger-ai-event"
          onClick={handleDemoTrigger}
          disabled={demoLoading}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-accent-tint text-lime-brand hover:bg-accent-tint transition-all duration-150 disabled:opacity-60 shadow-sm"
          title="Giả lập sự kiện AI chạy — dùng khi demo/pitching"
        >
          <Zap size={12} className={demoLoading ? 'animate-spin' : ''} />
          {demoLoading ? 'Đang chạy…' : '⚡ Demo AI'}
        </button>

        {/* Theme Toggle */}
        <button
          id="theme-toggle"
          onClick={toggleTheme}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-150"
          title={isDark ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
        >
          {isDark ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* Notification Bell */}
        <div className="relative">
          <button
            id="notification-bell"
            onClick={() => setNotifOpen(!notifOpen)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-150 relative"
          >
            <Bell size={15} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-lime-brand font-bold flex items-center justify-center text-[9px] shadow-sm">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {notifOpen && (
            <>
              {/* Backdrop */}
              <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
              <div className="absolute right-0 top-10 w-80 z-50 rounded-xl border border-border bg-card shadow-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Bell size={13} className="text-lime-brand" />
                    <span className="text-sm font-semibold">Thông báo</span>
                    {unreadCount > 0 && (
                      <span className="text-[10px] bg-accent-tint text-lime-brand border border-accent-tint rounded-full px-1.5 py-0.5 font-semibold">
                        {unreadCount} mới
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => setNotifOpen(false)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto p-2 space-y-0.5">
                  {notifications.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">Không có thông báo nào</p>
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
      </div>
    </header>
  );
}
