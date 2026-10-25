import { forwardRef } from 'react';

import { Spinner } from './Spinner';

const VARIANTS = {
  primary:
    'bg-brand-600 text-white shadow-soft hover:bg-brand-700 active:bg-brand-800 focus-visible:ring-brand-300',
  secondary:
    'border border-line bg-white text-ink hover:border-brand-200 hover:bg-brand-50/70 focus-visible:ring-brand-200',
  ghost:
    'text-muted hover:bg-brand-50 hover:text-ink focus-visible:ring-brand-200',
  danger:
    'bg-red-600 text-white shadow-soft hover:bg-red-700 active:bg-red-800 focus-visible:ring-red-300',
};

const SIZES = {
  sm: 'min-h-11 gap-1.5 px-4 py-2 text-sm',
  md: 'min-h-12 gap-2 px-5 py-2.5 text-base sm:text-[15px]',
  lg: 'min-h-14 gap-2 px-6 py-3 text-base',
};

export function buttonStyles({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
} = {}) {
  return [
    'inline-flex items-center justify-center rounded-full font-semibold transition',
    'focus-visible:outline-none focus-visible:ring-4',
    'disabled:cursor-not-allowed disabled:opacity-60',
    VARIANTS[variant] || VARIANTS.primary,
    SIZES[size] || SIZES.md,
    fullWidth ? 'w-full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
}

export const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    loading = false,
    className = '',
    children,
    disabled,
    type = 'button',
    ...props
  },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonStyles({ variant, size, fullWidth, className })}
      {...props}
    >
      {loading ? <Spinner className="h-4 w-4" /> : null}
      {children}
    </button>
  );
});
