import { api, unwrap } from '@/lib/api';

// Audit logs are read through the gateway (admin only) -> log service.
const BASE = '/modules/log';

export interface LogEntry {
  _id: string;
  service: string;
  eventType: 'REQUEST' | 'RESPONSE';
  requestId?: string;
  timestamp: string;
  request?: { method?: string; path?: string; url?: string; statusCode?: number };
  response?: { statusCode?: number; responseTime?: number };
  error?: { message?: string } | null;
  currentHash?: string;
}

export interface LogQueryResult {
  data: LogEntry[];
  total: number;
}

export interface ChainResult {
  isValid: boolean;
  totalLogs: number;
  message: string;
}

export async function queryLogs(params: {
  service?: string;
  errorOnly?: boolean;
}): Promise<LogQueryResult> {
  const query: Record<string, string> = {};
  if (params.service) query.service = params.service;
  if (params.errorOnly) query.errorOnly = 'true';
  const res = await api.get(`${BASE}/query`, { params: query });
  const body = res.data as { data?: LogEntry[]; total?: number };
  return { data: body.data ?? [], total: body.total ?? 0 };
}

export async function verifyChain(service: string): Promise<ChainResult> {
  const res = await api.post(`${BASE}/verify-chain`, {
    service,
    environment: import.meta.env.PROD ? 'production' : 'development',
  });
  return unwrap<ChainResult>(res.data);
}
