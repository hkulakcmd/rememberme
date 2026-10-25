'use client';

import { useEffect } from 'react';

/** Register Serwist without shipping the @serwist/window runtime. */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== 'production' ||
      !('serviceWorker' in navigator)
    ) {
      return undefined;
    }

    function register() {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
        // Push/install features will simply show as unavailable.
      });
    }

    // beforeinstallprompt fires once. Capture it at the root so the Settings
    // card can still use it after client-side navigation.
    function handleInstallPrompt(event) {
      event.preventDefault();
      window.__remembermeInstallPrompt = event;
      window.dispatchEvent(new CustomEvent('rememberme:installprompt'));
    }

    function handleInstalled() {
      window.__remembermeInstallPrompt = null;
      window.dispatchEvent(new CustomEvent('rememberme:installed'));
    }

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);

    // Register after the first paint/measurement window. Push and the install
    // card call ensureServiceWorker() on demand, so this delay is invisible to
    // users who need the features immediately.
    const timer = window.setTimeout(register, 5_000);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  return null;
}
