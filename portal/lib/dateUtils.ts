/**
 * ISO 8601 Week Utilities
 * Chuẩn hóa cách tính số tuần trong năm và khoảng ngày từ Thứ Hai đến Chủ Nhật
 */

export function getISOWeekNumber(d: Date = new Date()): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export function getWeekDateRange(weekNum: number, year: number = new Date().getFullYear()): string {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const mondayWeek1 = new Date(Date.UTC(year, 0, 4 - jan4Day + 1));
  
  const monday = new Date(mondayWeek1.getTime() + (weekNum - 1) * 7 * 86400000);
  const sunday = new Date(monday.getTime() + 6 * 86400000);

  const format = (d: Date) => `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  return `${format(monday)} – ${format(sunday)}`;
}
