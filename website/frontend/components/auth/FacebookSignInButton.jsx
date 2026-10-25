'use client';

import { useState } from 'react';

import { Spinner } from '@/components/ui/Spinner';

let facebookPromise = null;

function loadFacebookSdk(appId) {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Facebook SDK requires a browser.'));
  }
  if (window.FB) return Promise.resolve(window.FB);
  if (facebookPromise) return facebookPromise;

  facebookPromise = new Promise((resolve, reject) => {
    window.fbAsyncInit = () => {
      window.FB.init({
        appId,
        cookie: false,
        xfbml: false,
        version: 'v21.0',
      });
      resolve(window.FB);
    };

    if (!document.getElementById('facebook-jssdk')) {
      const script = document.createElement('script');
      script.id = 'facebook-jssdk';
      script.src = `https://connect.facebook.net/pl_PL/sdk.js#xfbml=1&version=v21.0&appId=${encodeURIComponent(appId)}`;
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';
      script.onerror = () => reject(new Error('Facebook SDK failed to load.'));
      document.body.appendChild(script);
    }
  });

  return facebookPromise;
}

export function FacebookSignInButton({ onToken, disabled = false }) {
  const [loading, setLoading] = useState(false);
  const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;

  async function handleClick() {
    if (!appId || loading || disabled) return;
    setLoading(true);
    try {
      await loadFacebookSdk(appId);
      window.FB.login(
        (response) => {
          setLoading(false);
          if (response?.authResponse?.accessToken) {
            onToken(response.authResponse.accessToken);
          }
        },
        { scope: 'email,public_profile' }
      );
    } catch {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:border-brand-200 hover:bg-brand-50/70 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? <Spinner className="h-4 w-4" /> : <FacebookMark />}
      Facebook
    </button>
  );
}

export function FacebookMark({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#1877F2" />
      <path
        fill="#fff"
        d="M16.7 15.5 17.2 12h-3.4V9.7c0-1 .5-1.9 2-1.9h1.6V4.7s-1.4-.2-2.7-.2c-2.8 0-4.6 1.7-4.6 4.7V12H7v3.5h3.1V24a12 12 0 0 0 3.7 0v-8.5h2.9Z"
      />
    </svg>
  );
}
