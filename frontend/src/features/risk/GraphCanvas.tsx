import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { GraphNode, GraphLink } from './api';

/**
 * Dependency-free, interactive force-directed graph.
 *
 * Renders the Neo4j integrity graph (students ↔ shared devices/networks) as an
 * SVG node-link diagram with a lightweight Barnes-Hut-free force simulation:
 * pairwise repulsion + link springs + centering, integrated with velocity and
 * damping. Supports node dragging, hover highlighting, and wheel zoom / pan so
 * teachers can explore collusion clusters directly in-app.
 */

type SimNode = {
  id: string;
  label: string;
  type: GraphNode['type'];
  shared: boolean;
  degree: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  // Pinned position while dragging (null = free).
  fx: number | null;
  fy: number | null;
};

type SimLink = { source: SimNode; target: SimNode; via: GraphLink['via'] };

const WIDTH = 880;
const HEIGHT = 560;

const TYPE_COLOR: Record<GraphNode['type'], string> = {
  student: 'var(--brand)',
  device: 'var(--proctor)',
  network: 'var(--exam)',
};

const TYPE_RADIUS: Record<GraphNode['type'], number> = {
  student: 9,
  device: 7,
  network: 7,
};

function shortLabel(node: SimNode): string {
  if (node.type === 'student') return node.label;
  // Devices are long fingerprints; networks are IPs. Trim fingerprints.
  return node.label.length > 12 ? `${node.label.slice(0, 8)}…` : node.label;
}

