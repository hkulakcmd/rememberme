import { describe, expect, it } from 'vitest';

import {
  currentAge,
  daysInMonth,
  daysUntilBirthday,
  formatAge,
  formatBirthdayDate,
  formatOccurrence,
  formatRelativeDays,
  isLeapYear,
  isValidBirthDate,
  nextOccurrence,
  todayInTimezone,
} from './dates';

const TODAY = { year: 2026, month: 10, day: 25 };

describe('birth date validation', () => {
  it('accepts 29 February and rejects impossible dates', () => {
    expect(isValidBirthDate(2, 29)).toBe(true);
    expect(isValidBirthDate(2, 30)).toBe(false);
    expect(isValidBirthDate(4, 31)).toBe(false);
    expect(isValidBirthDate(13, 1)).toBe(false);
    expect(isValidBirthDate(0, 1)).toBe(false);
  });

  it('knows month lengths and leap years', () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2026)).toBe(false);
    expect(isLeapYear(2000)).toBe(true);
    expect(isLeapYear(1900)).toBe(false);
    expect(daysInMonth(2, 2000)).toBe(29);
    expect(daysInMonth(2, 2026)).toBe(28);
    expect(daysInMonth(4, 2026)).toBe(30);
  });
});

describe('next occurrence and countdown', () => {
  it('keeps today and wraps the year', () => {
    expect(nextOccurrence(10, 25, TODAY)).toEqual({
      year: 2026,
      month: 10,
      day: 25,
    });
    expect(nextOccurrence(10, 24, TODAY)).toEqual({
      year: 2027,
      month: 10,
      day: 24,
    });
    expect(nextOccurrence(4, 12, TODAY)).toEqual({
      year: 2027,
      month: 4,
      day: 12,
    });
    expect(daysUntilBirthday(4, 12, TODAY)).toBe(169);
    expect(daysUntilBirthday(10, 25, TODAY)).toBe(0);
  });

  it('uses 28 February for leap-day birthdays in non-leap years', () => {
    expect(nextOccurrence(2, 29, { year: 2027, month: 2, day: 27 })).toEqual({
      year: 2027,
      month: 2,
      day: 28,
    });
    expect(daysUntilBirthday(2, 29, { year: 2027, month: 2, day: 27 })).toBe(1);
    expect(nextOccurrence(2, 29, { year: 2027, month: 3, day: 1 })).toEqual({
      year: 2028,
      month: 2,
      day: 29,
    });
  });
});

describe('age', () => {
  it('counts age only after the birthday', () => {
    expect(currentAge(1990, 4, 12, TODAY)).toBe(36);
    expect(currentAge(1990, 12, 1, TODAY)).toBe(35);
    expect(currentAge(null, 4, 12, TODAY)).toBeNull();
    expect(currentAge(2030, 4, 12, TODAY)).toBeNull();
  });

  it('handles a 29 February birthday', () => {
    expect(currentAge(1992, 2, 29, { year: 2026, month: 2, day: 28 })).toBe(34);
    expect(currentAge(1992, 2, 29, { year: 2026, month: 2, day: 27 })).toBe(33);
  });
});

describe('formatting', () => {
  it('formats dates with and without a year', () => {
    expect(formatBirthdayDate(4, 12, 1990)).toBe('12 kwietnia 1990');
    expect(formatBirthdayDate(4, 12)).toBe('12 kwietnia');
    expect(formatOccurrence('2027-04-12', TODAY)).toBe('12 kwietnia 2027');
    expect(formatOccurrence('2026-12-01', TODAY)).toBe('1 grudnia');
  });

  it('formats relative labels in Polish', () => {
    expect(formatRelativeDays(0)).toBe('Dziś');
    expect(formatRelativeDays(1)).toBe('Jutro');
    expect(formatRelativeDays(3)).toBe('Za 3 dni');
    expect(formatRelativeDays(7)).toBe('Za tydzień');
    expect(formatRelativeDays(14)).toBe('Za 2 tygodnie');
    expect(formatRelativeDays(30)).toBe('Za miesiąc');
    expect(formatRelativeDays(169)).toBe('Za 169 dni');
  });

  it('formats age with Polish plurals', () => {
    expect(formatAge(1)).toBe('1 rok');
    expect(formatAge(3)).toBe('3 lata');
    expect(formatAge(5)).toBe('5 lat');
    expect(formatAge(12)).toBe('12 lat');
    expect(formatAge(22)).toBe('22 lata');
    expect(formatAge(null)).toBe('');
  });
});

describe('timezone-aware today', () => {
  it('uses the user timezone, not UTC', () => {
    const moment = new Date('2026-10-25T23:30:00Z');
    expect(todayInTimezone('Europe/Warsaw', moment)).toEqual({
      year: 2026,
      month: 10,
      day: 26,
    });
    expect(todayInTimezone('UTC', moment)).toEqual({
      year: 2026,
      month: 10,
      day: 25,
    });
  });
});
