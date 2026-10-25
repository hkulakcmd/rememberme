import { request, requestEnvelope } from './api';

export function listBirthdays({
  search = '',
  ordering = 'date',
  page = 1,
  pageSize = 20,
  signal,
} = {}) {
  return requestEnvelope('/birthdays', {
    query: {
      search: search || undefined,
      ordering,
      page,
      page_size: pageSize,
    },
    signal,
  });
}

export function getBirthday(id, { signal } = {}) {
  return request(`/birthdays/${encodeURIComponent(id)}`, { signal });
}

export function createBirthday(payload) {
  return request('/birthdays', { method: 'POST', body: payload });
}

export function updateBirthday(id, payload) {
  return request(`/birthdays/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: payload,
  });
}

export function deleteBirthday(id) {
  return request(`/birthdays/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export function searchBirthdays(query, { signal } = {}) {
  return request('/birthdays/search', {
    query: { q: query },
    signal,
  });
}
