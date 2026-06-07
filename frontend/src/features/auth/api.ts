import { api, unwrap } from '@/lib/api';
import type { AuthUser } from '@/types';

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: 'instructor' | 'student';
}

/** A lightweight, stable device fingerprint for session binding. */
export function deviceFingerprint(): string {
  const parts = [
    navigator.userAgent,
    navigator.language,
    String(screen.width),
    String(screen.height),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ];
  let hash = 0;
  const str = parts.join('|');
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return `fp_${Math.abs(hash).toString(16)}`;
}

export async function registerUser(payload: RegisterPayload) {
  const res = await api.post('/auth/register', payload);
  return res.data;
}

export async function loginUser(email: string, password: string): Promise<string> {
  const res = await api.post(
    '/auth/login',
    { email, password },
    { headers: { 'x-device-fingerprint': deviceFingerprint() } },
  );
  // login returns { success, data: <accessToken string> }
  return unwrap<string>(res.data);
}

export async function fetchMe(): Promise<AuthUser> {
  const res = await api.get('/auth/me');
  const data = unwrap<{ userId: string; email: string; role: string; name?: string }>(res.data);
  const role = (data.role === 'instructor' ? 'teacher' : data.role) as AuthUser['role'];
  return { userId: data.userId, email: data.email, role, name: data.name };
}

export async function verifyEmail(email: string, otp: string) {
  const res = await api.post('/auth/verify-email', { email, otp });
  return res.data;
}

export async function resendEmailOtp(email: string) {
  const res = await api.post('/auth/request-otp', { email });
  return res.data;
}

export async function forgotPassword(email: string) {
  const res = await api.post('/auth/forgot-password', { email });
  return res.data;
}

export async function verifyResetOtp(email: string, otp: string) {
  const res = await api.post('/auth/verify-reset-otp', { email, otp });
  return res.data;
}

export async function resetPassword(email: string, password: string) {
  const res = await api.post('/auth/reset-password', { email, password });
  return res.data;
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const res = await api.post('/auth/change-password', { currentPassword, newPassword });
  return res.data;
}

export async function logout() {
  try {
    await api.post('/auth/logout');
  } catch {
    /* best-effort */
  }
}
