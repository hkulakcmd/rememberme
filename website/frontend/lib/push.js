import { request } from './api';

export class PushError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'PushError';
    this.code = code;
  }
}

export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function isStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

export function isIosDevice() {
  if (typeof window === 'undefined') return false;
  const userAgent = window.navigator.userAgent || '';
  const iOS = /iphone|ipad|ipod/i.test(userAgent);
  const iPadOs =
    window.navigator.platform === 'MacIntel' &&
    window.navigator.maxTouchPoints > 1;
  return iOS || iPadOs;
}

export function isIosPushBlocked() {
  return isIosDevice() && !isStandalone();
}

function urlBase64ToUint8Array(value) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

export async function ensureServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    throw new PushError(
      'unsupported',
      'Ta przeglądarka nie obsługuje service workerów.'
    );
  }

  const registration = await navigator.serviceWorker.register('/sw.js', {
    scope: '/',
  });

  await Promise.race([
    navigator.serviceWorker.ready,
    new Promise((_, reject) => {
      window.setTimeout(
        () =>
          reject(
            new PushError(
              'sw_timeout',
              'Nie udało się uruchomić service workera.'
            )
          ),
        10_000
      );
    }),
  ]);

  return registration;
}

export async function checkPushState() {
  if (!isPushSupported()) {
    return {
      supported: false,
      permission: 'unsupported',
      subscription: null,
      standalone: isStandalone(),
      ios: isIosDevice(),
    };
  }

  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = registration
    ? await registration.pushManager.getSubscription()
    : null;

  return {
    supported: true,
    permission: Notification.permission,
    subscription,
    standalone: isStandalone(),
    ios: isIosDevice(),
    iosBlocked: isIosPushBlocked(),
  };
}

export async function subscribePush(subscription) {
  const json = subscription.toJSON();
  return request('/push/subscribe', {
    method: 'POST',
    body: {
      endpoint: json.endpoint,
      keys: json.keys,
      user_agent: window.navigator.userAgent,
    },
  });
}

export async function enablePushNotifications() {
  if (!isPushSupported()) {
    throw new PushError(
      'unsupported',
      'Ta przeglądarka nie obsługuje powiadomień push.'
    );
  }
  if (isIosPushBlocked()) {
    throw new PushError(
      'ios_install_required',
      'Na iPhone powiadomienia push wymagają instalacji aplikacji.'
    );
  }

  let permission = Notification.permission;
  if (permission === 'default') {
    permission = await Notification.requestPermission();
  }
  if (permission !== 'granted') {
    throw new PushError(
      'permission_denied',
      'Zgoda na powiadomienia została zablokowana w przeglądarce.'
    );
  }

  const registration = await ensureServiceWorker();
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    const { public_key: publicKey } = await request('/push/public-key');
    if (!publicKey) {
      throw new PushError(
        'not_configured',
        'Powiadomienia push nie są jeszcze skonfigurowane na serwerze.'
      );
    }
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  await subscribePush(subscription);
  return subscription;
}

export async function disablePushNotifications({ removeFromServer = true } = {}) {
  if (!isPushSupported()) return false;

  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = registration
    ? await registration.pushManager.getSubscription()
    : null;
  if (!subscription) return false;

  if (removeFromServer) {
    try {
      await request('/push/subscribe', {
        method: 'DELETE',
        body: { endpoint: subscription.endpoint },
      });
    } catch {
      // Local unsubscribe is still useful if the server call fails.
    }
  }

  await subscription.unsubscribe();
  return true;
}

export async function sendTestPush() {
  return request('/push/test', { method: 'POST' });
}

/** Best-effort cleanup when the user logs out on a shared device. */
export async function removePushSubscriptionBeforeLogout() {
  try {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;
    await request('/push/subscribe', {
      method: 'DELETE',
      body: { endpoint: subscription.endpoint },
    });
    await subscription.unsubscribe();
  } catch {
    // Logging out must never be blocked by push cleanup.
  }
}
