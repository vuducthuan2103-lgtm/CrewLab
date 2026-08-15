'use client';

import { useEffect, useState } from 'react';
import { CalendarClock, CirclePlay, RefreshCw, RotateCcw, Save, XCircle } from 'lucide-react';
import { apiFetchSettings, apiResetWeeklyCycle, apiStartWeeklyPreview, apiUpdateWeeklySchedule } from '@/lib/api';
import { usePortal } from '@/lib/store';

const DAYS = [
  ['monday', 'Thứ Hai'], ['tuesday', 'Thứ Ba'], ['wednesday', 'Thứ Tư'], ['thursday', 'Thứ Năm'],
  ['friday', 'Thứ Sáu'], ['saturday', 'Thứ Bảy'], ['sunday', 'Chủ nhật'],
] as const;

export default function WeeklyPlanningPanel() {
  const { refreshData } = usePortal();
  const [day, setDay] = useState('monday');
  const [time, setTime] = useState('08:00');
  const [cycleStatus, setCycleStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState<'save' | 'preview' | 'reset' | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadSchedule = async () => {
    try {
      const settings = await apiFetchSettings();
      const schedule = settings.schedule || {};
      setDay(schedule.weekly_cycle_day || 'monday');
      setTime(schedule.weekly_cycle_time || '08:00');
      setCycleStatus(schedule.status || null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không tải được lịch tuần.');
    }
  };

  useEffect(() => { void loadSchedule(); }, []);

  const saveSchedule = async () => {
    setBusy('save'); setMessage(null);
    try {
      await apiUpdateWeeklySchedule(day, time);
      setMessage('Đã lưu lịch tự động hàng tuần.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể lưu lịch tuần.');
    } finally { setBusy(null); }
  };

  const startPreview = async () => {
    setBusy('preview'); setMessage(null);
    try {
      await apiStartWeeklyPreview();
      await refreshData();
      await loadSchedule();
      setMessage('Đã gửi yêu cầu. AI (B02) đang tạo bản nháp Trụ nội dung cho tuần này — vui lòng làm mới sau ít giây.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể tạo kế hoạch tuần.');
    } finally { setBusy(null); }
  };

  const closeWeek = async () => {
    setBusy('reset'); setMessage(null);
    try {
      await apiResetWeeklyCycle();
      await refreshData();
      await loadSchedule();
      setMessage('Đã đóng tuần hiện tại. Bạn có thể bắt đầu tuần mới bất kỳ lúc nào.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể đóng tuần.');
    } finally { setBusy(null); }
  };

  const refresh = async () => { setMessage(null); await refreshData(); await loadSchedule(); };
  const hasActiveCycle = cycleStatus === 'active';

  return (
    <section className="mb-6 rounded-xl border border-border bg-card p-4 md:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Left: Schedule settings */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-bold text-foreground">
            <CalendarClock size={16} className="text-lime-brand" />
            Lịch tạo bài tự động hằng tuần
          </div>
          <p className="text-xs text-muted-foreground">
            AI sẽ tự động lên kế hoạch và gửi bản nháp vào khung giờ này mỗi tuần để bạn duyệt.
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              Vào:
              <select value={day} onChange={(event) => setDay(event.target.value)} className="h-8 rounded-lg border border-border bg-background px-2 text-xs font-semibold text-foreground">
                {DAYS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              Lúc:
              <input type="time" value={time} onChange={(event) => setTime(event.target.value)} className="h-8 rounded-lg border border-border bg-background px-2 text-xs font-semibold text-foreground" />
            </label>
            <button type="button" onClick={saveSchedule} disabled={busy !== null} className="h-8 rounded-lg border border-border px-2.5 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50">
              <Save size={12} className="mr-1 inline" />
              {busy === 'save' ? 'Đang lưu...' : 'Lưu lịch'}
            </button>
          </div>
        </div>

        {/* Right: Actions for current week */}
        <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0">
          {hasActiveCycle && (
            <button
              type="button"
              onClick={closeWeek}
              disabled={busy !== null}
              className="h-9 rounded-lg border border-border bg-muted/30 px-3 text-xs font-medium text-muted-foreground hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50 transition-colors"
              title="Đóng bản nháp tuần đang làm dở"
            >
              <XCircle size={13} className="mr-1 inline" />
              {busy === 'reset' ? 'Đang đóng...' : 'Đóng tuần này'}
            </button>
          )}
          <button
            type="button"
            onClick={startPreview}
            disabled={busy !== null}
            className="h-9 rounded-lg bg-lime-brand px-3.5 text-xs font-bold text-black hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            <CirclePlay size={13} className="mr-1.5 inline" />
            {busy === 'preview' ? 'Đang tạo...' : hasActiveCycle ? 'Tạo lại tuần này' : 'Tạo kế hoạch tuần này'}
          </button>
          <button
            type="button"
            onClick={refresh}
            disabled={busy !== null}
            className="h-9 rounded-lg border border-border px-2.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Làm mới trạng thái"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>
      {message && <p className="mt-3 rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground">{message}</p>}
    </section>
  );
}

