'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { ApiError } from '@/lib/api';
import { firstFieldMessage, humanizeApiError } from '@/lib/errors';
import { deleteAccount } from '@/lib/profile';
import { disablePushNotifications } from '@/lib/push';

export function DeleteAccountDialog({ open, onClose }) {
  const router = useRouter();
  const { user, clearSession } = useAuth();
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const needsPassword = user?.auth_methods?.includes('password') ?? true;

  useEffect(() => {
    if (open) {
      setPassword('');
      setError('');
      setFieldError('');
      setSubmitting(false);
    }
  }, [open]);

  async function handleDelete() {
    if (needsPassword && !password) {
      setFieldError('Podaj hasło, aby potwierdzić.');
      return;
    }

    setSubmitting(true);
    setError('');
    setFieldError('');
    try {
      await deleteAccount(needsPassword ? { password } : {});
      await disablePushNotifications({ removeFromServer: false }).catch(
        () => {}
      );
      clearSession();
      toast.success('Konto zostało usunięte.');
      router.replace('/login');
    } catch (caught) {
      if (caught instanceof ApiError) {
        setFieldError(firstFieldMessage(caught.fields, 'password') || '');
        setError(humanizeApiError(caught));
      } else {
        setError('Nie udało się usunąć konta. Spróbuj ponownie.');
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
      title="Usunąć konto?"
      description="Ta operacja jest nieodwracalna."
      size="sm"
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
            type="button"
            variant="danger"
            onClick={handleDelete}
            loading={submitting}
          >
            Usuń konto
          </Button>
        </div>
      }
    >
      {error ? (
        <Alert tone="error" className="mb-4">
          {error}
        </Alert>
      ) : null}

      <p className="text-sm leading-relaxed text-muted">
        Usuniemy Twoje konto, wszystkie zapisane urodziny, preferencje
        powiadomień i subskrypcje push. Nie będzie można tego cofnąć.
      </p>

      {needsPassword ? (
        <PasswordInput
          label="Hasło"
          name="delete-password"
          autoComplete="current-password"
          className="mt-4"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={fieldError}
          autoFocus
          required
        />
      ) : (
        <p className="mt-4 rounded-field bg-canvas p-3 text-sm text-muted">
          To konto nie ma hasła. Potwierdź usunięcie przyciskiem poniżej.
        </p>
      )}
    </Dialog>
  );
}
