'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { SocialButtons } from '@/components/auth/SocialButtons';
import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { ApiError } from '@/lib/api';
import { getBrowserTimezone } from '@/lib/auth';
import { humanizeApiError, firstFieldMessage } from '@/lib/errors';
import { hasErrors, validateRegister } from '@/lib/validation';

const INITIAL_VALUES = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
};

export function RegisterForm() {
  const router = useRouter();
  const { register } = useAuth();
  const toast = useToast();

  const [values, setValues] = useState(INITIAL_VALUES);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function update(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');

    const clientErrors = validateRegister(values);
    if (hasErrors(clientErrors)) {
      setErrors(clientErrors);
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      await register({
        email: values.email.trim().toLowerCase(),
        password: values.password,
        first_name: values.firstName.trim(),
        last_name: values.lastName.trim(),
        timezone: getBrowserTimezone(),
      });
      toast.success('Konto gotowe. Miło Cię poznać!');
      router.replace('/dashboard');
    } catch (caught) {
      if (caught instanceof ApiError) {
        const fields = caught.fields || {};
        setErrors(fields);
        const general = firstFieldMessage(fields, 'non_field_errors');
        setFormError(
          general ||
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
      {formError ? (
        <Alert tone="error" className="mb-5">
          {formError}
        </Alert>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Imię"
            name="firstName"
            autoComplete="given-name"
            placeholder="Anna"
            value={values.firstName}
            onChange={(event) => update('firstName', event.target.value)}
            error={firstFieldMessage(errors, 'first_name')}
            required
          />
          <Input
            label="Nazwisko"
            name="lastName"
            autoComplete="family-name"
            placeholder="Kowalska"
            value={values.lastName}
            onChange={(event) => update('lastName', event.target.value)}
            error={firstFieldMessage(errors, 'last_name')}
          />
        </div>

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

        <PasswordInput
          label="Hasło"
          name="password"
          autoComplete="new-password"
          placeholder="Minimum 8 znaków"
          value={values.password}
          onChange={(event) => update('password', event.target.value)}
          error={firstFieldMessage(errors, 'password')}
          hint="Minimum 8 znaków. Unikaj prostych, popularnych haseł."
          required
        />

        <PasswordInput
          label="Powtórz hasło"
          name="confirmPassword"
          autoComplete="new-password"
          placeholder="Wpisz hasło jeszcze raz"
          value={values.confirmPassword}
          onChange={(event) => update('confirmPassword', event.target.value)}
          error={firstFieldMessage(errors, 'confirmPassword')}
          required
        />

        <Button type="submit" size="lg" fullWidth loading={submitting}>
          Utwórz konto
        </Button>
      </form>

      <SocialButtons />

      <p className="mt-6 text-center text-sm text-muted">
        Masz już konto?{' '}
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
