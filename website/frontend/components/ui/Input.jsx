'use client';

import { forwardRef, useId } from 'react';

export function inputClasses({ invalid = false, className = '' } = {}) {
  return [
    'min-h-12 w-full rounded-field border bg-white px-4 py-2.5 text-base text-ink shadow-sm sm:text-[15px]',
    'placeholder:text-muted/60 transition',
    'focus:outline-none focus:ring-4',
    invalid
      ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
      : 'border-line focus:border-brand-300 focus:ring-brand-100',
    className,
  ]
    .filter(Boolean)
    .join(' ');
}

export const Input = forwardRef(function Input(
  {
    label,
    error,
    hint,
    id,
    required = false,
    className = '',
    containerClassName = '',
    ...props
  },
  ref
) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={containerClassName}>
      {label ? (
        <label
          htmlFor={inputId}
          className="mb-1.5 flex items-baseline justify-between gap-2 text-sm font-semibold text-ink"
        >
          <span>
            {label}
            {required ? (
              <span className="ml-1 text-brand-500" aria-hidden="true">
                *
              </span>
            ) : null}
          </span>
        </label>
      ) : null}
      <input
        ref={ref}
        id={inputId}
        required={required}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        className={inputClasses({ invalid: Boolean(error), className })}
        {...props}
      />
      {hint && !error ? (
        <p id={hintId} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="mt-1.5 text-xs font-medium text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
});
