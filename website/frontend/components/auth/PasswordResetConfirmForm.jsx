'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { ApiError, confirmPasswordReset } from '@/lib/api';
import { humanizeApiError, firstFieldMessage } from '@/lib/errors';
import { hasErrors, validatePasswordResetConfirm } from '@/lib/validation';

export function PasswordResetConfirmForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [values, setValues] = useState({ password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function update(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');

    const clientErrors = validatePasswordResetConfirm(values);
    if (hasErrors(clientErrors)) {
      setErrors(clientErrors);
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      await confirmPasswordReset({
        token,
        new_password: values.password,
      });
      setDone(true);
    } catch (caught) {
      if (caught instanceof ApiError) {
        setErrors(caught.fields || {});
        setFormError(
          firstFieldMessage(caught.fields, 'non_field_errors') ||
            humanizeApiError(caught)
        );
      } else {
        setFormError('Coś poszło nie tak. Spróbuj ponownie.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div>
        <Alert tone="error">
          Link nie zawiera tokenu. Otwórz link z wiadomości e-mail albo poproś o
          nowy.
        </Alert>
        <Link
          href="/password-reset"
          className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-brand-600 px-5 py-2.5 text-base font-semibold text-white shadow-soft transition hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-300 sm:text-[15px]"
        >
          Poproś o nowy link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div>
        <Alert tone="success">
          Hasło zostało zmienione. Wszystkie wcześniejsze sesje zostały
          wylogowane.
        </Alert>
        <Link
          href="/login"
          className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-brand-600 px-5 py-2.5 text-base font-semibold text-white shadow-soft transition hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-300 sm:text-[15px]"
        >
          Zaloguj się nowym hasłem
        </Link>
      </div>
    );
  }

  return (
    <div>
      {formError ? (
        <Alert tone="error" className="mb-5">
          {formError}
        </Alert>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <PasswordInput
          label="Nowe hasło"
          name="password"
          autoComplete="new-password"
          placeholder="Minimum 8 znaków"
          value={values.password}
          onChange={(event) => update('password', event.target.value)}
          error={firstFieldMessage(errors, 'new_password')}
          hint="Minimum 8 znaków. Unikaj prostych, popularnych haseł."
          required
        />

        <PasswordInput
          label="Powtórz nowe hasło"
          name="confirmPassword"
          autoComplete="new-password"
          placeholder="Wpisz hasło jeszcze raz"
          value={values.confirmPassword}
          onChange={(event) => update('confirmPassword', event.target.value)}
          error={firstFieldMessage(errors, 'confirmPassword')}
          required
        />

        <Button type="submit" size="lg" fullWidth loading={submitting}>
          Ustaw nowe hasło
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        <Link
          href="/login"
          className="font-semibold text-brand-700 underline-offset-4 hover:underline"
        >
          Wróć do logowania
        </Link>
      </p>
    </div>
  );
}
