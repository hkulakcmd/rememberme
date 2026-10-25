import {
  currentAge,
  daysUntilBirthday,
  formatAge,
  formatOccurrence,
  isValidBirthDate,
  nextOccurrence,
  todayInTimezone,
} from './dates';

export const EMPTY_BIRTHDAY_FORM = {
  first_name: '',
  last_name: '',
  birth_day: '',
  birth_month: '',
  birth_year: '',
  relationship: '',
  notes: '',
};

export function emptyBirthdayForm() {
  return { ...EMPTY_BIRTHDAY_FORM };
}

export function birthdayToForm(birthday) {
  if (!birthday) return emptyBirthdayForm();
  return {
    first_name: birthday.first_name || '',
    last_name: birthday.last_name || '',
    birth_day: String(birthday.birth_day ?? ''),
    birth_month: String(birthday.birth_month ?? ''),
    birth_year: birthday.birth_year ? String(birthday.birth_year) : '',
    relationship: birthday.relationship || '',
    notes: birthday.notes || '',
  };
}

export function formToPayload(form) {
  return {
    first_name: form.first_name.trim(),
    last_name: form.last_name.trim(),
    birth_month: Number(form.birth_month),
    birth_day: Number(form.birth_day),
    birth_year: form.birth_year ? Number(form.birth_year) : null,
    relationship: form.relationship.trim() || null,
    notes: form.notes.trim(),
  };
}

export function validateBirthdayForm(form, { today } = {}) {
  const errors = {};
  const current = today || todayInTimezone('UTC');

  const firstName = form.first_name.trim();
  if (!firstName) {
    errors.first_name = ['Podaj imię.'];
  } else if (firstName.length > 100) {
    errors.first_name = ['Imię może mieć maksymalnie 100 znaków.'];
  }

  if (form.last_name.trim().length > 100) {
    errors.last_name = ['Nazwisko może mieć maksymalnie 100 znaków.'];
  }

  const day = Number(form.birth_day);
  if (!form.birth_day || !Number.isInteger(day) || day < 1 || day > 31) {
    errors.birth_day = ['Podaj dzień od 1 do 31.'];
  }

  const month = Number(form.birth_month);
  if (!form.birth_month || !Number.isInteger(month) || month < 1 || month > 12) {
    errors.birth_month = ['Wybierz miesiąc.'];
  }

  if (!errors.birth_day && !errors.birth_month) {
    if (!isValidBirthDate(month, day)) {
      errors.birth_day = ['Taki dzień nie istnieje w wybranym miesiącu.'];
    }
  }

  if (form.birth_year) {
    const year = Number(form.birth_year);
    if (!Number.isInteger(year) || year < 1800 || year > current.year) {
      errors.birth_year = [
        `Podaj rok od 1800 do ${current.year} albo zostaw pole puste.`,
      ];
    }
  }

  if (form.relationship.trim().length > 50) {
    errors.relationship = ['Relacja może mieć maksymalnie 50 znaków.'];
  }

  if (form.notes.trim().length > 2000) {
    errors.notes = ['Notatki mogą mieć maksymalnie 2000 znaków.'];
  }

  return errors;
}

export function previewBirthdayForm(form, today) {
  const month = Number(form.birth_month);
  const day = Number(form.birth_day);
  if (!isValidBirthDate(month, day) || !today) return null;

  const occurrence = nextOccurrence(month, day, today);
  const days = daysUntilBirthday(month, day, today);
  const birthYear = Number(form.birth_year);
  const turningAge =
    birthYear && birthYear <= occurrence.year
      ? occurrence.year - birthYear
      : null;
  const current = birthYear
    ? currentAge(birthYear, month, day, today)
    : null;

  return {
    occurrence,
    days,
    dateLabel: formatOccurrence(occurrence, today),
    turningAge,
    turningAgeLabel: turningAge !== null ? formatAge(turningAge) : '',
    currentAge: current,
    isLeapDay: month === 2 && day === 29,
  };
}

function normalizeName(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Soft duplicate check: same full name and same month/day (year ignored).
 */
export function findDuplicateBirthday(form, results, editingId) {
  const month = Number(form.birth_month);
  const day = Number(form.birth_day);
  if (!form.first_name.trim() || !isValidBirthDate(month, day)) return null;

  const target = normalizeName(
    `${form.first_name} ${form.last_name}`.trim()
  );

  return (
    results.find(
      (item) =>
        item.id !== editingId &&
        Number(item.birth_month) === month &&
        Number(item.birth_day) === day &&
        normalizeName(item.full_name || item.first_name) === target
    ) || null
  );
}
