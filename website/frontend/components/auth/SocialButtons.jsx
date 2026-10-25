'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';

import { FacebookSignInButton } from '@/components/auth/FacebookSignInButton';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { Alert } from '@/components/ui/Alert';
import { displayName } from '@/lib/auth';
import { humanizeApiError } from '@/lib/errors';

export function SocialButtons({ nextPath = '/dashboard' }) {
  const router = useRouter();
  const { loginWithSocial } = useAuth();
  const toast = useToast();
  const [pending, setPending] = useState(null);
  const [error, setError] = useState('');

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const facebookAppId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;

  const handleGoogle = useCallback(
    async (credential) => {
      setPending('google');
      setError('');
      try {
        const user = await loginWithSocial('google', { id_token: credential });
        toast.success(`Witaj, ${displayName(user)}!`);
        router.replace(nextPath);
      } catch (caught) {
        setError(humanizeApiError(caught));
      } finally {
        setPending(null);
      }
    },
    [loginWithSocial, nextPath, router, toast]
  );

  const handleFacebook = useCallback(
    async (accessToken) => {
      setPending('facebook');
      setError('');
      try {
        const user = await loginWithSocial('facebook', {
          access_token: accessToken,
        });
        toast.success(`Witaj, ${displayName(user)}!`);
        router.replace(nextPath);
      } catch (caught) {
        setError(humanizeApiError(caught));
      } finally {
        setPending(null);
      }
    },
    [loginWithSocial, nextPath, router, toast]
  );

  if (!googleClientId && !facebookAppId) return null;

  return (
    <div className="mt-6">
      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-line" />
        <span className="text-xs font-medium uppercase tracking-wider text-muted">
          lub
        </span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {googleClientId ? (
          <GoogleSignInButton
            onCredential={handleGoogle}
            disabled={Boolean(pending)}
          />
        ) : null}
        {facebookAppId ? (
          <FacebookSignInButton
            onToken={handleFacebook}
            disabled={Boolean(pending)}
          />
        ) : null}
      </div>

      {error ? (
        <Alert tone="error" className="mt-3">
          {error}
        </Alert>
      ) : null}
    </div>
  );
}
