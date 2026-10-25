'use client';

import { useCallback, useEffect, useState } from 'react';

import { useToast } from '@/components/providers/ToastProvider';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  checkPushState,
  disablePushNotifications,
  enablePushNotifications,
  isPushSupported,
  PushError,
  sendTestPush,
  subscribePush,
} from '@/lib/push';

function errorMessage(error) {
  if (error instanceof PushError) {
    if (error.code === 'permission_denied') {
      return 'Zgoda na powiadomienia jest zablokowana. Odblokuj ją w ustawieniach strony w przeglądarce.';
    }
    if (error.code === 'ios_install_required') {
      return 'Na iPhone najpierw zainstaluj aplikację (sekcja „Aplikacja na telefonie”).';
    }
    if (error.code === 'not_configured') {
      return 'Powiadomienia push nie są jeszcze skonfigurowane na serwerze.';
    }
    if (error.code === 'unsupported') {
      return 'Ta przeglądarka nie obsługuje powiadomień push.';
    }
    return error.message;
  }
  return 'Nie udało się zmienić ustawień powiadomień. Spróbuj ponownie.';
}

export function PushSettings() {
  const toast = useToast();
  const isDev = process.env.NODE_ENV === 'development';
  const [status, setStatus] = useState(isDev ? 'dev' : 'loading');
  const [pushState, setPushState] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const refresh = useCallback(async () => {
    if (isDev) {
      setStatus('dev');
      return;
    }
    if (!isPushSupported()) {
      setStatus('unsupported');
      return;
    }

    try {
      const state = await checkPushState();
      setPushState(state);
      setStatus('ready');
      if (state.subscription && state.permission === 'granted') {
        // The same browser may have been used with another account.
        subscribePush(state.subscription).catch(() => {});
      }
    } catch {
      setStatus('error');
    }
  }, [isDev]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleEnable() {
    setBusy('enable');
    setError('');
    try {
      await enablePushNotifications();
      toast.success('Powiadomienia push są włączone.');
      await refresh();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy('');
    }
  }

  async function handleDisable() {
    setBusy('disable');
    setError('');
    try {
      const removed = await disablePushNotifications();
      toast.success(
        removed
          ? 'Powiadomienia wyłączone na tym urządzeniu.'
          : 'To urządzenie nie miało aktywnej subskrypcji.'
      );
      await refresh();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy('');
    }
  }

  async function handleTest() {
    setBusy('test');
    setError('');
    try {
      const result = await sendTestPush();
      const queued = result?.queued ?? 0;
      if (queued > 0) {
        toast.success('Test push zakolejkowany. Powiadomienie powinno pojawić się za chwilę.');
      } else {
        toast.info('Brak aktywnej subskrypcji na tym koncie.');
      }
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy('');
    }
  }

  if (status === 'loading') {
    return (
      <Card>
        <Skeleton className="h-6 w-48" />
        <div className="mt-5 space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </Card>
    );
  }

  const subscribed = Boolean(pushState?.subscription);
  const permissionDenied = pushState?.permission === 'denied';
  const iosBlocked = pushState?.iosBlocked;

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">
            Powiadomienia push
          </h2>
          <p className="mt-1 text-sm text-muted">
            Przypomnienia na tym urządzeniu, nawet gdy aplikacja jest zamknięta.
          </p>
        </div>
        {status === 'ready' ? (
          <Badge tone={subscribed ? 'mint' : permissionDenied ? 'brand' : 'neutral'}>
            {subscribed
              ? 'Aktywne'
              : permissionDenied
                ? 'Zablokowane'
                : 'Nieaktywne'}
          </Badge>
        ) : null}
      </div>

      {error ? (
        <Alert tone="error" className="mt-4">
          {error}
        </Alert>
      ) : null}

      {status === 'dev' ? (
        <p className="mt-4 rounded-field bg-canvas p-4 text-sm leading-relaxed text-muted">
          Powiadomienia push są dostępne w wersji produkcyjnej aplikacji. W
          trybie developerskim service worker jest wyłączony, aby nie cacheować
          plików roboczych.
        </p>
      ) : null}

      {status === 'unsupported' ? (
        <p className="mt-4 rounded-field bg-canvas p-4 text-sm leading-relaxed text-muted">
          Ta przeglądarka nie obsługuje powiadomień push. Spróbuj Chrome, Edge
          lub Safari 16.4+ (na iPhone po zainstalowaniu aplikacji).
        </p>
      ) : null}

      {status === 'error' ? (
        <div className="mt-4">
          <Alert tone="error">
            Nie udało się odczytać stanu powiadomień.
          </Alert>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={refresh}
          >
            Spróbuj ponownie
          </Button>
        </div>
      ) : null}

      {status === 'ready' ? (
        <div className="mt-4 space-y-4">
          {iosBlocked ? (
            <Alert tone="info">
              Na iPhone powiadomienia push działają po dodaniu aplikacji do
              ekranu początkowego. Skorzystaj z sekcji „Aplikacja na telefonie”
              powyżej.
            </Alert>
          ) : null}

          {permissionDenied ? (
            <Alert tone="info">
              Powiadomienia są zablokowane w ustawieniach tej strony. Odblokuj
              je w menu przeglądarki (ikona zamka przy adresie).
            </Alert>
          ) : null}

          <div className="rounded-field border border-line bg-canvas/50 p-4">
            <p className="text-sm font-semibold text-ink">
              {subscribed
                ? 'To urządzenie jest zapisane'
                : 'To urządzenie nie jest zapisane'}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              {subscribed
                ? 'Otrzymasz powiadomienia zgodnie z godziną i progami ustawionymi obok.'
                : 'Włącz powiadomienia, aby otrzymywać przypomnienia o urodzinach.'}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {!subscribed && !iosBlocked && !permissionDenied ? (
              <Button
                type="button"
                onClick={handleEnable}
                loading={busy === 'enable'}
              >
                Włącz powiadomienia push
              </Button>
            ) : null}

            {subscribed ? (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleTest}
                  loading={busy === 'test'}
                >
                  Wyślij test
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleDisable}
                  loading={busy === 'disable'}
                >
                  Wyłącz na tym urządzeniu
                </Button>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </Card>
  );
}
