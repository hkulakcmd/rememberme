'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Dialog } from '@/components/ui/Dialog';
import { AUTH_METHOD_LABELS } from '@/lib/auth';
import { humanizeApiError } from '@/lib/errors';
import { logoutAllDevices } from '@/lib/profile';
import { removePushSubscriptionBeforeLogout } from '@/lib/push';

import { DeleteAccountDialog } from './DeleteAccountDialog';

const METHOD_TONES = {
  password: 'brand',
  google: 'lavender',
  facebook: 'neutral',
};

export function SecuritySection() {
  const router = useRouter();
  const { user, logout, clearSession } = useAuth();
  const toast = useToast();
  const [logoutAllOpen, setLogoutAllOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [loggingOutAll, setLoggingOutAll] = useState(false);
  const [error, setError] = useState('');

  const methods = user?.auth_methods?.length ? user.auth_methods : ['password'];

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      router.replace('/login');
    } finally {
      setLoggingOut(false);
    }
  }

  async function handleLogoutAll() {
    setLoggingOutAll(true);
    setError('');
    try {
      await removePushSubscriptionBeforeLogout();
      await logoutAllDevices();
      clearSession();
      toast.success('Wylogowano wszystkie urządzenia.');
      router.replace('/login');
    } catch (caught) {
      setError(humanizeApiError(caught));
    } finally {
      setLoggingOutAll(false);
    }
  }

  return (
    <>
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">
              Bezpieczeństwo
            </h2>
            <p className="mt-1 text-sm text-muted">
              Sesje, metody logowania i usunięcie konta.
            </p>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Metody logowania
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {methods.map((method) => (
              <Badge key={method} tone={METHOD_TONES[method] || 'neutral'}>
                {AUTH_METHOD_LABELS[method] || method}
              </Badge>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">
            Łączenie kolejnych metod logowania pojawi się w przyszłej wersji.
          </p>
        </div>

        {error ? (
          <p role="alert" className="mt-4 text-sm font-medium text-red-600">
            {error}
          </p>
        ) : null}

        <div className="mt-5 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-field border border-line p-3">
            <div>
              <p className="text-sm font-semibold text-ink">Ta sesja</p>
              <p className="text-xs text-muted">
                Wyloguj bieżące urządzenie.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleLogout}
              loading={loggingOut}
            >
              Wyloguj się
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-field border border-line p-3">
            <div>
              <p className="text-sm font-semibold text-ink">
                Wszystkie urządzenia
              </p>
              <p className="text-xs text-muted">
                Unieważnij wszystkie aktywne sesje.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setLogoutAllOpen(true)}
            >
              Wyloguj wszędzie
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-field border border-red-100 bg-red-50/60 p-3">
            <div>
              <p className="text-sm font-semibold text-ink">Usuń konto</p>
              <p className="text-xs text-muted">
                Trwale usuwa konto i wszystkie dane.
              </p>
            </div>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => setDeleteOpen(true)}
            >
              Usuń konto
            </Button>
          </div>
        </div>
      </Card>

      <Dialog
        open={logoutAllOpen}
        onClose={() => setLogoutAllOpen(false)}
        closeDisabled={loggingOutAll}
        title="Wylogować wszystkie urządzenia?"
        description="Będziesz musiał zalogować się ponownie na każdym urządzeniu."
        size="sm"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setLogoutAllOpen(false)}
              disabled={loggingOutAll}
            >
              Anuluj
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleLogoutAll}
              loading={loggingOutAll}
            >
              Wyloguj wszędzie
            </Button>
          </div>
        }
      >
        <p className="text-sm leading-relaxed text-muted">
          Zostaną unieważnione wszystkie odświeżające tokeny. Bieżąca sesja
          również zostanie zakończona.
        </p>
      </Dialog>

      <DeleteAccountDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
      />
    </>
  );
}
