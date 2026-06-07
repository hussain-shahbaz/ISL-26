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

export function apiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string; error?: string; errors?: unknown }
      | undefined;
    // Some services (e.g. exam) return a validation `errors` array with the
    // real reasons — surface those instead of a generic status message.
    if (data && Array.isArray(data.errors) && data.errors.length) {
      return data.errors.join('; ');
    }
    return data?.message || data?.error || error.message || fallback;
  }
  return fallback;
}
