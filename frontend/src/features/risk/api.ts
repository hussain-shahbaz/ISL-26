import { api, unwrap } from '@/lib/api';

const BASE = '/modules/risk';

export interface CollusionPair {
  studentA: string;
  studentB: string;
  via: 'device' | 'network';
  shared: string;
}

export interface CollusionRing {
  members: string[];
  size: number;
  links: CollusionPair[];
}

export interface CollusionResult {
  rings: CollusionRing[];
  pairs: CollusionPair[];
  ringCount: number;
  pairCount: number;
}

export interface RiskOverview {
  students: number;
  devices: number;
  networks: number;
}

export async function getRiskOverview(): Promise<RiskOverview> {
  const res = await api.get(`${BASE}/overview`);
  return unwrap<RiskOverview>(res.data);
}

export async function getCollusion(examId?: string): Promise<CollusionResult> {
  const res = await api.get(`${BASE}/collusion`, { params: examId ? { examId } : undefined });
  return unwrap<CollusionResult>(res.data);
}

export interface GraphNode {
  id: string;
  label: string;
  type: 'student' | 'device' | 'network';
  shared?: boolean;
  degree?: number;
}

export interface GraphLink {
  source: string;
  target: string;
  via: 'device' | 'network';
}

export interface RiskGraph {
  nodes: GraphNode[];
  links: GraphLink[];
  counts: RiskOverview;
}

export async function getRiskGraph(examId?: string): Promise<RiskGraph> {
  const res = await api.get(`${BASE}/graph`, { params: examId ? { examId } : undefined });
  return unwrap<RiskGraph>(res.data);
}
