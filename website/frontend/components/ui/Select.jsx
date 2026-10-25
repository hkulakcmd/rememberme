'use client';

import { forwardRef, useId } from 'react';

import { inputClasses } from './Input';

export const Select = forwardRef(function Select(
  {
    label,
    error,
    hint,
    id,
    required = false,
    className = '',
    containerClassName = '',
    children,
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
          className="mb-1.5 block text-sm font-semibold text-ink"
        >
          {label}
          {required ? (
            <span className="ml-1 text-brand-500" aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
      ) : null}
      <div className="relative">
        <select
          ref={ref}
          id={inputId}
          required={required}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          className={inputClasses({
            invalid: Boolean(error),
            className: `appearance-none pr-10 ${className}`,
          })}
          {...props}
        >
          {children}
        </select>
        <svg
          viewBox="0 0 24 24"
          className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
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
