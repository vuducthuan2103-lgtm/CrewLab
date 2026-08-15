'use client';

import React, { useEffect, useRef, useState } from 'react';
import { CalendarClock, ChevronDown, Check, Clock, Save, Loader2 } from 'lucide-react';
import { apiFetchSettings, apiUpdateWeeklySchedule } from '@/lib/api';

const DAYS = [
  ['monday', 'Thứ Hai'],
  ['tuesday', 'Thứ Ba'],
  ['wednesday', 'Thứ Tư'],
  ['thursday', 'Thứ Năm'],
  ['friday', 'Thứ Sáu'],
  ['saturday', 'Thứ Bảy'],
  ['sunday', 'Chủ nhật'],
] as const;

export default function WeeklySchedulePopover() {
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState('monday');
  const [time, setTime] = useState('08:00');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const loadSchedule = async () => {
    try {
      const settings = await apiFetchSettings();
      const schedule = settings.schedule || {};
      if (schedule.weekly_cycle_day) setDay(schedule.weekly_cycle_day);
      if (schedule.weekly_cycle_time) setTime(schedule.weekly_cycle_time);
    } catch {
      // Keep default values if failed
    }
  };

  useEffect(() => {
    void loadSchedule();
  }, []);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const saveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await apiUpdateWeeklySchedule(day, time);
      setMessage({ type: 'success', text: 'Đã lưu lịch tự động hàng tuần.' });
      setTimeout(() => {
        setOpen(false);
        setMessage(null);
      }, 1200);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Không thể lưu lịch tuần.',
      });
    } finally {
      setSaving(false);
    }
  };

  const selectedDayLabel = DAYS.find(([val]) => val === day)?.[1] ?? 'Thứ Hai';

  return (
    <div className="relative inline-block text-left" ref={popoverRef}>
      <button
        type="button"
        id="weekly-schedule-trigger-btn"
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all shadow-sm ${
          open
            ? 'border-lime-brand bg-accent-tint text-lime-brand'
            : 'border-border bg-card text-foreground hover:bg-muted/50'
        }`}
        title="Cấu hình lịch tạo bài tự động"
      >
        <CalendarClock size={14} className="text-lime-brand" />
        <span className="hidden sm:inline">Lịch tạo tự động:</span>
        <span className="font-mono text-lime-brand font-bold">{selectedDayLabel} {time}</span>
        <ChevronDown size={12} className={`text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180 text-lime-brand' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-xl border border-border bg-card p-4 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-border">
            <Clock size={15} className="text-lime-brand" />
            <div>
              <h4 className="text-xs font-bold text-foreground">Hẹn giờ tạo kế hoạch tuần</h4>
              <p className="text-[10px] text-muted-foreground">AI tự động lên lịch và gửi bản nháp bài viết</p>
            </div>
          </div>

          <form onSubmit={saveSchedule} className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                Ngày trong tuần
              </label>
              <select
                value={day}
                onChange={(e) => setDay(e.target.value)}
                className="w-full h-8 rounded-lg border border-border bg-background px-2.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-lime-brand"
              >
                {DAYS.map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                Thời gian tạo bài
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full h-8 rounded-lg border border-border bg-background px-2.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-lime-brand"
              />
            </div>

            {message && (
              <div
                className={`p-2 rounded-lg text-xs flex items-center gap-1.5 ${
                  message.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}
              >
                {message.type === 'success' && <Check size={12} />}
                <span>{message.text}</span>
              </div>
            )}

            <div className="pt-1 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted/50"
              >
                Đóng
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-lime-brand text-xs font-bold text-black hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                {saving ? 'Đang lưu...' : 'Lưu lịch'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
