import { api, unwrap } from '@/lib/api';

// Audit logs are read through the gateway (admin only) -> log service.
const BASE = '/modules/log';

export interface LogEntry {
  _id: string;
  service: string;
  eventType: 'REQUEST' | 'RESPONSE';
  environment?: string;
  requestId?: string;
  timestamp: string;
  request?: {
    method?: string;
    path?: string;
    url?: string;
    statusCode?: number;
    ip?: string;
    userId?: string;
    userAgent?: string;
    query?: Record<string, unknown>;
    body?: Record<string, unknown>;
  };
  response?: { statusCode?: number; responseTime?: number };
  error?: { message?: string; code?: string } | null;
  previousHash?: string;
  currentHash?: string;
}

export interface LogQueryParams {
  service?: string;
  eventType?: 'REQUEST' | 'RESPONSE';
  errorOnly?: boolean;
  statusCode?: number;
  search?: string;
  startTime?: string;
  endTime?: string;
  limit?: number;
  skip?: number;
}

export interface LogQueryResult {
  data: LogEntry[];
  total: number;
  limit: number;
  skip: number;
}

export interface ChainResult {
  isValid: boolean;
  totalLogs: number;
  message: string;
}

export async function queryLogs(params: LogQueryParams): Promise<LogQueryResult> {
  const query: Record<string, string> = {};
  if (params.service) query.service = params.service;
  if (params.eventType) query.eventType = params.eventType;
  if (params.errorOnly) query.errorOnly = 'true';
  if (params.statusCode) query.statusCode = String(params.statusCode);
  if (params.search) query.search = params.search;
  if (params.startTime) query.startTime = params.startTime;
  if (params.endTime) query.endTime = params.endTime;
  query.limit = String(params.limit ?? 25);
  query.skip = String(params.skip ?? 0);

  const res = await api.get(`${BASE}/query`, { params: query });
  const body = res.data as { data?: LogEntry[]; total?: number; limit?: number; skip?: number };
  return {
    data: body.data ?? [],
    total: body.total ?? 0,
    limit: body.limit ?? Number(query.limit),
    skip: body.skip ?? Number(query.skip),
  };
}

export async function verifyChain(service: string): Promise<ChainResult> {
  const res = await api.post(`${BASE}/verify-chain`, {
    service,
    environment: import.meta.env.PROD ? 'production' : 'development',
  });
  return unwrap<ChainResult>(res.data);
}
