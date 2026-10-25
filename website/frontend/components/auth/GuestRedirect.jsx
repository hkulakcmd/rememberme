'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/components/providers/AuthProvider';
import { sanitizeNextPath } from '@/lib/auth';

/**
 * Keeps signed-in visitors away from the login/register screens without
 * blocking the first paint for anonymous users.
 */
export function GuestRedirect() {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status !== 'authenticated') return;
    const params = new URLSearchParams(window.location.search);
    router.replace(sanitizeNextPath(params.get('next')));
  }, [status, router]);

  return null;
}
