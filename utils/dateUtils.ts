import DateObject from 'react-date-object';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';

export interface PersianMonthInfo {
  year: number;
  month: number;
  monthName: string;
  day: number;
  formatted: string;
}

export const PERSIAN_MONTH_NAMES = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
];

/**
 * Extracts Persian year, month, and day from various date formats
 */
export function getPersianDateInfo(dateInput: string | number | Date | undefined | null): PersianMonthInfo {
  if (!dateInput) {
    const now = new DateObject({ calendar: persian, locale: persian_fa });
    return {
      year: now.year,
      month: now.month.number,
      monthName: PERSIAN_MONTH_NAMES[now.month.number - 1] || now.month.name,
      day: now.day,
      formatted: now.format('YYYY/MM/DD')
    };
  }

  try {
    // If it's a numeric timestamp or string representation of timestamp
    if (typeof dateInput === 'number' || (!isNaN(Number(dateInput)) && Number(dateInput) > 100000000000)) {
      const d = new DateObject({ date: new Date(Number(dateInput)), calendar: persian, locale: persian_fa });
      return {
        year: d.year,
        month: d.month.number,
        monthName: PERSIAN_MONTH_NAMES[d.month.number - 1] || d.month.name,
        day: d.day,
        formatted: d.format('YYYY/MM/DD')
      };
    }

    // If it's a string like "1403/05/12 14:30" or "1403-05-12"
    if (typeof dateInput === 'string' && (dateInput.includes('/') || dateInput.includes('-'))) {
      const cleanStr = dateInput.trim().split(' ')[0].replace(/-/g, '/');
      const parts = cleanStr.split('/');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const d = parseInt(parts[2], 10);
        if (y >= 1300 && y <= 1500 && m >= 1 && m <= 12) {
          return {
            year: y,
            month: m,
            monthName: PERSIAN_MONTH_NAMES[m - 1],
            day: d || 1,
            formatted: `${y}/${String(m).padStart(2, '0')}/${String(d || 1).padStart(2, '0')}`
          };
        }
      }
      
      const parsedDate = new Date(dateInput);
      if (!isNaN(parsedDate.getTime())) {
        const d = new DateObject({ date: parsedDate, calendar: persian, locale: persian_fa });
        return {
          year: d.year,
          month: d.month.number,
          monthName: PERSIAN_MONTH_NAMES[d.month.number - 1] || d.month.name,
          day: d.day,
          formatted: d.format('YYYY/MM/DD')
        };
      }
    }

    const d = new DateObject({ date: dateInput as any, calendar: persian, locale: persian_fa });
    return {
      year: d.year,
      month: d.month.number,
      monthName: PERSIAN_MONTH_NAMES[d.month.number - 1] || d.month.name,
      day: d.day,
      formatted: d.format('YYYY/MM/DD')
    };
  } catch (e) {
    const fallback = new DateObject({ calendar: persian, locale: persian_fa });
    return {
      year: fallback.year,
      month: fallback.month.number,
      monthName: PERSIAN_MONTH_NAMES[fallback.month.number - 1] || fallback.month.name,
      day: fallback.day,
      formatted: fallback.format('YYYY/MM/DD')
    };
  }
}

/**
 * Checks if a given item (with date string or id timestamp) matches the target Persian year and month
 */
export function isItemInPersianMonth(item: { id?: string; date?: string }, targetYear: number, targetMonth: number): boolean {
  // First test the explicit date string
  if (item.date) {
    const info = getPersianDateInfo(item.date);
    if (info.year === targetYear && info.month === targetMonth) {
      return true;
    }
  }

  // Next fallback to timestamp ID
  if (item.id) {
    const info = getPersianDateInfo(item.id);
    if (info.year === targetYear && info.month === targetMonth) {
      return true;
    }
  }

  return false;
}

/**
 * Get current Persian Year and Month
 */
export function getCurrentPersianYearAndMonth(): { year: number; month: number; monthName: string } {
  const now = new DateObject({ calendar: persian, locale: persian_fa });
  return {
    year: now.year,
    month: now.month.number,
    monthName: PERSIAN_MONTH_NAMES[now.month.number - 1] || now.month.name
  };
}

/**
 * Get previous Persian Year and Month
 */
export function getPreviousPersianYearAndMonth(year: number, month: number): { year: number; month: number; monthName: string } {
  if (month === 1) {
    return { year: year - 1, month: 12, monthName: PERSIAN_MONTH_NAMES[11] };
  }
  return { year, month: month - 1, monthName: PERSIAN_MONTH_NAMES[month - 2] };
}
