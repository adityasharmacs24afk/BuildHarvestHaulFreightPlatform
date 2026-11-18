import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { GeoNode, Pool, RoadEdge, Vehicle } from '@/types/domain';
import type { VillageDemandForecast } from '@/engine/forecast';

interface KolarNetworkMapProps {
  nodes: GeoNode[];
  edges: RoadEdge[];
  vehicles?: Vehicle[];
  pools?: Pool[];
  highlightedPool?: Pool | null;
  previousRouteNodeIds?: string[];
  requestPulseNodeIds?: string[];
  heatmapCells?: VillageDemandForecast[];
  selectedVehicleId?: string | null;
  onSelectVehicle?: (v: Vehicle) => void;
  onSelectNode?: (n: GeoNode) => void;
  heightClass?: string;
}

const MIN_LNG = 77.51;
const MAX_LNG = 78.55;
const MIN_LAT = 12.86;
const MAX_LAT = 13.44;

const SVG_W = 860;
const SVG_H = 500;

function projectCoord(lat: number, lng: number): { x: number; y: number } {
  const padX = 48;
  const padY = 42;
  const x = padX + ((lng - MIN_LNG) / (MAX_LNG - MIN_LNG)) * (SVG_W - padX * 2);
  const y = SVG_H - padY - ((lat - MIN_LAT) / (MAX_LAT - MIN_LAT)) * (SVG_H - padY * 2);
  return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
}

