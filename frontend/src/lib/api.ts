import axios, { AxiosError } from 'axios';
import { useAuthStore } from '@/store/auth';

// All traffic goes through the API gateway. In dev, Vite proxies /api -> :3000.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // The gateway parses JSON bodies in strict mode, which rejects primitive
  // payloads. Because this client always sends `Content-Type: application/json`,
  // axios would serialize a null/undefined body to the literal string "null"
  // and the gateway would 400 with `"null" is not valid JSON`. Normalize empty
  // write bodies to an object so payload-less POST/PUT/PATCH calls just work.
  const method = (config.method || 'get').toLowerCase();
  if (['post', 'put', 'patch'].includes(method) && config.data == null) {
    config.data = {};
  }
  return config;
});

let refreshing: Promise<string | null> | null = null;

async function refreshToken(): Promise<string | null> {
  try {
    const res = await axios.post('/api/auth/refresh', null, { withCredentials: true });
    const next = res.data?.data?.accessToken || res.data?.accessToken;
    if (next) {
      useAuthStore.getState().setAccessToken(next);
      return next;
    }
  } catch {
    /* fall through */
  }
  return null;
}

/** Force-refresh the access token (e.g. after an instructor is approved, so the
 *  new token carries the updated approval claim instead of waiting for expiry). */
export async function refreshAccessToken(): Promise<string | null> {
  refreshing = refreshing || refreshToken();
  const token = await refreshing;
  refreshing = null;
  return token;
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (typeof error.config & { _retried?: boolean }) | undefined;
    if (error.response?.status === 401 && original && !original._retried) {
      original._retried = true;
      refreshing = refreshing || refreshToken();
      const token = await refreshing;
      refreshing = null;
      if (token) {
        original.headers = original.headers ?? {};
        (original.headers as Record<string, string>).Authorization = `Bearer ${token}`;
        return api(original);
      }
      useAuthStore.getState().clear();
    }
    return Promise.reject(error);
  },
);

/** Normalize the various service envelopes to a plain payload. */
export function unwrap<T>(payload: unknown): T {
  const body = payload as { data?: T } | T;
  if (body && typeof body === 'object' && 'data' in (body as object)) {
    return (body as { data: T }).data;
  }
  return body as T;
}

// Internal/low-level messages we never want to surface verbatim to users.
function isInternalMessage(msg?: string): boolean {
  if (!msg) return true;
  return (
    /is not valid JSON/i.test(msg) ||
    /Unexpected token/i.test(msg) ||
    /JSON\.parse/i.test(msg) ||
    /Network Error/i.test(msg) ||
    /timeout of \d+ms exceeded/i.test(msg)
  );
}

export function apiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data as
      | { message?: string; error?: string; errors?: unknown }
      | undefined;

    // Some services (e.g. exam) return a validation `errors` array with the
    // real reasons — surface those instead of a generic status message.
    if (data && Array.isArray(data.errors) && data.errors.length) {
      return data.errors.join('; ');
    }

    const serverMsg = data?.message || data?.error;
    if (serverMsg && !isInternalMessage(serverMsg)) return serverMsg;

    // No usable server message — translate the transport failure into something
    // human, never a raw parser/stack message.
    if (error.code === 'ECONNABORTED' || /timeout/i.test(error.message)) {
      return 'The request timed out. Please try again.';
    }
    if (status === 503 || status === 504) return 'That service is temporarily unavailable. Please try again shortly.';
    if (status === 401) return 'Your session expired. Please sign in again.';
    if (status === 403) return 'You do not have permission to do that.';
    if (status === 404) return fallback;
    if (status && status >= 500) return 'The server hit an unexpected error. Please try again.';
    if (!error.response) return 'Could not reach the server. Check your connection and try again.';

    return isInternalMessage(error.message) ? fallback : error.message;
  }
  if (error instanceof Error && !isInternalMessage(error.message)) return error.message;
  return fallback;
}
