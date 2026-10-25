'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { SocialButtons } from '@/components/auth/SocialButtons';
import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { ApiError } from '@/lib/api';
import { sanitizeNextPath } from '@/lib/auth';
import { humanizeApiError, firstFieldMessage } from '@/lib/errors';
import { hasErrors, validateLogin } from '@/lib/validation';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const toast = useToast();

  const nextPath = sanitizeNextPath(searchParams.get('next'));
  const sessionExpired = searchParams.get('reason') === 'session';

  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function update(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');

    const clientErrors = validateLogin(values);
    if (hasErrors(clientErrors)) {
      setErrors(clientErrors);
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      await login({
        email: values.email.trim().toLowerCase(),
        password: values.password,
      });
      toast.success('Zalogowano. Miło Cię widzieć!');
      router.replace(nextPath);
    } catch (caught) {
      if (caught instanceof ApiError) {
        const fields = caught.fields || {};
        setErrors(fields);
        const general = firstFieldMessage(fields, 'non_field_errors');
        const locked =
          caught.status === 403
            ? 'Zbyt wiele nieudanych prób logowania. Konto zostało tymczasowo zablokowane — spróbuj ponownie później.'
            : '';
        setFormError(
          general ||
            locked ||
            (caught.code === 'validation_error' ? '' : humanizeApiError(caught))
        );
      } else {
        setFormError('Coś poszło nie tak. Spróbuj ponownie.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      {sessionExpired ? (
        <Alert tone="info" className="mb-5">
          Sesja wygasła. Zaloguj się ponownie, aby wrócić do swoich urodzin.
        </Alert>
      ) : null}

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
          value={values.email}
          onChange={(event) => update('email', event.target.value)}
          error={firstFieldMessage(errors, 'email')}
          required
        />

        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-2">
            <label
              htmlFor="login-password"
              className="text-sm font-semibold text-ink"
            >
              Hasło <span className="ml-0.5 text-brand-500">*</span>
            </label>
            <Link
              href="/password-reset"
              className="rounded text-xs font-semibold text-brand-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
            >
              Nie pamiętasz hasła?
            </Link>
          </div>
          <PasswordInput
            id="login-password"
            name="password"
            autoComplete="current-password"
            placeholder="Twoje hasło"
            value={values.password}
            onChange={(event) => update('password', event.target.value)}
            error={firstFieldMessage(errors, 'password')}
            required
          />
        </div>

        <Button type="submit" size="lg" fullWidth loading={submitting}>
          Zaloguj się
        </Button>
      </form>

      <SocialButtons nextPath={nextPath} />

      <p className="mt-6 text-center text-sm text-muted">
        Nie masz konta?{' '}
        <Link
          href="/register"
          className="font-semibold text-brand-700 underline-offset-4 hover:underline"
        >
          Załóż je
        </Link>
      </p>
    </div>
  );
}