export function GraphCanvas({ nodes, links }: { nodes: GraphNode[]; links: GraphLink[] }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const alphaRef = useRef(1);
  const dragRef = useRef<{ id: string; ox: number; oy: number } | null>(null);
  const panRef = useRef<{ x: number; y: number } | null>(null);

  const [, force] = useState(0); // re-render tick driven by the sim loop
  const [hovered, setHovered] = useState<string | null>(null);
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });

  // Build simulation nodes/links once per data change. Positions seeded on a
  // circle so the layout unfolds deterministically rather than from chaos.
  const { simNodes, simLinks, adjacency } = useMemo(() => {
    const map = new Map<string, SimNode>();
    nodes.forEach((n, i) => {
      const angle = (i / Math.max(1, nodes.length)) * Math.PI * 2;
      const r = 160 + (i % 5) * 18;
      map.set(n.id, {
        id: n.id,
        label: n.label,
        type: n.type,
        shared: Boolean(n.shared),
        degree: n.degree ?? 0,
        x: WIDTH / 2 + Math.cos(angle) * r,
        y: HEIGHT / 2 + Math.sin(angle) * r,
        vx: 0,
        vy: 0,
        fx: null,
        fy: null,
      });
    });

    const sLinks: SimLink[] = [];
    const adj = new Map<string, Set<string>>();
    for (const l of links) {
      const s = map.get(l.source);
      const t = map.get(l.target);
      if (!s || !t) continue;
      sLinks.push({ source: s, target: t, via: l.via });
      if (!adj.has(s.id)) adj.set(s.id, new Set());
      if (!adj.has(t.id)) adj.set(t.id, new Set());
      adj.get(s.id)!.add(t.id);
      adj.get(t.id)!.add(s.id);
    }
    return { simNodes: [...map.values()], simLinks: sLinks, adjacency: adj };
  }, [nodes, links]);

  // The simulation loop. Runs while alpha is meaningful; reheated on drag.
  useEffect(() => {
    alphaRef.current = 1;
    const linkDist = 90;
    const charge = -260;

    function tick() {
      const alpha = alphaRef.current;
      const dragging = !!dragRef.current;

      // Idle: nothing to integrate and no re-render. The rAF keeps ticking so a
      // later drag/reheat resumes physics without re-creating the loop.
      if (alpha <= 0.005 && !dragging) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const n = simNodes.length;

      // Pairwise repulsion (O(n²) — fine for class-sized cohorts).
      for (let i = 0; i < n; i++) {
        const a = simNodes[i];
        for (let j = i + 1; j < n; j++) {
          const b = simNodes[j];
          let dx = a.x - b.x;
          let dy = a.y - b.y;
          let dist2 = dx * dx + dy * dy;
          if (dist2 < 0.01) {
            dx = (Math.random() - 0.5) * 0.1;
            dy = (Math.random() - 0.5) * 0.1;
            dist2 = dx * dx + dy * dy;
          }
          const dist = Math.sqrt(dist2);
          const f = (charge * alpha) / dist2;
          const fx = (dx / dist) * f;
          const fy = (dy / dist) * f;
          a.vx -= fx;
          a.vy -= fy;
          b.vx += fx;
          b.vy += fy;
        }
      }

      // Link springs.
      for (const l of simLinks) {
        const dx = l.target.x - l.source.x;
        const dy = l.target.y - l.source.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const f = ((dist - linkDist) / dist) * alpha * 0.5;
        const fx = dx * f;
        const fy = dy * f;
        l.source.vx += fx;
        l.source.vy += fy;
        l.target.vx -= fx;
        l.target.vy -= fy;
      }

      // Gentle centering + integrate with damping.
      for (const node of simNodes) {
        node.vx += (WIDTH / 2 - node.x) * alpha * 0.012;
        node.vy += (HEIGHT / 2 - node.y) * alpha * 0.012;
        if (node.fx != null) {
          node.x = node.fx;
          node.y = node.fy as number;
          node.vx = 0;
          node.vy = 0;
        } else {
          node.vx *= 0.82;
          node.vy *= 0.82;
          node.x += node.vx;
          node.y += node.vy;
        }
      }

      alphaRef.current = Math.max(0, alpha - 0.012);
      force((t) => t + 1);
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simNodes, simLinks]);

  // The rAF loop always runs; bumping alpha makes the next frame do physics.
  function reheat() {
    alphaRef.current = Math.max(alphaRef.current, 0.4);
  }

  // Convert a pointer event to SVG/world coordinates (accounting for zoom/pan).
  function toWorld(e: React.PointerEvent | PointerEvent) {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * WIDTH;
    const py = ((e.clientY - rect.top) / rect.height) * HEIGHT;
    return { x: (px - view.x) / view.k, y: (py - view.y) / view.k };
  }

  function onNodePointerDown(e: React.PointerEvent, node: SimNode) {
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const w = toWorld(e);
    dragRef.current = { id: node.id, ox: node.x - w.x, oy: node.y - w.y };
    node.fx = node.x;
    node.fy = node.y;
    reheat();
  }

  function onPointerMove(e: React.PointerEvent) {
    if (dragRef.current) {
      const node = simNodes.find((d) => d.id === dragRef.current!.id);
      if (node) {
        const w = toWorld(e);
        node.fx = w.x + dragRef.current.ox;
        node.fy = w.y + dragRef.current.oy;
      }
      reheat();
    } else if (panRef.current) {
      const rect = svgRef.current!.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * WIDTH;
      const py = ((e.clientY - rect.top) / rect.height) * HEIGHT;
      setView((v) => ({ ...v, x: px - panRef.current!.x, y: py - panRef.current!.y }));
    }
  }

  function endDrag() {
    if (dragRef.current) {
      const node = simNodes.find((d) => d.id === dragRef.current!.id);
      if (node) {
        node.fx = null;
        node.fy = null;
      }
    }
    dragRef.current = null;
    panRef.current = null;
  }

  function onBgPointerDown(e: React.PointerEvent) {
    const rect = svgRef.current!.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * WIDTH;
    const py = ((e.clientY - rect.top) / rect.height) * HEIGHT;
    panRef.current = { x: px - view.x, y: py - view.y };
  }

  function onWheel(e: React.WheelEvent) {
    const delta = -e.deltaY * 0.0012;
    setView((v) => {
      const k = Math.min(3, Math.max(0.35, v.k * (1 + delta)));
      const rect = svgRef.current!.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * WIDTH;
      const py = ((e.clientY - rect.top) / rect.height) * HEIGHT;
      // Zoom toward the cursor.
      const wx = (px - v.x) / v.k;
      const wy = (py - v.y) / v.k;
      return { k, x: px - wx * k, y: py - wy * k };
    });
  }

  const neighbors = hovered ? adjacency.get(hovered) ?? new Set<string>() : null;
  const isActive = (id: string) => !hovered || id === hovered || (neighbors?.has(id) ?? false);
  const hoveredNode = hovered ? simNodes.find((d) => d.id === hovered) : null;

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-[color-mix(in_oklab,var(--surface)_60%,var(--background))]">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-[clamp(360px,52vh,560px)] w-full cursor-grab touch-none select-none active:cursor-grabbing"
        onPointerDown={onBgPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onWheel={onWheel}
      >
        <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
          {simLinks.map((l, i) => {
            const active = isActive(l.source.id) && isActive(l.target.id);
            const shared = l.target.shared;
            return (
              <line
                key={i}
                x1={l.source.x}
                y1={l.source.y}
                x2={l.target.x}
                y2={l.target.y}
                stroke={shared ? 'var(--risk)' : 'var(--border)'}
                strokeWidth={shared ? 1.6 : 1}
                strokeOpacity={active ? (shared ? 0.7 : 0.4) : 0.08}
              />
            );
          })}

          {simNodes.map((node) => {
            const active = isActive(node.id);
            const r = TYPE_RADIUS[node.type] + (node.shared ? 2 : 0);
            return (
              <g
                key={node.id}
                transform={`translate(${node.x} ${node.y})`}
                opacity={active ? 1 : 0.18}
                style={{ cursor: 'pointer' }}
                onPointerDown={(e) => onNodePointerDown(e, node)}
                onPointerEnter={() => setHovered(node.id)}
                onPointerLeave={() => setHovered(null)}
              >
                {node.shared && (
                  <circle r={r + 4} fill="none" stroke="var(--risk)" strokeWidth={1.5} strokeOpacity={0.55} />
                )}
                <circle
                  r={r}
                  fill={node.shared ? 'var(--risk)' : TYPE_COLOR[node.type]}
                  stroke="var(--background)"
                  strokeWidth={1.5}
                />
                {(node.type === 'student' || node.shared || hovered === node.id) && (
                  <text
                    y={-r - 5}
                    textAnchor="middle"
                    className="pointer-events-none fill-[var(--foreground)] font-mono"
                    style={{ fontSize: 9 / Math.max(0.7, view.k) }}
                  >
                    {shortLabel(node)}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Legend */}
      <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-3 rounded-lg border border-border bg-background/80 px-3 py-2 text-[11px] backdrop-blur">
        <LegendDot color="var(--brand)" label="Student" />
        <LegendDot color="var(--proctor)" label="Device" />
        <LegendDot color="var(--exam)" label="Network" />
        <LegendDot color="var(--risk)" label="Shared (collusion)" ring />
      </div>

      {/* Hover detail */}
      {hoveredNode && (
        <div className="pointer-events-none absolute bottom-3 left-3 max-w-[60%] rounded-lg border border-border bg-background/90 px-3 py-2 text-xs backdrop-blur">
          <span className="font-medium capitalize">{hoveredNode.type}</span>
          <span className="mx-1.5 text-muted">·</span>
          <span className="font-mono break-all">{hoveredNode.label}</span>
          {hoveredNode.type !== 'student' && hoveredNode.degree > 1 && (
            <span className="ml-2 text-risk">shared by {hoveredNode.degree} students</span>
          )}
        </div>
      )}

      <div className="pointer-events-none absolute bottom-3 right-3 rounded-lg border border-border bg-background/80 px-2.5 py-1 text-[10px] text-muted backdrop-blur">
        drag nodes · scroll to zoom · drag background to pan
      </div>
    </div>
  );
}

function LegendDot({ color, label, ring }: { color: string; label: string; ring?: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className={cn('inline-block h-2.5 w-2.5 rounded-full', ring && 'ring-2 ring-offset-1 ring-offset-background')}
        style={{ background: color, ...(ring ? { boxShadow: `0 0 0 1.5px ${color}` } : {}) }}
      />
      <span className="text-muted">{label}</span>
    </span>
  );
}
