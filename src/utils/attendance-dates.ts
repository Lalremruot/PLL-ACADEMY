/**
 * Formats a Date as YYYY-MM-DD in local time (storage / input value key).
 */
export const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Formats a YYYY-MM-DD string or Date as DD/MM/YYYY for UI display.
 */
export const formatDisplayDate = (value: string | Date | null | undefined): string => {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return '—';
    }
    const day = String(value.getDate()).padStart(2, '0');
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const year = value.getFullYear();
    return `${day}/${month}/${year}`;
  }
  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${day}/${month}/${year}`;
  }
  const slashMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (slashMatch) {
    return value;
  }
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return formatDisplayDate(parsed);
  }
  return value;
};

/**
 * Parses a YYYY-MM-DD string into a local Date at midnight.
 */
export const parseDateKey = (dateKey: string): Date => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Returns Monday–Sunday date keys for the week containing `anchorDate`.
 */
export const getWeekDateKeys = (anchorDate: string): string[] => {
  const date = parseDateKey(anchorDate);
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + mondayOffset);
  return Array.from({ length: 7 }, (_, index) => {
    const next = new Date(monday);
    next.setDate(monday.getDate() + index);
    return formatDateKey(next);
  });
};

/**
 * Returns all date keys in the calendar month of `anchorDate` (YYYY-MM or YYYY-MM-DD).
 */
export const getMonthDateKeys = (anchorDate: string): string[] => {
  const base = anchorDate.length === 7 ? `${anchorDate}-01` : anchorDate;
  const date = parseDateKey(base);
  const year = date.getFullYear();
  const month = date.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, index) =>
    formatDateKey(new Date(year, month, index + 1))
  );
};

/**
 * Builds a 6x7 calendar grid (Sun–Sat) for a month, with nulls for empty cells.
 */
export const getMonthCalendarCells = (anchorDate: string): Array<string | null> => {
  const base = anchorDate.length === 7 ? `${anchorDate}-01` : anchorDate;
  const date = parseDateKey(base);
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<string | null> = Array.from({ length: firstWeekday }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(formatDateKey(new Date(year, month, day)));
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  return cells;
};

/**
 * Shifts a YYYY-MM-DD date by a number of days.
 */
export const shiftDateKey = (dateKey: string, days: number): string => {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + days);
  return formatDateKey(date);
};

/**
 * Shifts a month anchor by months; returns YYYY-MM-01.
 */
export const shiftMonthKey = (anchorDate: string, months: number): string => {
  const base = anchorDate.length === 7 ? `${anchorDate}-01` : anchorDate;
  const date = parseDateKey(base);
  date.setMonth(date.getMonth() + months);
  return formatDateKey(new Date(date.getFullYear(), date.getMonth(), 1));
};

/**
 * Returns a short weekday label for a date key.
 */
export const getWeekdayShort = (dateKey: string): string => {
  return parseDateKey(dateKey).toLocaleDateString('en-GB', { weekday: 'short' });
};

/**
 * Returns a month+year label for display.
 */
export const getMonthLabel = (anchorDate: string): string => {
  const base = anchorDate.length === 7 ? `${anchorDate}-01` : anchorDate;
  return parseDateKey(base).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
};