export function KolarNetworkMap({
  nodes,
  edges,
  vehicles = [],
  pools = [],
  highlightedPool = null,
  previousRouteNodeIds,
  requestPulseNodeIds = [],
  heatmapCells = [],
  selectedVehicleId = null,
  onSelectVehicle,
  onSelectNode,
  heightClass = 'h-[400px]',
}: KolarNetworkMapProps) {
  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const pulseSet = useMemo(() => new Set(requestPulseNodeIds), [requestPulseNodeIds]);

  const buildPolylinePoints = (ids: string[]) =>
    ids
      .map((id) => nodeMap.get(id))
      .filter((n): n is GeoNode => Boolean(n))
      .map((n) => {
        const { x, y } = projectCoord(n.lat, n.lng);
        return `${x},${y}`;
      })
      .join(' ');

  const outboundPoints = highlightedPool ? buildPolylinePoints(highlightedPool.routeNodeIds) : '';
  const returnPoints =
    highlightedPool && highlightedPool.returnRouteNodeIds.length > 1
      ? buildPolylinePoints(highlightedPool.returnRouteNodeIds)
      : '';
  const prevRoutePoints =
    previousRouteNodeIds && previousRouteNodeIds.length > 1
      ? buildPolylinePoints(previousRouteNodeIds)
      : '';

  return (
    <div className={`relative w-full overflow-hidden rounded-2xl border border-border bg-[#F2F8F4] ${heightClass}`}>
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className="h-full w-full select-none"
        role="img"
        aria-label="Kolar and Bengaluru rural freight network map"
      >
        <defs>
          <radialGradient id="heatGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#F6B93B" stopOpacity="0.52" />
            <stop offset="65%" stopColor="#3FA374" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#3FA374" stopOpacity="0" />
          </radialGradient>
          <pattern id="fieldGrid" width="36" height="36" patternUnits="userSpaceOnUse">
            <path d="M 36 0 L 0 0 0 36" fill="none" stroke="#E1EBE4" strokeWidth="0.7" opacity="0.6" />
          </pattern>
        </defs>

        {/* Soft agricultural terrain grid & contour patches */}
        <rect width={SVG_W} height={SVG_H} fill="url(#fieldGrid)" />
        <ellipse cx="470" cy="240" rx="260" ry="165" fill="#DDF1E6" opacity="0.35" />
        <ellipse cx="120" cy="390" rx="115" ry="85" fill="#E3F4FB" opacity="0.4" />

        {/* Demand Heatmap Cells */}
        {heatmapCells.map((cell) => {
          const { x, y } = projectCoord(cell.lat, cell.lng);
          const radius = 24 + cell.intensity * 36;
          return (
            <motion.g
              key={`heat_${cell.nodeId}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.95 }}
              transition={{ duration: 0.5 }}
            >
              <circle cx={x} cy={y} r={radius} fill="url(#heatGlow)" />
              {cell.moveHereRecommended && (
                <g transform={`translate(${x - 36}, ${y - 28})`}>
                  <rect width="72" height="18" rx="9" fill="#FFF1CF" stroke="#F6B93B" strokeWidth="1" />
                  <text x="36" y="12.5" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#1E2B25">
                    ₹{cell.expectedHourlyEarningsInr}/hr
                  </text>
                </g>
              )}
            </motion.g>
          );
        })}

        {/* Road Graph Edges */}
        {edges.map((e, idx) => {
          const na = nodeMap.get(e.from);
          const nb = nodeMap.get(e.to);
          if (!na || !nb) return null;
          const a = projectCoord(na.lat, na.lng);
          const b = projectCoord(nb.lat, nb.lng);
          return (
            <line
              key={`edge_${idx}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={e.roadClass === 'highway' ? '#C7DDD0' : '#D7E6DD'}
              strokeWidth={e.roadClass === 'highway' ? 3.2 : e.roadClass === 'state' ? 2.1 : 1.4}
              strokeLinecap="round"
            />
          );
        })}

        {/* Background Active Pool Routes */}
        {!highlightedPool &&
          pools
            .filter((p) => p.status === 'en_route' || p.status === 'confirmed')
            .map((p) => {
              const pts = buildPolylinePoints(p.routeNodeIds);
              return (
                <polyline
                  key={`bg_pool_${p.id}`}
                  points={pts}
                  fill="none"
                  stroke="#3FA374"
                  strokeWidth="3"
                  strokeOpacity="0.45"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              );
            })}

        {/* Previous Cancelled Route Diff (Coral Dashed) */}
        {prevRoutePoints && (
          <motion.polyline
            points={prevRoutePoints}
            fill="none"
            stroke="#EF8A6B"
            strokeWidth="3.2"
            strokeDasharray="7 6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.85 }}
          />
        )}

        {/* Highlighted Outbound Route (Green Animated Draw) */}
        {outboundPoints && (
          <motion.polyline
            key={`out_${outboundPoints}`}
            points={outboundPoints}
            fill="none"
            stroke="#3FA374"
            strokeWidth="4.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0.4 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.85, ease: 'easeOut' }}
          />
        )}

        {/* Highlighted Return Leg (Sky-Blue Animated Draw) */}
        {returnPoints && (
          <motion.polyline
            key={`ret_${returnPoints}`}
            points={returnPoints}
            fill="none"
            stroke="#7CC6E8"
            strokeWidth="3.8"
            strokeDasharray="9 5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0.4 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.9, delay: 0.25, ease: 'easeOut' }}
          />
        )}

        {/* Nodes (Villages, Mandis, Cold Stores, Factories, Input Dealers) */}
        {nodes.map((node) => {
          const { x, y } = projectCoord(node.lat, node.lng);
          const isMandi = node.kind === 'mandi';
          const isHub = node.kind === 'cold_chain' || node.kind === 'factory';
          const hasPulse = pulseSet.has(node.id);
          const showMajorLabel =
            isMandi ||
            isHub ||
            ['v_kolar', 'v_srinivaspur', 'v_mulbagal', 'v_malur', 'v_bangarapet', 'v_chintamani', 'v_vemgal', 'v_narasapura', 'v_kyalanur', 'v_nangli'].includes(node.id);

          return (
            <g
              key={node.id}
              transform={`translate(${x}, ${y})`}
              onClick={() => onSelectNode?.(node)}
              className={onSelectNode ? 'cursor-pointer' : ''}
            >
              {hasPulse && (
                <circle r="13" fill="none" stroke="#F6B93B" strokeWidth="2.2" className="pulse-ring" />
              )}
              {isMandi ? (
                <rect
                  x="-7"
                  y="-7"
                  width="14"
                  height="14"
                  rx="4"
                  fill="#F6B93B"
                  stroke="#1E2B25"
                  strokeWidth="1.4"
                />
              ) : isHub ? (
                <polygon
                  points="0,-7 7,5 -7,5"
                  fill="#7CC6E8"
                  stroke="#1E2B25"
                  strokeWidth="1.2"
                />
              ) : (
                <circle
                  r={node.kind === 'input_dealer' ? 4.8 : 4.2}
                  fill={node.kind === 'input_dealer' ? '#9B8AE6' : '#FFFFFF'}
                  stroke="#2A7F58"
                  strokeWidth="2"
                />
              )}
              {showMajorLabel && (
                <text
                  x="0"
                  y={isMandi ? -11 : 14}
                  textAnchor="middle"
                  fontSize={isMandi ? '10.5' : '9.5'}
                  fontWeight={isMandi ? '700' : '600'}
                  fill="#1E2B25"
                >
                  {node.name.replace('Bengaluru ', 'BLR ')}
                </text>
              )}
            </g>
          );
        })}

        {/* Gliding Vehicles with Heading Rotation */}
        {vehicles.map((veh) => {
          const { x, y } = projectCoord(veh.lat, veh.lng);
          const isSelected = selectedVehicleId === veh.id || highlightedPool?.vehicleId === veh.id;
          const fill =
            veh.status === 'standby'
              ? '#9B8AE6'
              : veh.status === 'en_route'
                ? '#2A7F58'
                : '#5C6F65';

          return (
            <g
              key={veh.id}
              transform={`translate(${x}, ${y})`}
              onClick={() => onSelectVehicle?.(veh)}
              className="cursor-pointer transition-transform duration-700 ease-linear"
            >
              {veh.status === 'en_route' && (
                <circle r="13" fill="#3FA374" opacity="0.18" />
              )}
              {isSelected && (
                <circle r="16" fill="none" stroke="#F6B93B" strokeWidth="2.5" />
              )}
              <g transform={`rotate(${veh.headingDeg})`}>
                <rect
                  x="-6"
                  y="-9"
                  width="12"
                  height="18"
                  rx="3.5"
                  fill={fill}
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                />
                <rect x="-4" y="-7" width="8" height="5" rx="1.5" fill="#FFF1CF" />
              </g>
            </g>
          );
        })}
      </svg>

      {/* Map Legend */}
      <div className="glass-panel absolute bottom-3 left-3 flex flex-wrap items-center gap-3 rounded-xl border border-border px-3 py-1.5 text-[11px] font-medium text-ink shadow-soft">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-primary-strong" /> Outbound Pool
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-sky" /> Filled Return Leg
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-accent" /> Mandi / Market
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-violet" /> Standby / Input Hub
        </span>
      </div>
    </div>
  );
}
