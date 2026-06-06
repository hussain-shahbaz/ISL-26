import { api, unwrap } from '@/lib/api';

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  university?: string;
  createdAt?: string;
}

interface UserListResponse {
  users: ManagedUser[];
  pagination?: { total: number; page: number; limit: number };
}

const BASE = '/modules/user';

export async function getPendingInstructors(): Promise<ManagedUser[]> {
  const res = await api.get(`${BASE}/instructors/pending`);
  return unwrap<UserListResponse>(res.data)?.users ?? [];
}

export async function getInstructors(): Promise<ManagedUser[]> {
  const res = await api.get(`${BASE}/instructors`);
  return unwrap<UserListResponse>(res.data)?.users ?? [];
}

export async function getStudents(): Promise<ManagedUser[]> {
  const res = await api.get(`${BASE}/students`);
  return unwrap<UserListResponse>(res.data)?.users ?? [];
}

export async function updateApproval(userId: string, status: 'APPROVED' | 'REJECTED') {
  const res = await api.patch(`${BASE}/${userId}/approval`, { status });
  return res.data;
}
