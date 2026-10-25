import Link from 'next/link';

import { buttonStyles } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';

export const metadata = {
  title: 'Nie znaleziono strony',
};

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-card border border-line bg-white p-8 text-center shadow-card">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <p className="font-display text-5xl font-semibold text-brand-500">404</p>
        <h1 className="mt-3 font-display text-2xl font-semibold text-ink">
          Nie ma tu takiej strony
        </h1>
        <p className="mt-2 text-sm text-muted">
          Adres mógł się zmienić albo strona została usunięta.
        </p>
        <Link href="/dashboard" className={buttonStyles({ fullWidth: true, className: 'mt-6' })}>
          Wróć do pulpitu
        </Link>
      </div>
    </main>
  );
}
