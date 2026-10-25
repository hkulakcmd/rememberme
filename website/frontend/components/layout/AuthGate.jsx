'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { useAuth } from '@/components/providers/AuthProvider';
import { Logo } from '@/components/ui/Logo';
import { Spinner } from '@/components/ui/Spinner';

function FullPageLoader() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 px-4">
      <Logo />
      <div className="flex items-center gap-2 text-sm font-medium text-muted">
        <Spinner className="h-4 w-4" />
        Wracamy do Twoich urodzin…
      </div>
    </div>
  );
}

export function AuthGate({ children }) {
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'anonymous') {
      const next = encodeURIComponent(pathname || '/dashboard');
      router.replace(`/login?next=${next}`);
    }
  }, [status, pathname, router]);

  if (status !== 'authenticated') {
    return <FullPageLoader />;
  }

  return children;
}
