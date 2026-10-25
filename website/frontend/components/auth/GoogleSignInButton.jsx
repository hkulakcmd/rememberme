'use client';

import { useEffect, useRef, useState } from 'react';

let gsiPromise = null;

function loadGoogleIdentity() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Identity requires a browser.'));
  }
  if (window.google?.accounts?.id) return Promise.resolve();

  if (!gsiPromise) {
    gsiPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-gsi]');
      const script = existing || document.createElement('script');

      const onLoad = () => {
        if (window.google?.accounts?.id) resolve();
        else reject(new Error('Google Identity failed to initialise.'));
      };
      const onError = () => reject(new Error('Google Identity failed to load.'));

      script.addEventListener('load', onLoad, { once: true });
      script.addEventListener('error', onError, { once: true });

      if (!existing) {
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.dataset.gsi = 'true';
        document.head.appendChild(script);
      }
    });
  }

  return gsiPromise;
}

export function GoogleSignInButton({ onCredential, disabled = false }) {
  const containerRef = useRef(null);
  const credentialRef = useRef(onCredential);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    credentialRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) return undefined;

    let cancelled = false;

    loadGoogleIdentity()
      .then(() => {
        const container = containerRef.current;
        if (cancelled || !container) return;

        window.google.accounts.id.initialize({
          client_id: clientId,
          ux_mode: 'popup',
          callback: (response) => {
            if (response?.credential) {
              credentialRef.current?.(response.credential);
            }
          },
        });

        container.innerHTML = '';
        const width = Math.max(220, Math.min(container.clientWidth || 300, 380));
        window.google.accounts.id.renderButton(container, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text: 'continue_with',
          logo_alignment: 'left',
          width,
        });
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      className={`relative h-12 w-full overflow-hidden rounded-full border border-line bg-white transition ${
        disabled ? 'pointer-events-none opacity-60' : ''
      }`}
    >
      <div
        ref={containerRef}
        className="absolute inset-0 flex items-center justify-center"
      />
      {!ready ? (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 text-sm font-semibold text-ink">
          <GoogleMark />
          Google
        </span>
      ) : null}
    </div>
  );
}

export function GoogleMark({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.7-4.9h-4v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.3 14.4a7.2 7.2 0 0 1 0-4.6V6.7h-4a12 12 0 0 0 0 10.8l4-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A11.5 11.5 0 0 0 12 0 12 12 0 0 0 1.3 6.7l4 3.1C6.3 6.9 8.9 4.8 12 4.8Z"
      />
    </svg>
  );
}
