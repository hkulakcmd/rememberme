'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { useAuth } from '@/components/providers/AuthProvider';
import { buttonStyles } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { Spinner } from '@/components/ui/Spinner';
import { displayName, getInitials } from '@/lib/auth';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Pulpit', icon: HomeIcon },
  { href: '/birthdays', label: 'Urodziny', icon: CakeIcon },
  { href: '/settings', label: 'Ustawienia', icon: SettingsIcon },
];

function isActive(pathname, href) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const name = displayName(user);
  const initials = getInitials(user);
  const shortName = user?.first_name?.trim() || name.split(' ')[0] || name;

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      router.replace('/login');
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-brand-700 focus:shadow-lift"
      >
        Przejdź do treści
      </a>

      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-white/70 p-5 backdrop-blur lg:flex">
        <div className="px-2 py-1">
          <Logo />
        </div>

        <nav className="mt-8 space-y-1" aria-label="Nawigacja główna">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-full px-4 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200 ${
                  active
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-muted hover:bg-canvas hover:text-ink'
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-card border border-line bg-canvas/70 p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-lavender-500 text-sm font-semibold text-white">
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{name}</p>
              <p className="truncate text-xs text-muted">{user?.email}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              aria-label="Wyloguj się"
              title="Wyloguj się"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted transition hover:bg-white hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 disabled:opacity-60"
            >
              {loggingOut ? (
                <Spinner className="h-4 w-4" />
              ) : (
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
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <path d="m16 17 5-5-5-5" />
                  <path d="M21 12H9" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-h-dvh flex-col">
        <header className="sticky top-0 z-30 flex min-h-16 items-center gap-2 border-b border-line bg-canvas/85 px-3 backdrop-blur sm:gap-3 sm:px-6 lg:min-h-[4.5rem] lg:px-10">
          <div className="lg:hidden">
            <Logo compact />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink sm:text-base">
              <span className="lg:hidden">Cześć, {shortName}</span>
              <span className="hidden lg:inline">Dzień dobry, {name}</span>
            </p>
            <p className="hidden text-xs text-muted lg:block">
              Dbamy o to, żebyś nikogo nie zapomniał.
            </p>
          </div>
          {pathname !== '/birthdays' ? (
            <Link
              href="/birthdays?new=1"
              aria-label="Dodaj urodziny"
              className={buttonStyles({ size: 'sm', className: 'shrink-0' })}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span className="hidden sm:inline">Dodaj urodziny</span>
            </Link>
          ) : null}
          <Link
            href="/settings"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-lavender-500 text-xs font-semibold text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200 lg:hidden"
          >
            {initials}
            <span className="sr-only">Ustawienia</span>
          </Link>
        </header>

        <main
          id="main-content"
          className="pb-safe-nav mx-auto w-full max-w-6xl flex-1 px-4 pt-5 sm:px-6 sm:pt-6 lg:px-10 lg:pb-12 lg:pt-8"
        >
          {children}
        </main>

        <nav
          aria-label="Nawigacja mobilna"
          className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 backdrop-blur lg:hidden"
        >
          <div className="mx-auto flex max-w-md items-stretch justify-around px-2">
            {NAV_ITEMS.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-semibold transition focus-visible:outline-none ${
                    active ? 'text-brand-700' : 'text-muted'
                  }`}
                >
                  <span
                    className={`grid h-8 w-14 place-items-center rounded-full transition ${
                      active ? 'bg-brand-50' : ''
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}

function HomeIcon({ className = 'h-5 w-5' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m3 10.5 9-7.5 9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M9.5 21v-6h5v6" />
    </svg>
  );
}

function CakeIcon({ className = 'h-5 w-5' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
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
      <path d="M8.5 15.5h.01M12 15.5h.01M15.5 15.5h.01" />
    </svg>
  );
}

function SettingsIcon({ className = 'h-5 w-5' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </svg>
  );
}
