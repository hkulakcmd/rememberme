'use client';

import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';

export default function ErrorPage({ error, reset }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-card border border-line bg-white p-8 text-center shadow-card">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <h1 className="font-display text-2xl font-semibold text-ink">
          Coś poszło nie tak
        </h1>
        <p className="mt-2 text-sm text-muted">
          Nie udało się załadować tej strony. Spróbuj ponownie.
        </p>
        {process.env.NODE_ENV === 'development' && error?.message ? (
          <p className="mt-4 rounded-field bg-canvas p-3 text-left text-xs text-muted">
            {error.message}
          </p>
        ) : null}
        <Button className="mt-6" onClick={() => reset()} fullWidth>
          Spróbuj ponownie
        </Button>
      </div>
    </main>
  );
}
