import type { GeoNode, RoadEdge } from '@/types/domain';

const EARTH_RADIUS_KM = 6371;

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

export function roadDistanceKm(nodeA: GeoNode, nodeB: GeoNode, circuity = 1.32): number {
  if (nodeA.id === nodeB.id) return 0;
  const straight = haversineKm(nodeA.lat, nodeA.lng, nodeB.lat, nodeB.lng);
  return Math.max(1.5, Math.round(straight * circuity * 10) / 10);
}

export function computeShortestPath(
  fromId: string,
  toId: string,
  nodes: GeoNode[],
  edges: RoadEdge[],
): { distanceKm: number; path: string[]; minutes: number } {
  if (fromId === toId) {
    return { distanceKm: 0, path: [fromId], minutes: 0 };
  }
  const adj = new Map<string, { to: string; km: number; mins: number }[]>();
  for (const n of nodes) adj.set(n.id, []);
  for (const e of edges) {
    adj.get(e.from)?.push({ to: e.to, km: e.distanceKm, mins: e.travelMinutes });
    adj.get(e.to)?.push({ to: e.from, km: e.distanceKm, mins: e.travelMinutes });
  }

  const dist = new Map<string, number>();
  const mins = new Map<string, number>();
  const prev = new Map<string, string>();
  const unvisited = new Set<string>(nodes.map((n) => n.id));

  for (const n of nodes) {
    dist.set(n.id, Infinity);
    mins.set(n.id, Infinity);
  }
  dist.set(fromId, 0);
  mins.set(fromId, 0);

  while (unvisited.size > 0) {
    let best: string | null = null;
    let bestD = Infinity;
    for (const id of unvisited) {
      const d = dist.get(id) ?? Infinity;
      if (d < bestD) {
        bestD = d;
        best = id;
      }
    }
    if (!best || bestD === Infinity) break;
    if (best === toId) break;
    unvisited.delete(best);

    for (const edge of adj.get(best) ?? []) {
      if (!unvisited.has(edge.to)) continue;
      const alt = bestD + edge.km;
      if (alt < (dist.get(edge.to) ?? Infinity)) {
        dist.set(edge.to, alt);
        mins.set(edge.to, (mins.get(best) ?? 0) + edge.mins);
        prev.set(edge.to, best);
      }
    }
  }

  const finalDist = dist.get(toId) ?? Infinity;
  if (finalDist === Infinity) {
    const a = nodes.find((n) => n.id === fromId);
    const b = nodes.find((n) => n.id === toId);
    const fallbackKm = a && b ? roadDistanceKm(a, b) : 18;
    return { distanceKm: fallbackKm, path: [fromId, toId], minutes: Math.round(fallbackKm * 1.8) };
  }

  const path: string[] = [];
  let cur: string | undefined = toId;
  while (cur) {
    path.unshift(cur);
    cur = prev.get(cur);
  }
  return {
    distanceKm: Math.round(finalDist * 10) / 10,
    path,
    minutes: Math.round(mins.get(toId) ?? finalDist * 1.7),
  };
}

export function interpolateAlongNodes(
  routeNodeIds: string[],
  progressPct: number,
  nodeMap: Map<string, GeoNode>,
): { lat: number; lng: number; headingDeg: number } {
  const coords = routeNodeIds
    .map((id) => nodeMap.get(id))
    .filter((n): n is GeoNode => Boolean(n));
  if (coords.length === 0) {
    return { lat: 13.136, lng: 78.129, headingDeg: 0 };
  }
  if (coords.length === 1) {
    return { lat: coords[0].lat, lng: coords[0].lng, headingDeg: 0 };
  }
  const clamped = Math.max(0, Math.min(100, progressPct)) / 100;
  const totalSegments = coords.length - 1;
  const rawIdx = clamped * totalSegments;
  const segIdx = Math.min(totalSegments - 1, Math.floor(rawIdx));
  const t = rawIdx - segIdx;
  const start = coords[segIdx];
  const end = coords[segIdx + 1];
  const lat = start.lat + (end.lat - start.lat) * t;
  const lng = start.lng + (end.lng - start.lng) * t;
  const dy = end.lat - start.lat;
  const dx = end.lng - start.lng;
  const headingDeg = ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360;
  return { lat, lng, headingDeg };
}
