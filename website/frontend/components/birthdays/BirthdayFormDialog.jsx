'use client';

import { useEffect, useState } from 'react';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { ApiError } from '@/lib/api';
import {
  birthdayToForm,
  emptyBirthdayForm,
  findDuplicateBirthday,
  formToPayload,
  validateBirthdayForm,
} from '@/lib/birthdayForm';
import { createBirthday, searchBirthdays, updateBirthday } from '@/lib/birthdays';
import { formatBirthdayDate, isValidBirthDate } from '@/lib/dates';
import { firstFieldMessage, humanizeApiError } from '@/lib/errors';
import { hasErrors } from '@/lib/validation';

import { BirthdayDateField } from './BirthdayDateField';

const RELATIONSHIP_SUGGESTIONS = [
  'Mama',
  'Tata',
  'Siostra',
  'Brat',
  'Partner',
  'Partnerka',
  'Przyjaciel',
  'Przyjaciółka',
];

function hasOptionalValues(form) {
  return Boolean(
    form.last_name || form.birth_year || form.relationship || form.notes
  );
}

export function BirthdayFormDialog({
  open,
  mode = 'create',
  birthday = null,
  today,
  onClose,
  onSaved,
}) {
  const [form, setForm] = useState(emptyBirthdayForm);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [duplicate, setDuplicate] = useState(null);

  useEffect(() => {
    if (!open) return;
    const initial = birthdayToForm(birthday);
    setForm(initial);
    setErrors({});
    setFormError('');
    setSubmitting(false);
    setShowDetails(mode === 'edit' && hasOptionalValues(initial));
    setDuplicate(null);
  }, [open, birthday, mode]);

  useEffect(() => {
    if (!open) return undefined;
    const month = Number(form.birth_month);
    const day = Number(form.birth_day);
    if (
      form.first_name.trim().length < 2 ||
      !isValidBirthDate(month, day)
    ) {
      setDuplicate(null);
      return undefined;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const results = await searchBirthdays(form.first_name.trim(), {
          signal: controller.signal,
        });
        setDuplicate(
          findDuplicateBirthday(
            {
              first_name: form.first_name,
              last_name: form.last_name,
              birth_month: form.birth_month,
              birth_day: form.birth_day,
            },
            results || [],
            birthday?.id
          )
        );
      } catch (error) {
        if (error?.name !== 'AbortError') setDuplicate(null);
      }
    }, 600);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [
    open,
    form.first_name,
    form.last_name,
    form.birth_month,
    form.birth_day,
    birthday?.id,
  ]);

  function update(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');

    const clientErrors = validateBirthdayForm(form, { today });
    if (hasErrors(clientErrors)) {
      setErrors(clientErrors);
      return;
    }

    setSubmitting(true);
    try {
      const payload = formToPayload(form);
      const saved =
        mode === 'edit'
          ? await updateBirthday(birthday.id, payload)
          : await createBirthday(payload);
      onSaved?.(saved, mode);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fields || {});
        const general = firstFieldMessage(error.fields, 'non_field_errors');
        setFormError(
          general ||
            (error.code === 'validation_error' ? '' : humanizeApiError(error))
        );
      } else {
        setFormError('Nie udało się zapisać urodzin. Spróbuj ponownie.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      closeDisabled={submitting}
      title={mode === 'edit' ? 'Edytuj urodziny' : 'Dodaj urodziny'}
      description={
        mode === 'edit'
          ? 'Zmień dane osoby i zapisz zmiany.'
          : 'Imię i data wystarczą. Resztę możesz dodać później.'
      }
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Anuluj
          </Button>
          <Button
            type="submit"
            form="birthday-form"
            loading={submitting}
          >
            {mode === 'edit' ? 'Zapisz zmiany' : 'Zapisz urodziny'}
          </Button>
        </div>
      }
    >
      <form id="birthday-form" onSubmit={handleSubmit} noValidate>
        {formError ? (
          <Alert tone="error" className="mb-4">
            {formError}
          </Alert>
        ) : null}

        <div className="space-y-4">
          <Input
            label="Imię"
            name="first_name"
            autoComplete="given-name"
            placeholder="Anna"
            autoFocus
            value={form.first_name}
            onChange={(event) => update('first_name', event.target.value)}
            error={firstFieldMessage(errors, 'first_name')}
            required
          />

          <BirthdayDateField
            form={form}
            errors={errors}
            onChange={update}
            today={today}
          />

          {duplicate ? (
            <Alert tone="info">
              Masz już zapisaną osobę <strong>{duplicate.full_name}</strong> z
              datą {formatBirthdayDate(duplicate.birth_month, duplicate.birth_day)}
              . Możesz zapisać mimo to.
            </Alert>
          ) : null}

          <button
            type="button"
            onClick={() => setShowDetails((current) => !current)}
            aria-expanded={showDetails}
            className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200"
          >
            <svg
              viewBox="0 0 24 24"
              className={`h-4 w-4 transition-transform ${showDetails ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
            {showDetails ? 'Mniej szczegółów' : 'Więcej szczegółów'}
          </button>

          {showDetails ? (
            <div className="space-y-4 rounded-card border border-line bg-canvas/50 p-4">
              <Input
                label="Nazwisko"
                name="last_name"
                autoComplete="family-name"
                placeholder="Kowalska"
                value={form.last_name}
                onChange={(event) => update('last_name', event.target.value)}
                error={firstFieldMessage(errors, 'last_name')}
              />

              <div>
                <label
                  htmlFor="birthday-relationship"
                  className="mb-1.5 block text-sm font-semibold text-ink"
                >
                  Relacja
                </label>
                <Input
                  id="birthday-relationship"
                  name="relationship"
                  placeholder="np. siostra"
                  maxLength={50}
                  value={form.relationship}
                  onChange={(event) => update('relationship', event.target.value)}
                  error={firstFieldMessage(errors, 'relationship')}
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  {RELATIONSHIP_SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => update('relationship', suggestion)}
                      aria-pressed={form.relationship === suggestion}
                      className={`min-h-11 rounded-full border px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 ${
                        form.relationship === suggestion
                          ? 'border-brand-300 bg-brand-50 text-brand-700'
                          : 'border-line bg-white text-muted hover:border-brand-200 hover:text-ink'
                      }`}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>

              <Textarea
                label="Notatki"
                name="notes"
                placeholder="Preferencje, pomysły na prezent, ważne szczegóły…"
                maxLength={2000}
                value={form.notes}
                onChange={(event) => update('notes', event.target.value)}
                error={firstFieldMessage(errors, 'notes')}
              />
            </div>
          ) : null}
        </div>
      </form>
    </Dialog>
  );
}
