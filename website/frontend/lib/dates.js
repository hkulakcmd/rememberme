/**
 * Date helpers for birthdays. A "today" value is a plain { year, month, day }
 * object so calculations never shift because of the browser timezone.
 */
export const MONTHS = [
  { value: 1, nominative: 'Styczeń', genitive: 'stycznia', short: 'sty' },
  { value: 2, nominative: 'Luty', genitive: 'lutego', short: 'lut' },
  { value: 3, nominative: 'Marzec', genitive: 'marca', short: 'mar' },
  { value: 4, nominative: 'Kwiecień', genitive: 'kwietnia', short: 'kwi' },
  { value: 5, nominative: 'Maj', genitive: 'maja', short: 'maj' },
  { value: 6, nominative: 'Czerwiec', genitive: 'czerwca', short: 'cze' },
  { value: 7, nominative: 'Lipiec', genitive: 'lipca', short: 'lip' },
  { value: 8, nominative: 'Sierpień', genitive: 'sierpnia', short: 'sie' },
  { value: 9, nominative: 'Wrzesień', genitive: 'września', short: 'wrz' },
  { value: 10, nominative: 'Październik', genitive: 'października', short: 'paź' },
  { value: 11, nominative: 'Listopad', genitive: 'listopada', short: 'lis' },
  { value: 12, nominative: 'Grudzień', genitive: 'grudnia', short: 'gru' },
];

export function monthByValue(value) {
  return MONTHS.find((month) => month.value === Number(value));
}

export function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

/** Use year 2000 (a leap year) so 29 February is always valid input. */
export function daysInMonth(month, year = 2000) {
  const value = Number(month);
  if (!Number.isInteger(value) || value < 1 || value > 12) return 0;
  return new Date(Date.UTC(Number(year), value, 0)).getUTCDate();
}

export function isValidBirthDate(month, day) {
  const monthValue = Number(month);
  const dayValue = Number(day);
  if (!Number.isInteger(monthValue) || !Number.isInteger(dayValue)) {
    return false;
  }
  if (monthValue < 1 || monthValue > 12) return false;
  return dayValue >= 1 && dayValue <= daysInMonth(monthValue, 2000);
}

export function occurrenceInYear(month, day, year) {
  const monthValue = Number(month);
  const dayValue = Number(day);
  if (monthValue === 2 && dayValue === 29 && !isLeapYear(year)) {
    return { year, month: 2, day: 28 };
  }
  return { year, month: monthValue, day: dayValue };
}

function toOrdinal({ year, month, day }) {
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

export function compareDates(a, b) {
  return toOrdinal(a) - toOrdinal(b);
}

export function nextOccurrence(month, day, today) {
  let candidate = occurrenceInYear(month, day, today.year);
  if (compareDates(candidate, today) < 0) {
    candidate = occurrenceInYear(month, day, today.year + 1);
  }
  return candidate;
}

export function daysUntilBirthday(month, day, today) {
  return compareDates(nextOccurrence(month, day, today), today);
}

export function currentAge(birthYear, month, day, today) {
  const year = Number(birthYear);
  if (!year || year > today.year) return null;

  let age = today.year - year;
  const birthday = occurrenceInYear(month, day, today.year);
  if (compareDates(today, birthday) < 0) age -= 1;
  return Math.max(age, 0);
}

export function formatBirthdayDate(month, day, year) {
  const monthData = monthByValue(month);
  if (!monthData) return '';
  const date = `${Number(day)} ${monthData.genitive}`;
  return year ? `${date} ${year}` : date;
}

export function formatMonthShort(month) {
  return monthByValue(month)?.short || '';
}

export function parseIsoDate(value) {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

export function formatOccurrence(value, today) {
  const parsed = typeof value === 'string' ? parseIsoDate(value) : value;
  if (!parsed) return '';
  const monthData = monthByValue(parsed.month);
  if (!monthData) return '';
  const date = `${parsed.day} ${monthData.genitive}`;
  if (today && parsed.year !== today.year) {
    return `${date} ${parsed.year}`;
  }
  return date;
}

function plural(count, one, few, many) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (count === 1) return one;
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) {
    return few;
  }
  return many;
}

export function formatRelativeDays(days) {
  const value = Number(days);
  if (!Number.isFinite(value)) return '';
  if (value === 0) return 'Dziś';
  if (value === 1) return 'Jutro';
  if (value === 7) return 'Za tydzień';
  if (value === 14) return 'Za 2 tygodnie';
  if (value === 21) return 'Za 3 tygodnie';
  if (value === 30) return 'Za miesiąc';
  return `Za ${value} ${plural(value, 'dzień', 'dni', 'dni')}`;
}

export function formatAge(age) {
  if (age === null || age === undefined) return '';
  const value = Number(age);
  if (!Number.isFinite(value)) return '';
  return `${value} ${plural(value, 'rok', 'lata', 'lat')}`;
}

export function todayInTimezone(timeZone, now = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timeZone || 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);
    const values = Object.fromEntries(
      parts
        .filter((part) => part.type !== 'literal')
        .map((part) => [part.type, Number(part.value)])
    );
    return { year: values.year, month: values.month, day: values.day };
  } catch {
    return todayInTimezone('UTC', now);
  }
}
