import { request } from './api';

export function getNotificationPreferences({ signal } = {}) {
  return request('/notification-preferences', { signal });
}

export function updateNotificationPreferences(payload) {
  return request('/notification-preferences', {
    method: 'PATCH',
    body: payload,
  });
}
