import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Network, Users, MonitorSmartphone, ShieldAlert, Workflow } from 'lucide-react';
import { getRiskOverview, getCollusion, getRiskGraph, type CollusionRing } from '@/features/risk/api';
import { PageHeader, StatCard, EmptyState, ErrorState, Skeleton } from '@/components/app/widgets';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GraphCanvas } from '@/features/risk/GraphCanvas';

export default function RiskPage() {
  const overview = useQuery({ queryKey: ['risk-overview'], queryFn: getRiskOverview });
  const collusion = useQuery({ queryKey: ['risk-collusion'], queryFn: () => getCollusion() });
  const graph = useQuery({ queryKey: ['risk-graph'], queryFn: () => getRiskGraph() });

  const unavailable = overview.isError || collusion.isError;

  return (
    <div>
      <PageHeader
        title="Integrity graph"
        description="Neo4j-powered collusion detection across shared devices and networks."
      />

      {unavailable ? (
        <ErrorState message="Risk service unreachable. Start Neo4j and the risk-service to enable graph analytics." />
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <StatCard label="Students tracked" value={overview.data?.students ?? '—'} icon={Users} accent="brand" />
            <StatCard label="Devices" value={overview.data?.devices ?? '—'} icon={MonitorSmartphone} accent="proctor" delay={0.05} />
            <StatCard label="Networks" value={overview.data?.networks ?? '—'} icon={Network} accent="exam" delay={0.1} />
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network size={18} className="text-brand" /> Integrity network
                {graph.data && (
                  <Badge tone="brand">
                    {graph.data.nodes.length} nodes · {graph.data.links.length} edges
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {graph.isLoading ? (
                <Skeleton className="h-[420px]" />
              ) : !graph.data || graph.data.nodes.length === 0 ? (
                <EmptyState
                  title="No graph data yet"
                  description="Once students log in and submit, their device and network links appear here."
                  icon={Network}
                />
              ) : (
                <GraphCanvas nodes={graph.data.nodes} links={graph.data.links} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Workflow size={18} className="text-risk" /> Collusion rings
                {collusion.data && (
                  <Badge tone={collusion.data.ringCount > 0 ? 'risk' : 'integrity'}>
                    {collusion.data.ringCount} found
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {collusion.isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-20" />
                  ))}
                </div>
              ) : !collusion.data || collusion.data.rings.length === 0 ? (
                <EmptyState
                  title="No collusion detected"
                  description="No two students share a device or network. The cohort looks clean."
                  icon={ShieldAlert}
                />
              ) : (
                <div className="space-y-3">
                  {collusion.data.rings.map((ring, i) => (
                    <RingCard key={i} ring={ring} index={i} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function RingCard({ ring, index }: { ring: CollusionRing; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
      className="rounded-xl border border-risk/30 bg-[color-mix(in_oklab,var(--risk)_6%,transparent)] p-4"
    >
      <div className="flex items-center justify-between">
        <span className="font-medium">Ring #{index + 1}</span>
        <Badge tone="risk">{ring.size} students</Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {ring.members.map((m) => (
          <span key={m} className="rounded-lg border border-border bg-surface px-2.5 py-1 font-mono text-xs">
            {m}
          </span>
        ))}
      </div>
      <ul className="mt-3 space-y-1 text-xs text-muted">
        {ring.links.map((link, i) => (
          <li key={i} className="flex items-center gap-2">
            {link.via === 'device' ? <MonitorSmartphone size={12} /> : <Network size={12} />}
            <span className="font-mono">{link.studentA}</span> ↔ <span className="font-mono">{link.studentB}</span>
            <span className="text-foreground/50">via {link.via}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}
