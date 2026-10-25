'use client';

import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import {
  formatRelativeDays,
  MONTHS,
} from '@/lib/dates';
import { previewBirthdayForm } from '@/lib/birthdayForm';

export function BirthdayDateField({
  form,
  errors,
  onChange,
  today,
}) {
  const preview = previewBirthdayForm(form, today);

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-ink">
        Data urodzin
        <span className="ml-1 text-brand-500" aria-hidden="true">
          *
        </span>
      </legend>

      <div className="grid grid-cols-[5.5rem_1fr] gap-3 sm:grid-cols-[5.5rem_1fr_7rem]">
        <Input
          label="Dzień"
          name="birth_day"
          inputMode="numeric"
          autoComplete="bday-day"
          placeholder="12"
          maxLength={2}
          value={form.birth_day}
          onChange={(event) =>
            onChange('birth_day', event.target.value.replace(/\D/g, '').slice(0, 2))
          }
          error={errors.birth_day?.[0]}
          required
        />

        <Select
          label="Miesiąc"
          name="birth_month"
          autoComplete="bday-month"
          value={form.birth_month}
          onChange={(event) => onChange('birth_month', event.target.value)}
          error={errors.birth_month?.[0]}
          required
        >
          <option value="">Wybierz</option>
          {MONTHS.map((month) => (
            <option key={month.value} value={month.value}>
              {month.nominative}
            </option>
          ))}
        </Select>

        <Input
          label="Rok"
          name="birth_year"
          inputMode="numeric"
          autoComplete="bday-year"
          placeholder="opcjonalnie"
          maxLength={4}
          containerClassName="col-span-2 sm:col-span-1"
          value={form.birth_year}
          onChange={(event) =>
            onChange('birth_year', event.target.value.replace(/\D/g, '').slice(0, 4))
          }
          error={errors.birth_year?.[0]}
          hint="Możesz zostawić puste."
        />
      </div>

      {preview ? (
        <p className="mt-2 text-xs font-medium text-brand-700" role="status">
          Najbliższe: {preview.dateLabel} · {formatRelativeDays(preview.days)}
          {preview.turningAgeLabel
            ? ` · w ${preview.occurrence.year} kończy ${preview.turningAgeLabel}`
            : ''}
        </p>
      ) : null}

      {form.birth_month === '2' && form.birth_day === '29' ? (
        <p className="mt-2 text-xs text-muted">
          W latach nieprzestępnych przypomnimy o urodzinach 28 lutego.
        </p>
      ) : null}
    </fieldset>
  );
}
