'use client';

export function countLabel(count) {
  const value = Number(count) || 0;
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (value === 1) return '1 osoba';
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) {
    return `${value} osoby`;
  }
  return `${value} osób`;
}

const SORT_OPTIONS = [
  { value: 'date', label: 'Najbliższe urodziny' },
  { value: 'first_name', label: 'Imię A–Z' },
  { value: '-first_name', label: 'Imię Z–A' },
  { value: '-created_at', label: 'Ostatnio dodane' },
];

export function BirthdayToolbar({
  search,
  onSearchChange,
  ordering,
  onOrderingChange,
  count,
}) {
  const showSearchHint = search.trim().length > 0 && search.trim().length < 3;

  return (
    <div className="rounded-card border border-line bg-white p-4 shadow-card">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </span>
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Szukaj po imieniu lub nazwisku…"
            aria-label="Szukaj urodzin"
            className="min-h-12 w-full rounded-field border border-line bg-white py-2.5 pl-12 pr-12 text-base text-ink placeholder:text-muted/60 shadow-sm transition focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100 sm:text-[15px]"
          />
          {search ? (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Wyczyść wyszukiwanie"
              className="absolute right-0.5 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full text-muted transition hover:bg-canvas hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
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
          ) : null}
        </div>

        <div className="relative sm:w-60">
          <select
            value={ordering}
            onChange={(event) => onOrderingChange(event.target.value)}
            aria-label="Sortuj urodziny"
            className="min-h-12 w-full appearance-none rounded-field border border-line bg-white py-2.5 pl-4 pr-10 text-base text-ink shadow-sm transition focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100 sm:text-[15px]"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
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
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-xs font-medium text-muted" aria-live="polite">
          {countLabel(count)}
        </p>
        {showSearchHint ? (
          <p className="text-xs text-brand-700" role="status">
            Wpisz co najmniej 3 znaki, aby zawęzić listę.
          </p>
        ) : null}
      </div>
    </div>
  );
}
