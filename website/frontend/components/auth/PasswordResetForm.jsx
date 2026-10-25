'use client';

import { useState } from 'react';
import Link from 'next/link';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ApiError, requestPasswordReset } from '@/lib/api';
import { humanizeApiError, firstFieldMessage } from '@/lib/errors';
import { hasErrors, isValidEmail } from '@/lib/validation';

export function PasswordResetForm() {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');

    if (!email.trim()) {
      setErrors({ email: ['Podaj adres e-mail.'] });
      return;
    }
    if (!isValidEmail(email)) {
      setErrors({ email: ['Podaj poprawny adres e-mail.'] });
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      await requestPasswordReset(email.trim().toLowerCase());
      setSent(true);
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

  if (sent) {
    return (
      <div>
        <Alert tone="success">
          Jeśli konto z tym adresem istnieje, wysłaliśmy wiadomość z linkiem do
          zresetowania hasła. Link jest ważny przez godzinę.
        </Alert>
        <p className="mt-5 text-sm leading-relaxed text-muted">
          Nie widzisz wiadomości? Sprawdź folder spam. Nadawca może potrzebować
          chwili.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full border border-line bg-white px-5 py-2.5 text-base font-semibold text-ink transition hover:border-brand-200 hover:bg-brand-50/70 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200 sm:text-[15px]"
        >
          Wróć do logowania
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
        <Input
          label="Adres e-mail"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="anna@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={firstFieldMessage(errors, 'email')}
          hint="Wyślemy link do ustawienia nowego hasła."
          required
        />

        <Button type="submit" size="lg" fullWidth loading={submitting}>
          Wyślij link
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Pamiętasz hasło?{' '}
        <Link
          href="/login"
          className="font-semibold text-brand-700 underline-offset-4 hover:underline"
        >
          Zaloguj się
        </Link>
      </p>
    </div>
  );
}
