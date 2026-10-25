/** Small helpers shared by auth screens and providers. */

export const AUTH_STATUS = {
  loading: 'loading',
  authenticated: 'authenticated',
  anonymous: 'anonymous',
};

export function displayName(user) {
  if (!user) return '';
  const full = [user.first_name, user.last_name].filter(Boolean).join(' ');
  return full || user.email?.split('@')[0] || '';
}

export function getInitials(user) {
  if (!user) return '?';
  const first = user.first_name?.trim()?.[0] || '';
  const last = user.last_name?.trim()?.[0] || '';
  if (first || last) return `${first}${last}`.toUpperCase();
  return (user.email?.[0] || '?').toUpperCase();
}

/**
 * Only relative paths are accepted to avoid open redirects via ?next=.
 */
export function sanitizeNextPath(value, fallback = '/dashboard') {
  if (typeof value !== 'string' || !value) return fallback;
  if (!value.startsWith('/') || value.startsWith('//')) return fallback;
  if (value.startsWith('/login') || value.startsWith('/register')) {
    return fallback;
  }
  return value;
}

export function getBrowserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export const AUTH_METHOD_LABELS = {
  password: 'E-mail i hasło',
  google: 'Google',
  facebook: 'Facebook',
};
