import { describe, expect, it } from 'vitest';

import {
  birthdayToForm,
  emptyBirthdayForm,
  findDuplicateBirthday,
  formToPayload,
  previewBirthdayForm,
  validateBirthdayForm,
} from './birthdayForm';

const TODAY = { year: 2026, month: 10, day: 25 };

const VALID_FORM = {
  first_name: 'Anna',
  last_name: 'Kowalska',
  birth_day: '12',
  birth_month: '4',
  birth_year: '1990',
  relationship: 'siostra',
  notes: 'Lubi tulipany',
};

describe('birthday form validation', () => {
  it('requires first name, day and month', () => {
    const errors = validateBirthdayForm(emptyBirthdayForm(), { today: TODAY });
    expect(errors.first_name).toBeDefined();
    expect(errors.birth_day).toBeDefined();
    expect(errors.birth_month).toBeDefined();
  });

  it('accepts a complete form', () => {
    expect(validateBirthdayForm(VALID_FORM, { today: TODAY })).toEqual({});
  });

  it('accepts an unknown year and 29 February', () => {
    const form = {
      ...VALID_FORM,
      birth_year: '',
      birth_day: '29',
      birth_month: '2',
    };
    expect(validateBirthdayForm(form, { today: TODAY })).toEqual({});
    expect(formToPayload(form).birth_year).toBeNull();
  });

  it('rejects impossible dates', () => {
    expect(
      validateBirthdayForm(
        { ...VALID_FORM, birth_day: '31', birth_month: '4' },
        { today: TODAY }
      ).birth_day
    ).toBeDefined();
    expect(
      validateBirthdayForm(
        { ...VALID_FORM, birth_day: '30', birth_month: '2' },
        { today: TODAY }
      ).birth_day
    ).toBeDefined();
  });

  it('rejects a future or out-of-range year', () => {
    expect(
      validateBirthdayForm(
        { ...VALID_FORM, birth_year: '2030' },
        { today: TODAY }
      ).birth_year
    ).toBeDefined();
    expect(
      validateBirthdayForm(
        { ...VALID_FORM, birth_year: '1700' },
        { today: TODAY }
      ).birth_year
    ).toBeDefined();
  });

  it('enforces field limits', () => {
    const errors = validateBirthdayForm(
      {
        ...VALID_FORM,
        first_name: 'A'.repeat(101),
        last_name: 'B'.repeat(101),
        relationship: 'C'.repeat(51),
        notes: 'D'.repeat(2001),
      },
      { today: TODAY }
    );
    expect(errors.first_name).toBeDefined();
    expect(errors.last_name).toBeDefined();
    expect(errors.relationship).toBeDefined();
    expect(errors.notes).toBeDefined();
  });
});

describe('payload and form mapping', () => {
  it('trims text and converts numbers', () => {
    const payload = formToPayload({
      ...VALID_FORM,
      first_name: '  Anna  ',
      last_name: '  Kowalska ',
      relationship: '  siostra ',
      notes: '  notatka ',
    });
    expect(payload).toEqual({
      first_name: 'Anna',
      last_name: 'Kowalska',
      birth_month: 4,
      birth_day: 12,
      birth_year: 1990,
      relationship: 'siostra',
      notes: 'notatka',
    });
  });

  it('maps a birthday resource to form strings', () => {
    expect(
      birthdayToForm({
        first_name: 'Anna',
        last_name: 'Kowalska',
        birth_day: 12,
        birth_month: 4,
        birth_year: 1990,
        relationship: 'siostra',
        notes: 'Lubi tulipany',
      })
    ).toEqual(VALID_FORM);
  });
});

describe('date preview', () => {
  it('shows the next occurrence, countdown and turning age', () => {
    const preview = previewBirthdayForm(VALID_FORM, TODAY);
    expect(preview.dateLabel).toBe('12 kwietnia 2027');
    expect(preview.days).toBe(169);
    expect(preview.turningAge).toBe(37);
    expect(preview.turningAgeLabel).toBe('37 lat');
    expect(preview.isLeapDay).toBe(false);
  });

  it('flags 29 February', () => {
    const preview = previewBirthdayForm(
      { ...VALID_FORM, birth_day: '29', birth_month: '2' },
      TODAY
    );
    expect(preview.isLeapDay).toBe(true);
    expect(preview.dateLabel).toBe('28 lutego 2027');
  });
});

describe('duplicate detection', () => {
  const results = [
    {
      id: 'one',
      full_name: 'Anna Kowalska',
      birth_month: 4,
      birth_day: 12,
    },
    {
      id: 'two',
      full_name: 'Jan Nowak',
      birth_month: 5,
      birth_day: 1,
    },
  ];

  it('matches the same full name and month/day, ignoring year', () => {
    expect(findDuplicateBirthday(VALID_FORM, results, null)?.id).toBe('one');
  });

  it('ignores the record currently being edited', () => {
    expect(findDuplicateBirthday(VALID_FORM, results, 'one')).toBeNull();
  });

  it('does not match a different date', () => {
    expect(
      findDuplicateBirthday({ ...VALID_FORM, birth_day: '13' }, results, null)
    ).toBeNull();
  });

  it('normalizes case, spacing and diacritics', () => {
    const duplicate = findDuplicateBirthday(
      {
        ...VALID_FORM,
        first_name: '  ANNA ',
        last_name: 'KOWALSKA ',
      },
      results,
      null
    );
    expect(duplicate?.id).toBe('one');
  });
});
