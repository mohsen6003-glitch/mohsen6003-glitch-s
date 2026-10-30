/**
 * Persian number to words converter and number utilities
 */

const ones = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه'];
const teens = ['ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده'];
const tens = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];
const hundreds = ['', 'یکصد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد'];
const scales = ['', 'هزار', 'میلیون', 'میلیارد', 'تریلیون'];

function convertChunk(num: number): string {
  const parts: string[] = [];
  const h = Math.floor(num / 100);
  const rem = num % 100;
  const t = Math.floor(rem / 10);
  const o = rem % 10;

  if (h > 0) parts.push(hundreds[h]);

  if (rem >= 10 && rem < 20) {
    parts.push(teens[rem - 10]);
  } else {
    if (t > 0) parts.push(tens[t]);
    if (o > 0) parts.push(ones[o]);
  }

  return parts.join(' و ');
}

export function numberToPersianWords(num: number | string): string {
  const n = typeof num === 'string' ? parseInt(num.replace(/,/g, ''), 10) : Math.floor(num);
  if (isNaN(n) || n === 0) return 'صفر';
  if (n < 0) return 'منفی ' + numberToPersianWords(-n);

  let temp = n;
  const chunks: string[] = [];
  let scaleIndex = 0;

  while (temp > 0) {
    const chunk = temp % 1000;
    if (chunk > 0) {
      const chunkStr = convertChunk(chunk);
      const scaleStr = scales[scaleIndex];
      const chunkText = scaleStr ? `${chunkStr} ${scaleStr}` : chunkStr;
      chunks.unshift(chunkText);
    }
    temp = Math.floor(temp / 1000);
    scaleIndex++;
  }

  return chunks.join(' و ') + ' تومان';
}

export function formatToman(amount: number): string {
  return (amount || 0).toLocaleString('fa-IR');
}

/**
 * Converts Persian/Arabic digits to English digits and strips non-numeric characters (except optional decimal point)
 */
export function cleanNumberInput(val: string | number | undefined | null, allowDecimal = true): string {
  if (val === undefined || val === null || val === '') return '';
  let str = String(val);

  // Convert Persian digits ۰-۹ to 0-9
  str = str.replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776));
  // Convert Arabic digits ٠-٩ to 0-9
  str = str.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));
  // Remove commas and Arabic thousand separators
  str = str.replace(/[,،٬\s]/g, '');

  if (allowDecimal) {
    // Replace Persian/Arabic decimal separator with dot
    str = str.replace(/[٫/]/g, '.');
    str = str.replace(/[^0-9.]/g, '');
    const parts = str.split('.');
    if (parts.length > 2) {
      str = parts[0] + '.' + parts.slice(1).join('');
    }
  } else {
    str = str.replace(/[^0-9]/g, '');
  }

  // Strip leading zeros unless it's "0" or "0.xxx"
  if (str.length > 1 && str.startsWith('0') && !str.startsWith('0.')) {
    str = str.replace(/^0+/, '') || '0';
  }

  return str;
}

/**
 * Formats a numeric string or number with 3-digit comma separators (e.g. "15000000" -> "15,000,000")
 * Preserves trailing decimal point and fractional digits while typing.
 */
export function formatNumberInput(val: string | number | undefined | null, allowDecimal = true): string {
  const clean = cleanNumberInput(val, allowDecimal);
  if (!clean) return '';

  const parts = clean.split('.');
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  if (allowDecimal && parts.length > 1) {
    return `${intPart}.${parts[1]}`;
  }
  return intPart;
}

/**
 * Safely parses a potentially comma-separated or Persian-digit string into a float
 */
export function parseFormattedNumber(val: string | number | undefined | null): number {
  const clean = cleanNumberInput(val, true);
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

