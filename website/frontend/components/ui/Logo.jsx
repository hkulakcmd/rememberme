import Link from 'next/link';

export function Logo({ href = '/', compact = false, className = '' }) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-11 min-w-11 items-center gap-3 rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200 ${className}`}
      aria-label="RememberMe — strona główna"
    >
      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 via-brand-500 to-lavender-500 text-white shadow-soft">
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 20h16" />
          <path d="M5 20v-7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7" />
          <path d="M12 11V8" />
          <path d="M12 8c-1.8 0-3-1-3-2.4C9 4.2 10 3 11.2 3c.8 0 1.3.4 1.8 1 .5-.6 1-1 1.8-1C16 3 17 4.2 17 5.6 17 7 15.8 8 14 8" />
          <path d="M8.5 15.5h.01M12 15.5h.01M15.5 15.5h.01" />
        </svg>
      </span>
      {!compact ? (
        <span className="font-display text-lg font-semibold tracking-tight text-ink">
          Remember<span className="text-brand-600">Me</span>
        </span>
      ) : null}
    </Link>
  );
}
