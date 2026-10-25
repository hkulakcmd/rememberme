import { request } from './api';

export function getDashboard({ signal } = {}) {
  return request('/dashboard', { signal });
}
