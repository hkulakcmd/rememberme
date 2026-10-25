'use client';

import { useEffect, useState } from 'react';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { ApiError } from '@/lib/api';
import { deleteBirthday } from '@/lib/birthdays';
import { formatBirthdayDate } from '@/lib/dates';
import { humanizeApiError } from '@/lib/errors';

export function DeleteBirthdayDialog({ open, birthday, onClose, onDeleted }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setSubmitting(false);
      setError('');
    }
  }, [open, birthday]);

  async function handleDelete() {
    if (!birthday) return;
    setSubmitting(true);
    setError('');
    try {
      await deleteBirthday(birthday.id);
      onDeleted?.(birthday);
    } catch (caught) {
      setError(humanizeApiError(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      closeDisabled={submitting}
      title="Usunąć urodziny?"
      description="Tej operacji nie można cofnąć."
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
            Usuń
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
        Usuniesz wpis{' '}
        <strong className="text-ink">
          {birthday?.first_name} {birthday?.last_name}
        </strong>{' '}
        z datą{' '}
        {birthday
          ? formatBirthdayDate(
              birthday.birth_month,
              birthday.birth_day,
              birthday.birth_year
            )
          : ''}
        . Powiązane przypomnienia również zostaną usunięte.
      </p>
    </Dialog>
  );
}
