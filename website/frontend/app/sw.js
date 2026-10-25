import { defaultCache } from '@serwist/next/worker';
import { NetworkOnly, Serwist } from 'serwist';

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ url }) =>
        url.origin === self.location.origin && url.pathname.startsWith('/api/'),
      handler: new NetworkOnly(),
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();

function plural(count, one, few, many) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (count === 1) return one;
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) {
    return few;
  }
  return many;
}

/**
 * The backend sends stable English copy. Translate the known shapes for the
 * Polish UI and fall back to the original payload if it changes.
 */
function localizePayload(payload) {
  let title = payload.title || 'Przypomnienie o urodzinach';
  let body = payload.body || 'Masz nowe przypomnienie.';

  if (title === 'Birthday reminder') title = 'Przypomnienie o urodzinach';
  if (title === 'RememberMe test notification') {
    title = 'RememberMe — powiadomienie testowe';
  }

  const today = /^(.*)'s birthday is today\.$/.exec(body);
  const tomorrow = /^(.*)'s birthday is tomorrow\.$/.exec(body);
  const inDays = /^(.*)'s birthday is in (\d+) days\.$/.exec(body);

  if (today) body = `${today[1]}: urodziny są dziś.`;
  else if (tomorrow) body = `${tomorrow[1]}: urodziny są jutro.`;
  else if (inDays) {
    const days = Number(inDays[2]);
    body = `${inDays[1]}: urodziny za ${days} ${plural(
      days,
      'dzień',
      'dni',
      'dni'
    )}.`;
  } else if (body === 'Push notifications are working.') {
    body = 'Powiadomienia push działają poprawnie.';
  }

  return { title, body };
}

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { body: event.data.text() };
  }

  const { title, body } = localizePayload(payload);
  const url =
    typeof payload.url === 'string' && payload.url.startsWith('/')
      ? payload.url
      : '/dashboard';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: payload.tag,
      data: { url },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(
    event.notification.data?.url || '/dashboard',
    self.location.origin
  ).href;

  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      for (const client of clients) {
        if (client.url.startsWith(self.location.origin)) {
          await client.focus();
          if ('navigate' in client) await client.navigate(target);
          return;
        }
      }

      await self.clients.openWindow(target);
    })()
  );
});

function base64UrlToUint8Array(value) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = self.atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

async function resubscribe(oldSubscription) {
  let applicationServerKey =
    oldSubscription?.options?.applicationServerKey || null;

  if (!applicationServerKey) {
    const response = await fetch('/api/v1/push/public-key');
    if (!response.ok) return;
    const payload = await response.json();
    const publicKey = payload?.data?.public_key;
    if (!publicKey) return;
    applicationServerKey = base64UrlToUint8Array(publicKey);
  }

  const subscription = await self.registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey,
  });

  // The service worker has no access to the in-memory JWT, but the refresh
  // cookie is available for /api/v1/auth and can mint a short-lived access token.
  const refresh = await fetch('/api/v1/auth/refresh', {
    method: 'POST',
    credentials: 'include',
  });
  if (!refresh.ok) return;
  const refreshPayload = await refresh.json();
  const access = refreshPayload?.data?.access;
  if (!access) return;

  const json = subscription.toJSON();
  await fetch('/api/v1/push/subscribe', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${access}`,
    },
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: json.keys,
      user_agent: self.navigator?.userAgent || '',
    }),
  });
}

self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    resubscribe(event.oldSubscription).catch(() => {
      // The user can re-enable notifications in Settings.
    })
  );
});
