'use client';

import { useEffect, useId, useRef } from 'react';

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeDisabled = false,
}) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();
  const previousFocus = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;

    if (open) {
      previousFocus.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      if (!dialog.open) dialog.showModal();
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.overflow = previousOverflow;
        if (dialog.open) dialog.close();
        previousFocus.current?.focus?.();
      };
    }

    if (dialog.open) dialog.close();
    return undefined;
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;

    function handleCancel(event) {
      event.preventDefault();
      if (!closeDisabled) onClose?.();
    }

    dialog.addEventListener('cancel', handleCancel);
    return () => dialog.removeEventListener('cancel', handleCancel);
  }, [onClose, closeDisabled]);

  const maxWidth =
    size === 'lg'
      ? 'sm:max-w-2xl'
      : size === 'sm'
        ? 'sm:max-w-md'
        : 'sm:max-w-lg';

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClick={(event) => {
        if (event.target === dialogRef.current && !closeDisabled) onClose?.();
      }}
      className={`fixed inset-x-0 bottom-0 top-auto m-0 max-h-[92dvh] w-full max-w-none overflow-hidden rounded-t-card border-0 bg-white p-0 text-ink shadow-lift backdrop:bg-ink/40 backdrop:backdrop-blur-sm sm:inset-0 sm:m-auto sm:rounded-card ${maxWidth}`}
    >
      <div className="flex max-h-[92dvh] flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="font-display text-lg font-semibold text-ink"
            >
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="mt-1 text-sm text-muted">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={closeDisabled}
            aria-label="Zamknij okno"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted transition hover:bg-canvas hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200 disabled:opacity-50"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {children}
        </div>

        {footer ? (
          <div className="safe-bottom border-t border-line bg-white px-5 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </dialog>
  );
}
