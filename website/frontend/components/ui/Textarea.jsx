'use client';

import { forwardRef, useId } from 'react';

export const Textarea = forwardRef(function Textarea(
  {
    label,
    error,
    hint,
    id,
    required = false,
    maxLength,
    value = '',
    className = '',
    containerClassName = '',
    rows = 4,
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
          {maxLength ? (
            <span className="text-xs font-normal text-muted">
              {String(value).length}/{maxLength}
            </span>
          ) : null}
        </label>
      ) : null}
      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        maxLength={maxLength}
        value={value}
        required={required}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        className={`min-h-28 w-full resize-y rounded-field border bg-white px-4 py-3 text-base text-ink shadow-sm placeholder:text-muted/60 transition focus:outline-none focus:ring-4 sm:text-[15px] ${
          error
            ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
            : 'border-line focus:border-brand-300 focus:ring-brand-100'
        } ${className}`}
        {...props}
      />
      {hint && !error ? (
        <p id={hintId} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p
          id={errorId}
          role="alert"
          className="mt-1.5 text-xs font-medium text-red-600"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
});
