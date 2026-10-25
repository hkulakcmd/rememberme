/**
 * Single API entry point (architecture.md §10).
 *
 * Rules:
 * - components never call fetch directly,
 * - the access token lives in memory only (never localStorage),
 * - refresh is single-flight and retried once per failed request,
 * - the backend envelope `{ "data": ... }` is unwrapped here.
 */
const API_BASE = '/api/v1';

let accessToken = null;
let refreshPromise = null;
let unauthorizedHandler = null;

export class ApiError extends Error {
  constructor(
    message,
    { status = 0, code = 'error', fields = {}, retryAfter = null } = {}
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
    this.retryAfter = retryAfter;
  }
}

export function setAccessToken(token) {
  accessToken = token || null;
}

export function getAccessToken() {
  return accessToken;
}

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

function buildUrl(path, query) {
  const params = new URLSearchParams();

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      if (Array.isArray(value)) {
        value.forEach((item) => params.append(key, String(item)));
      } else {
        params.append(key, String(value));
      }
    });
  }

  const suffix = params.toString();
  return `${API_BASE}${path}${suffix ? `?${suffix}` : ''}`;
}

async function parseBody(response) {
  if (response.status === 204) return null;
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) return null;
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function toApiError(response, payload) {
  return new ApiError(
    payload?.detail || 'Coś poszło nie tak. Spróbuj ponownie.',
    {
      status: response.status,
      code: payload?.code || 'error',
      fields: payload?.fields || {},
      retryAfter: response.headers.get('Retry-After'),
    }
  );
}

async function send(path, { method = 'GET', body, headers, query, signal } = {}) {
  const requestHeaders = { Accept: 'application/json', ...headers };

  if (body !== undefined) {
    requestHeaders['Content-Type'] = 'application/json';
  }
  if (accessToken) {
    requestHeaders.Authorization = `Bearer ${accessToken}`;
  }

  try {
    return await fetch(buildUrl(path, query), {
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'include',
      cache: 'no-store',
      signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw new ApiError(
      'Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.',
      { status: 0, code: 'network_error' }
    );
  }
}

async function unwrapEnvelope(response) {
  const payload = await parseBody(response);
  if (!response.ok) throw toApiError(response, payload);
  if (!payload) return { data: null, meta: null };
  return { data: payload.data ?? null, meta: payload.meta ?? null };
}

/**
 * Perform an API call and keep the pagination envelope. Access-token refresh is
 * single-flight: a failed refresh clears the session through the handler.
 */
export async function requestEnvelope(path, options = {}) {
  const { authRetry = true, ...rest } = options;
  let response = await send(path, rest);

  if (response.status === 401 && authRetry && accessToken) {
    try {
      await refreshAccessToken();
    } catch (error) {
      if (typeof unauthorizedHandler === 'function') unauthorizedHandler();
      throw error;
    }
    response = await send(path, rest);
  }

  return unwrapEnvelope(response);
}

/** Perform an API call and return only the `data` part of the envelope. */
export async function request(path, options = {}) {
  const { data } = await requestEnvelope(path, options);
  return data;
}

/** Exchange the HttpOnly refresh cookie for a new in-memory access token. */
export function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const response = await send('/auth/refresh', { method: 'POST' });
      const payload = await parseBody(response);
      if (!response.ok) throw toApiError(response, payload);
      const token = payload?.data?.access || null;
      setAccessToken(token);
      return token;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

export async function login(credentials) {
  const data = await request('/auth/login', {
    method: 'POST',
    body: credentials,
    authRetry: false,
  });
  setAccessToken(data.access);
  return data;
}

export async function register(payload) {
  const data = await request('/auth/register', {
    method: 'POST',
    body: payload,
    authRetry: false,
  });
  // Registration sets the refresh cookie but does not return an access token.
  await refreshAccessToken();
  return data.user;
}

export async function logoutRequest() {
  try {
    await request('/auth/logout', { method: 'POST', authRetry: false });
  } finally {
    setAccessToken(null);
  }
}

export async function fetchMe() {
  return request('/me');
}

export async function socialLogin(provider, payload) {
  const data = await request(`/auth/social/${provider}`, {
    method: 'POST',
    body: payload,
    authRetry: false,
  });
  setAccessToken(data.access);
  return data;
}

export async function requestPasswordReset(email) {
  return request('/auth/password/reset', {
    method: 'POST',
    body: { email },
    authRetry: false,
  });
}

export async function confirmPasswordReset(payload) {
  return request('/auth/password/reset/confirm', {
    method: 'POST',
    body: payload,
    authRetry: false,
  });
}
