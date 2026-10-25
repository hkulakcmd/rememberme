'use client';

import { useEffect, useState } from 'react';

import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { Toggle } from '@/components/ui/Toggle';
import { ApiError } from '@/lib/api';
import { humanizeApiError } from '@/lib/errors';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from '@/lib/notifications';

const LEAD_TIMES = [
  { value: 0, label: 'W dniu urodzin', description: 'Powiadomienie rano.' },
  { value: 1, label: '1 dzień wcześniej', description: 'Dzień przed urodzinami.' },
  { value: 3, label: '3 dni wcześniej', description: 'Trzy dni przed.' },
  { value: 7, label: '7 dni wcześniej', description: 'Tydzień przed.' },
];

export function NotificationForm() {
  const { user } = useAuth();
  const toast = useToast();
  const [preferences, setPreferences] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setStatus('loading');
    setError('');

    getNotificationPreferences({ signal: controller.signal })
      .then((data) => {
        if (!active) return;
        setPreferences(data);
        setStatus('ready');
      })
      .catch((caught) => {
        if (!active || caught?.name === 'AbortError') return;
        setError(humanizeApiError(caught));
        setStatus('error');
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [revision]);

  function updatePreference(name, value) {
    setPreferences((current) => ({ ...current, [name]: value }));
    setFormError('');
  }

  function toggleLeadTime(value, checked) {
    const current = preferences?.lead_times || [];
    const next = checked
      ? [...current, value]
      : current.filter((item) => item !== value);
    updatePreference('lead_times', [...new Set(next)].sort((a, b) => a - b));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');
    if (preferences.push_enabled && preferences.lead_times.length === 0) {
      setFormError(
        'Wybierz co najmniej jeden próg powiadomień albo wyłącz powiadomienia.'
      );
      return;
    }

    setSaving(true);
    try {
      const updated = await updateNotificationPreferences({
        push_enabled: preferences.push_enabled,
        send_at_time: preferences.send_at_time,
        lead_times: preferences.lead_times,
      });
      setPreferences(updated);
      toast.success('Zapisano preferencje powiadomień.');
    } catch (caught) {
      setFormError(humanizeApiError(caught));
    } finally {
      setSaving(false);
    }
  }

  if (status === 'loading') {
    return (
      <Card>
        <Skeleton className="h-6 w-44" />
        <div className="mt-5 space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </Card>
    );
  }

  if (status === 'error') {
    return (
      <Card>
        <h2 className="font-display text-lg font-semibold text-ink">
          Powiadomienia
        </h2>
        <Alert tone="error" className="mt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>{error}</span>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setRevision((value) => value + 1)}
            >
              Spróbuj ponownie
            </Button>
          </div>
        </Alert>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">
            Powiadomienia
          </h2>
          <p className="mt-1 text-sm text-muted">
            Kiedy i o której mamy Ci przypominać.
          </p>
        </div>
      </div>

      {formError ? (
        <Alert tone="error" className="mt-4">
          {formError}
        </Alert>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <Toggle
          checked={Boolean(preferences.push_enabled)}
          onChange={(value) => updatePreference('push_enabled', value)}
          label="Włącz przypomnienia"
          description="Powiadomienia push wymagają zgody na tym urządzeniu."
        />

        <Input
          label="Godzina wysyłki"
          name="send_at_time"
          type="time"
          value={preferences.send_at_time || '09:00'}
          onChange={(event) =>
            updatePreference('send_at_time', event.target.value)
          }
          hint={`Czas w Twojej strefie: ${user?.timezone || 'UTC'}.`}
          required
        />

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-ink">
            Progi przypomnień
          </legend>
          <div className="grid gap-2">
            {LEAD_TIMES.map((lead) => (
              <Checkbox
                key={lead.value}
                checked={preferences.lead_times.includes(lead.value)}
                onChange={(checked) => toggleLeadTime(lead.value, checked)}
                label={lead.label}
                description={lead.description}
              />
            ))}
          </div>
        </fieldset>

        <div className="flex justify-end">
          <Button type="submit" loading={saving}>
            Zapisz powiadomienia
          </Button>
        </div>
      </form>
    </Card>
  );
}
