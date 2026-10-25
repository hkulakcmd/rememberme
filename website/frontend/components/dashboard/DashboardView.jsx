'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

import { PageHeader } from '@/components/layout/PageHeader';
import { useAuth } from '@/components/providers/AuthProvider';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { buttonStyles } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { getDashboard } from '@/lib/dashboard';
import {
  formatAge,
  formatMonthShort,
  formatOccurrence,
  formatRelativeDays,
  parseIsoDate,
  todayInTimezone,
} from '@/lib/dates';
import { humanizeApiError } from '@/lib/errors';

function StatCard({ label, value, hint, tone, icon }) {
  return (
    <div className="min-w-0 rounded-card border border-line bg-white p-5 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 break-words text-sm font-medium text-muted">
          {label}
        </span>
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tone}`}
        >
          {icon}
        </span>
      </div>
      <p className="mt-3 font-display text-3xl font-semibold text-ink">{value}</p>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </div>
  );
}

function DateBadge({ date, today, highlight = false }) {
  const parsed = parseIsoDate(date);
  if (!parsed) return null;

  return (
    <span
      className={`grid h-14 w-14 shrink-0 place-content-center rounded-2xl text-center ${
        highlight
          ? 'bg-gradient-to-br from-brand-500 to-lavender-500 text-white'
          : 'bg-brand-50 text-brand-700'
      }`}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wider">
        {formatMonthShort(parsed.month)}
      </span>
      <span className="font-display text-xl font-semibold leading-none">
        {parsed.day}
      </span>
      {parsed.year !== today.year ? (
        <span className="mt-0.5 text-[9px] font-semibold">{parsed.year}</span>
      ) : null}
    </span>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <PageHeader title="Pulpit" description="Najważniejsze urodziny w jednym miejscu." />
      <Skeleton className="h-44 w-full rounded-card" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <Skeleton key={item} className="h-36 w-full rounded-card" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 w-full rounded-card" />
        <Skeleton className="h-64 w-full rounded-card" />
      </div>
    </div>
  );
}

export function DashboardView() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  const load = useCallback(async (signal) => {
    setStatus('loading');
    setError('');
    try {
      const dashboard = await getDashboard({ signal });
      setData(dashboard);
      setStatus('ready');
    } catch (caught) {
      if (caught?.name === 'AbortError') return;
      setError(humanizeApiError(caught));
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load, revision]);

  if (status === 'loading') return <DashboardSkeleton />;
  if (status === 'error') {
    return (
      <div className="space-y-5">
        <PageHeader title="Pulpit" description="Najważniejsze urodziny w jednym miejscu." />
        <div className="rounded-card border border-brand-100 bg-brand-50 p-6 text-center">
          <p className="text-sm font-medium text-brand-800">{error}</p>
          <button
            type="button"
            onClick={() => setRevision((value) => value + 1)}
            className={buttonStyles({ size: 'sm', className: 'mt-4' })}
          >
            Spróbuj ponownie
          </button>
        </div>
      </div>
    );
  }

  const today = todayInTimezone(user?.timezone || 'UTC');
  const hasBirthdays = data.total > 0;
  const next = data.next;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pulpit"
        description="Najważniejsze urodziny w jednym miejscu."
      />

      {!hasBirthdays ? (
        <EmptyState
          title="Zacznij od pierwszej osoby"
          description="Dodaj imię i datę urodzenia, a resztą zajmiemy się my. Zobaczysz tutaj najbliższe urodziny i przypomnienia."
          icon={
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 20h16" />
              <path d="M5 20v-6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6" />
              <path d="M12 12V9" />
              <path d="M12 9c-1.7 0-2.8-.9-2.8-2.2C9.2 5.5 10.1 4.4 11.2 4.4c.7 0 1.1.3 1.6.9.5-.6.9-.9 1.6-.9 1.1 0 2 1.1 2 2.4C16.4 8.1 15.3 9 13.6 9" />
            </svg>
          }
          action={
            <Link href="/birthdays?new=1" className={buttonStyles({ size: 'sm' })}>
              Dodaj pierwszą osobę
            </Link>
          }
        />
      ) : (
        <>
          {next ? (
            <Link
              href={`/birthdays?edit=${next.id}`}
              className="block overflow-hidden rounded-card border border-brand-100 bg-pastel shadow-card transition hover:border-brand-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200"
            >
              <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <DateBadge date={next.date} today={today} highlight />
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-700">
                      {next.in_days === 0 ? 'Dziś urodziny' : 'Następne urodziny'}
                    </p>
                    <h2 className="mt-1 truncate font-display text-2xl font-semibold text-ink">
                      {next.full_name}
                    </h2>
                    <p className="mt-1 text-sm font-medium text-brand-700">
                      {formatRelativeDays(next.in_days)} ·{' '}
                      {formatOccurrence(next.date, today)}
                    </p>
                  </div>
                </div>
                <span className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/70 bg-white/70 px-5 text-sm font-semibold text-brand-700 backdrop-blur">
                  Zobacz szczegóły
                </span>
              </div>
            </Link>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Dzisiaj"
              value={data.today.length}
              hint="Urodziny w dniu dzisiejszym"
              tone="bg-brand-50 text-brand-600"
              icon={
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M8 2v4M16 2v4M3 10h18" />
                  <rect x="3" y="4" width="18" height="18" rx="3" />
                  <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
                </svg>
              }
            />
            <StatCard
              label="Najbliższe 30 dni"
              value={data.upcoming_30d.length}
              hint="Kto ma urodziny w tym miesiącu"
              tone="bg-lavender-50 text-lavender-600"
              icon={
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 12a9 9 0 1 0 3-6.7" />
                  <path d="M3 4v5h5" />
                  <path d="M12 8v4l3 2" />
                </svg>
              }
            />
            <StatCard
              label="Wszystkie osoby"
              value={data.total}
              hint="Zapisane urodziny bliskich"
              tone="bg-mint-50 text-mint-600"
              icon={
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.9" />
                  <path d="M16 3.1a4 4 0 0 1 0 7.8" />
                </svg>
              }
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-card border border-line bg-white p-5 shadow-card">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-lg font-semibold text-ink">
                  Dziś urodziny
                </h2>
                <Badge tone="brand">{data.today.length}</Badge>
              </div>
              {data.today.length ? (
                <ul className="mt-4 space-y-2">
                  {data.today.map((person) => (
                    <li key={person.id}>
                      <Link
                        href={`/birthdays?edit=${person.id}`}
                        className="flex min-h-14 items-center gap-3 rounded-field px-2 py-2 transition hover:bg-canvas focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200"
                      >
                        <Avatar name={person.full_name} size="sm" />
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                          {person.full_name}
                        </span>
                        {person.age !== null ? (
                          <span className="shrink-0 text-xs font-medium text-muted">
                            {formatAge(person.age)}
                          </span>
                        ) : null}
                        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="m9 18 6-6-6-6" />
                        </svg>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-muted">
                  Dziś nikt nie ma urodzin. Spokojny dzień.
                </p>
              )}
            </section>

            <section className="rounded-card border border-line bg-white p-5 shadow-card">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-lg font-semibold text-ink">
                  Najbliższe 30 dni
                </h2>
                <Link
                  href="/birthdays"
                  className="inline-flex min-h-11 items-center rounded-full px-2 text-xs font-semibold text-brand-700 underline-offset-4 hover:bg-brand-50 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200"
                >
                  Zobacz wszystkie
                </Link>
              </div>
              {data.upcoming_30d.length ? (
                <ul className="mt-4 space-y-2">
                  {data.upcoming_30d.map((person) => (
                    <li key={person.id}>
                      <Link
                        href={`/birthdays?edit=${person.id}`}
                        className="flex min-h-14 items-center gap-3 rounded-field px-2 py-2 transition hover:bg-canvas focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200"
                      >
                        <DateBadge date={person.date} today={today} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-ink">
                            {person.full_name}
                          </span>
                          <span className="block text-xs text-muted">
                            {formatOccurrence(person.date, today)}
                          </span>
                        </span>
                        <span className="shrink-0 text-xs font-semibold text-brand-700">
                          {formatRelativeDays(person.in_days)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-muted">
                  Brak urodzin w najbliższych 30 dniach.
                </p>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
