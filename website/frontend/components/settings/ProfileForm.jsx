'use client';

import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { ApiError } from '@/lib/api';
import { AUTH_METHOD_LABELS, getBrowserTimezone } from '@/lib/auth';
import { firstFieldMessage, humanizeApiError } from '@/lib/errors';
import { updateProfile } from '@/lib/profile';
import { listTimezones } from '@/lib/timezones';

import { TimezoneField } from './TimezoneField';

function valuesFrom(user) {
  return {
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    timezone: user?.timezone || 'UTC',
  };
}

const METHOD_TONES = {
  password: 'brand',
  google: 'lavender',
  facebook: 'neutral',
};

export function ProfileForm() {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState(() => valuesFrom(user));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [detectedTimezone, setDetectedTimezone] = useState('');
  const [zones, setZones] = useState(() => [
    'UTC',
    user?.timezone || 'Europe/Warsaw',
  ]);

  const methods = useMemo(
    () => (user?.auth_methods?.length ? user.auth_methods : ['password']),
    [user?.auth_methods]
  );

  useEffect(() => {
    setForm(valuesFrom(user));
  }, [user]);

  useEffect(() => {
    setDetectedTimezone(getBrowserTimezone());
    setZones(listTimezones());
  }, []);

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
    const nextErrors = {};
    if (!form.first_name.trim()) {
      nextErrors.first_name = ['Podaj imię.'];
    }
    if (!form.timezone) {
      nextErrors.timezone = ['Wybierz strefę czasową.'];
    }
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    try {
      const updated = await updateProfile({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        timezone: form.timezone,
      });
      updateUser(updated);
      setForm(valuesFrom(updated));
      toast.success('Zapisano profil.');
    } catch (caught) {
      if (caught instanceof ApiError) {
        setErrors(caught.fields || {});
        const general = firstFieldMessage(caught.fields, 'non_field_errors');
        setFormError(
          general ||
            (caught.code === 'validation_error' ? '' : humanizeApiError(caught))
        );
      } else {
        setFormError('Nie udało się zapisać profilu. Spróbuj ponownie.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) return null;

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">Profil</h2>
          <p className="mt-1 text-sm text-muted">
            Dane widoczne w aplikacji i strefa czasowa przypomnień.
          </p>
        </div>
        <Badge tone="brand">Konto</Badge>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-field border border-line bg-canvas/50 p-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Adres e-mail
          </p>
          <p className="truncate text-sm font-medium text-ink">{user.email}</p>
        </div>
        <span className="text-xs text-muted">Zmiana adresu poza v1</span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">
          Metody logowania
        </span>
        {methods.map((method) => (
          <Badge key={method} tone={METHOD_TONES[method] || 'neutral'}>
            {AUTH_METHOD_LABELS[method] || method}
          </Badge>
        ))}
      </div>

      {formError ? (
        <Alert tone="error" className="mt-4">
          {formError}
        </Alert>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Imię"
            name="first_name"
            autoComplete="given-name"
            value={form.first_name}
            onChange={(event) => update('first_name', event.target.value)}
            error={firstFieldMessage(errors, 'first_name')}
            required
          />
          <Input
            label="Nazwisko"
            name="last_name"
            autoComplete="family-name"
            value={form.last_name}
            onChange={(event) => update('last_name', event.target.value)}
            error={firstFieldMessage(errors, 'last_name')}
          />
        </div>

        <TimezoneField
          value={form.timezone}
          onChange={(value) => update('timezone', value)}
          zones={zones}
          detected={detectedTimezone}
          error={firstFieldMessage(errors, 'timezone')}
        />

        <div className="flex justify-end">
          <Button type="submit" loading={submitting}>
            Zapisz profil
          </Button>
        </div>
      </form>
    </Card>
  );
}
