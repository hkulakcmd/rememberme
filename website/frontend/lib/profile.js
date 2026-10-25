import { request } from './api';

export function updateProfile(payload) {
  return request('/me', { method: 'PATCH', body: payload });
}

export function logoutAllDevices() {
  return request('/auth/logout-all', { method: 'POST' });
}

export function deleteAccount(payload) {
  return request('/me', { method: 'DELETE', body: payload });
}
