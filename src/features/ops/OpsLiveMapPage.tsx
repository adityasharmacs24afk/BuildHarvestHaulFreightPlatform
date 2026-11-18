import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  Clock,
  CloudRain,
  Pause,
  Play,
  Search,
  TrendingUp,
  Truck,
  Wrench,
  Zap,
} from 'lucide-react';
import { KolarNetworkMap } from '@/components/map/KolarNetworkMap';
import { useAppStore } from '@/stores/useAppStore';
import type { SelfHealRecord, Vehicle } from '@/types/domain';

export function OpsLiveMapPage() {
  const nodes = useAppStore((s) => s.nodes);
  const edges = useAppStore((s) => s.edges);
  const vehicles = useAppStore((s) => s.vehicles);
  const pools = useAppStore((s) => s.pools);
  const loads = useAppStore((s) => s.loads);
  const transporters = useAppStore((s) => s.transporters);
  const simulationPaused = useAppStore((s) => s.simulationPaused);
  const setSimulationPaused = useAppStore((s) => s.setSimulationPaused);
  const triggerNetworkEvent = useAppStore((s) => s.triggerNetworkEvent);

  const [statusFilter, setStatusFilter] = useState<'all' | 'en_route' | 'standby' | 'idle'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(vehicles[1]);
  const [playbackHourOffset, setPlaybackHourOffset] = useState(0); // -24 .. 0
  const [replanning, setReplanning] = useState(false);

  const filteredVehicles = useMemo(() => {
    return vehicles
      .filter((v) => {
        if (statusFilter !== 'all' && v.status !== statusFilter) return false;
        if (
          searchQuery.trim() &&
          !v.plate.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !v.typeName.toLowerCase().includes(searchQuery.toLowerCase())
        ) {
          return false;
        }
        return true;
      })
      .map((v, idx) => {
        if (playbackHourOffset === 0) return v;
        // Deterministic 24-hour historical playback position offset
        const phase = (playbackHourOffset * 0.35 + idx) * 0.4;
        return {
          ...v,
          lat: v.lat + Math.sin(phase) * 0.025,
          lng: v.lng + Math.cos(phase) * 0.025,
        };
      });
  }, [vehicles, statusFilter, searchQuery, playbackHourOffset]);

  const pendingPulseNodes = useMemo(
    () => loads.filter((l) => l.status === 'requested').map((l) => l.pickupNodeId),
    [loads],
  );

  const handleTrigger = async (kind: SelfHealRecord['triggerType']) => {
    setReplanning(true);
    await triggerNetworkEvent(kind);
    setReplanning(false);
  };

  const selectedOwner = selectedVehicle
    ? transporters.find((t) => t.id === selectedVehicle.transporterId)
    : null;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      {/* Event Trigger Panel */}
      <div className="rounded-3xl border border-border bg-surface p-5 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary-strong">
              <Zap className="h-3.5 w-3.5" /> Live Network Stress & Self-Healing Trigger Bar
            </span>
            <h1 className="mt-0.5 text-xl font-extrabold text-ink">
              Operations Control Tower — Kolar & Bengaluru Corridors
            </h1>
          </div>
          {replanning && (
            <div className="inline-flex items-center gap-2 rounded-full bg-coral-100 px-3.5 py-1.5 text-xs font-extrabold text-ink">
              <Activity className="h-4 w-4 animate-pulse text-coral" />
              <span>Minimal-Change Solver Re-Planning Affected Pool...</span>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2.5">
          {[
            { id: 'transporter_cancel', label: 'Transporter Cancellation', icon: AlertTriangle, cls: 'border-coral/50 bg-coral-100/60 hover:bg-coral-100' },
            { id: 'breakdown', label: 'Vehicle Breakdown', icon: Wrench, cls: 'border-accent bg-accent-100/70 hover:bg-accent-100' },
            { id: 'rain_spike', label: 'Rain Spike (28 mm)', icon: CloudRain, cls: 'border-sky bg-sky-100/80 hover:bg-sky-100' },
            { id: 'late_load', label: 'Late-Arriving Load', icon: Clock, cls: 'border-primary/40 bg-primary-100/60 hover:bg-primary-100' },
            { id: 'harvest_surge', label: 'Harvest Surge (+34%)', icon: TrendingUp, cls: 'border-violet/40 bg-violet-100/70 hover:bg-violet-100' },
          ].map((btn) => {
            const Icon = btn.icon;
            return (
              <button
                key={btn.id}
                type="button"
                disabled={replanning}
                onClick={() => handleTrigger(btn.id as SelfHealRecord['triggerType'])}
                className={`inline-flex min-h-[42px] items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-extrabold text-ink transition-transform active:scale-95 ${btn.cls}`}
              >
                <Icon className="h-4 w-4" />
                <span>{btn.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter Strip + 24h Playback Timeline */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-3.5 shadow-soft">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-ink-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search vehicle plate or model"
              className="min-h-[38px] rounded-xl border border-border bg-surface-2 pl-9 pr-3 text-xs font-semibold text-ink"
            />
          </div>
          {(['all', 'en_route', 'standby', 'idle'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`min-h-[38px] rounded-xl px-3 text-xs font-bold uppercase ${
                statusFilter === st ? 'bg-ink text-white' : 'bg-surface-2 text-ink-muted hover:text-ink'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSimulationPaused(!simulationPaused)}
            className="inline-flex min-h-[38px] items-center gap-1 rounded-xl border border-border bg-surface px-3 text-xs font-bold text-ink"
          >
            {simulationPaused ? <Play className="h-3.5 w-3.5 text-primary" /> : <Pause className="h-3.5 w-3.5" />}
            <span>{simulationPaused ? 'Resume Live Sim' : 'Live Ticking'}</span>
          </button>
        </div>

        {/* 24h Playback Scrubber */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-ink-muted">
            24h Replay: {playbackHourOffset === 0 ? 'LIVE NOW' : `${playbackHourOffset}h ago`}
          </span>
          <input
            type="range"
            min={-24}
            max={0}
            step={1}
            value={playbackHourOffset}
            onChange={(e) => setPlaybackHourOffset(Number(e.target.value))}
            aria-label="24-hour playback scrubber"
            className="w-36 accent-primary"
          />
        </div>
      </div>

      {/* Map + Vehicle Detail Drawer */}
      <div className="grid gap-6 lg:grid-cols-12">
        <motion.div
          animate={replanning ? { x: [-4, 4, -3, 3, 0] } : {}}
          transition={{ duration: 0.35 }}
          className="lg:col-span-8"
        >
          <KolarNetworkMap
            nodes={nodes}
            edges={edges}
            vehicles={filteredVehicles}
            pools={pools}
            requestPulseNodeIds={pendingPulseNodes}
            selectedVehicleId={selectedVehicle?.id}
            onSelectVehicle={(v) => setSelectedVehicle(v)}
            heightClass="h-[460px]"
          />
        </motion.div>

        <div className="rounded-3xl border border-border bg-surface p-5 shadow-soft lg:col-span-4">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary-strong" />
            <h2 className="text-base font-extrabold text-ink">Vehicle & Pool Telemetry Drawer</h2>
          </div>

          {selectedVehicle ? (
            <div className="mt-4 space-y-3 text-xs">
              <div className="rounded-2xl bg-surface-2 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-heading text-lg font-extrabold text-ink">
                    {selectedVehicle.plate}
                  </span>
                  <span className="rounded-full bg-primary-100 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-primary-strong">
                    {selectedVehicle.status}
                  </span>
                </div>
                <div className="mt-1 font-semibold text-ink-muted">{selectedVehicle.typeName}</div>
                <div className="mt-2 grid grid-cols-2 gap-2 border-t border-border pt-2">
                  <div>
                    <span className="text-ink-muted">Capacity</span>
                    <div className="font-bold text-ink">{selectedVehicle.capacityQuintals} quintals</div>
                  </div>
                  <div>
                    <span className="text-ink-muted">Running Cost</span>
                    <div className="font-bold text-ink">₹{selectedVehicle.costPerKmInr}/km</div>
                  </div>
                  <div>
                    <span className="text-ink-muted">Owner</span>
                    <div className="font-bold text-ink">{selectedOwner?.name ?? 'Verified Operator'}</div>
                  </div>
                  <div>
                    <span className="text-ink-muted">Standby Shield</span>
                    <div className="font-bold text-primary-strong">
                      {selectedVehicle.standbyOptIn ? 'Active (₹350)' : 'Standard'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="font-bold uppercase tracking-wider text-[11px] text-ink-muted">
                  Active Network Pools ({pools.length})
                </div>
                <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                  {pools.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => {
                        const v = vehicles.find((x) => x.id === p.vehicleId);
                        if (v) setSelectedVehicle(v);
                      }}
                      className="cursor-pointer rounded-xl border border-border bg-bg p-2.5 hover:border-primary"
                    >
                      <div className="flex justify-between font-bold text-ink">
                        <span>{p.code} • {p.vehiclePlate}</span>
                        <span className="text-primary-strong">{p.fillPct}% full</span>
                      </div>
                      <div className="text-[11px] text-ink-muted">
                        {p.loadIds.length} loads • ₹{p.tourCostInr} net tour • Risk {p.cancellationRiskPct}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
