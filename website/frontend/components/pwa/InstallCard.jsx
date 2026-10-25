'use client';

import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { isIosDevice, isStandalone } from '@/lib/push';

export function InstallCard() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());
    setIos(isIosDevice());

    if (window.__remembermeInstallPrompt) {
      setDeferredPrompt(window.__remembermeInstallPrompt);
    }

    function handlePrompt() {
      setDeferredPrompt(window.__remembermeInstallPrompt || null);
    }

    function handleInstalled() {
      setInstalled(true);
      setDeferredPrompt(null);
    }

    function handleDisplayMode() {
      setInstalled(isStandalone());
    }

    window.addEventListener('rememberme:installprompt', handlePrompt);
    window.addEventListener('rememberme:installed', handleInstalled);
    window.addEventListener('appinstalled', handleInstalled);
    const media = window.matchMedia?.('(display-mode: standalone)');
    media?.addEventListener?.('change', handleDisplayMode);

    return () => {
      window.removeEventListener('rememberme:installprompt', handlePrompt);
      window.removeEventListener('rememberme:installed', handleInstalled);
      window.removeEventListener('appinstalled', handleInstalled);
      media?.removeEventListener?.('change', handleDisplayMode);
    };
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setInstalled(true);
    }
    window.__remembermeInstallPrompt = null;
    setDeferredPrompt(null);
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">
            Aplikacja na telefonie
          </h2>
          <p className="mt-1 text-sm text-muted">
            Otwieraj RememberMe jednym gestem, bez paska przeglądarki.
          </p>
        </div>
        <Badge tone={installed ? 'mint' : 'lavender'}>
          {installed ? 'Zainstalowana' : 'PWA'}
        </Badge>
      </div>

      <div className="mt-4 rounded-field border border-line bg-canvas/50 p-4">
        {installed ? (
          <p className="text-sm leading-relaxed text-muted">
            Aplikacja jest zainstalowana na tym urządzeniu. Powiadomienia push
            działają w trybie samodzielnym.
          </p>
        ) : ios ? (
          <div>
            <p className="text-sm font-semibold text-ink">
              Instalacja na iPhone / iPad
            </p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-relaxed text-muted">
              <li>Otwórz tę stronę w Safari.</li>
              <li>
                Dotknij przycisku Udostępnij (kwadrat ze strzałką).
              </li>
              <li>Wybierz „Dodaj do ekranu początkowego”.</li>
              <li>Otwórz RememberMe z ekranu głównego.</li>
            </ol>
            <p className="mt-2 text-xs text-muted">
              Na iPhone powiadomienia push wymagają iOS 16.4+ i instalacji
              aplikacji.
            </p>
          </div>
        ) : deferredPrompt ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm leading-relaxed text-muted">
              Zainstaluj aplikację, aby mieć szybszy dostęp i powiadomienia.
            </p>
            <Button type="button" size="sm" onClick={handleInstall}>
              Zainstaluj aplikację
            </Button>
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-muted">
            Otwórz menu przeglądarki i wybierz „Zainstaluj aplikację” lub „Dodaj
            do ekranu głównego”. Jeśli opcja nie jest dostępna, korzystaj z
            Chrome, Edge lub Safari.
          </p>
        )}
      </div>

      <ul className="mt-4 space-y-2">
        {[
          'Szybki dostęp z ekranu głównego',
          'Powiadomienia push na telefonie',
          'Spokojny, pełnoekranowy widok',
        ].map((benefit) => (
          <li
            key={benefit}
            className="flex items-center gap-2 text-sm text-muted"
          >
            <span className="grid h-5 w-5 place-items-center rounded-full bg-mint-50 text-mint-600">
              <svg
                viewBox="0 0 24 24"
                className="h-3 w-3"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </span>
            {benefit}
          </li>
        ))}
      </ul>
    </Card>
  );
}
