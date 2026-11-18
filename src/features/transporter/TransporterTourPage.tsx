import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ClipboardCheck,
  GripVertical,
  Navigation,
} from 'lucide-react';
import { KolarNetworkMap } from '@/components/map/KolarNetworkMap';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { CARGO_CATALOG } from '@/engine/compatibility';
import { useAppStore } from '@/stores/useAppStore';

const CHECKLIST_STEPS = [
  { title: 'Arrive at Village Gate', detail: 'GPS geofence verified within 150m of collection point' },
  { title: 'Inspect Crate Freshness Photo', detail: 'Confirm clean ventilated crates; zero chemical contamination' },
  { title: 'Portable Spring / Axle Weighment', detail: 'Verify loaded quintals match +/- 2% booking weight' },
  { title: 'Stack in LIFO Sequence', detail: 'Load furthest mandi crates at front; first-drop crates at tailgate' },
  { title: 'Secure Tarpaulin & Depart', detail: 'Live ETA shared automatically with shippers & mandi bay' },
  { title: 'Deliver & Collect Weighbridge Slip', detail: 'Triggers instant escrow release to your HarvestHaul wallet' },
];

const CANCEL_REASONS = [
  'Flat tyre / puncture on rural stretch',
  'Clutch or radiator issue',
  'Urgent family commitment',
];

export function TransporterTourPage() {
  const nodes = useAppStore((s) => s.nodes);
  const edges = useAppStore((s) => s.edges);
  const vehicles = useAppStore((s) => s.vehicles);
  const pools = useAppStore((s) => s.pools);
  const reorderPoolStops = useAppStore((s) => s.reorderPoolStops);
  const advanceTripChecklist = useAppStore((s) => s.advanceTripChecklist);
  const triggerNetworkEvent = useAppStore((s) => s.triggerNetworkEvent);

  const activePools = pools.filter((p) => p.status === 'confirmed' || p.status === 'en_route' || p.status === 'completed');
  const [selectedPoolId, setSelectedPoolId] = useState(activePools[0]?.id ?? pools[0].id);
  const pool = pools.find((p) => p.id === selectedPoolId) ?? pools[0];

  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [elapsedSec, setElapsedSec] = useState(142);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState(CANCEL_REASONS[0]);

  useEffect(() => {
    const id = window.setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const pickups = pool.stops.filter((s) => s.kind === 'pickup');

  const handleDriverCancel = async () => {
    await triggerNetworkEvent('transporter_cancel', pool.id, cancelReason);
    setCancelModalOpen(false);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-100 px-3 py-1 text-xs font-bold text-primary-strong">
            <Navigation className="h-3.5 w-3.5" /> Round-Trip Tour Planner & Execution
          </span>
          <h1 className="mt-1.5 text-2xl font-extrabold text-ink">
            Tour {pool.code} • Outbound (Green) + Return Leg (Sky Blue)
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <select
            aria-label="Select active tour"
            value={pool.id}
            onChange={(e) => setSelectedPoolId(e.target.value)}
            className="min-h-[42px] rounded-xl border border-border bg-surface px-3.5 text-xs font-bold text-ink"
          >
            {activePools.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} ({p.vehiclePlate} • ₹{p.transporterEarningsInr})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setCancelModalOpen(true)}
            className="min-h-[42px] rounded-xl border border-coral/60 bg-coral-100/60 px-3.5 text-xs font-bold text-ink hover:bg-coral-100"
          >
            Report Breakdown / Cancel
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Tour Map + Drag-to-Reorder Stops */}
        <div className="space-y-5 lg:col-span-7">
          <KolarNetworkMap
            nodes={nodes}
            edges={edges}
            vehicles={vehicles.filter((v) => v.id === pool.vehicleId)}
            highlightedPool={pool}
            heightClass="h-[360px]"
          />

          <div className="rounded-3xl border border-border bg-surface p-5 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-extrabold text-ink">
                  Pickup Stop Order (Drag or tap arrows to reorder live)
                </h2>
                <p className="text-xs text-ink-muted">
                  Outbound km, LIFO stacking sequence, and net tour earnings recalculate immediately.
                </p>
              </div>
              <div className="text-right">
                <span className="font-heading text-2xl font-extrabold text-primary-strong">
                  <AnimatedNumber value={pool.transporterEarningsInr} prefix="₹" />
                </span>
                <div className="text-[11px] font-semibold text-ink-muted">
                  {pool.outboundKm} km out • {pool.returnKm} km return
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {pickups.map((stop, idx) => (
                <div
                  key={stop.loadId}
                  draggable
                  onDragStart={() => setDragIdx(idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragIdx !== null && dragIdx !== idx) {
                      reorderPoolStops(pool.id, dragIdx, idx);
                    }
                    setDragIdx(null);
                  }}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface-2/70 p-3 cursor-grab active:cursor-grabbing"
                >
                  <div className="flex items-center gap-2.5">
                    <GripVertical className="h-4 w-4 text-ink-muted" />
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-xs font-extrabold text-white">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="text-xs font-extrabold text-ink">
                        {stop.villageName} — {stop.shipperFirstName}
                      </div>
                      <div className="text-[11px] text-ink-muted">
                        {stop.weightQuintals} qtl {CARGO_CATALOG[stop.crop].labelEn} • LIFO Deck #{stop.lifoSequence}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      aria-label="Move stop earlier"
                      onClick={() => reorderPoolStops(pool.id, idx, idx - 1)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface disabled:opacity-40"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === pickups.length - 1}
                      aria-label="Move stop later"
                      onClick={() => reorderPoolStops(pool.id, idx, idx + 1)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface disabled:opacity-40"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Interactive 6-Step Trip Execution Checklist */}
        <div className="rounded-3xl border border-border bg-surface p-5 shadow-soft lg:col-span-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-primary-strong" />
              <h2 className="text-base font-extrabold text-ink">Trip Execution Checklist</h2>
            </div>
            <span className="rounded-full bg-surface-2 px-3 py-1 font-mono text-xs font-bold text-ink">
              {Math.floor(elapsedSec / 60)}m {String(elapsedSec % 60).padStart(2, '0')}s
            </span>
          </div>
          <p className="mt-1 text-xs text-ink-muted">
            Complete each step to update shipper live ETAs and unlock instant delivery payout:
          </p>

          <div className="mt-4 space-y-2.5">
            {CHECKLIST_STEPS.map((st, idx) => {
              const done = idx < pool.checklistStep;
              const current = idx === pool.checklistStep;
              return (
                <div
                  key={st.title}
                  className={`rounded-2xl border p-3.5 transition-all ${
                    done
                      ? 'border-primary/40 bg-primary-100/50'
                      : current
                        ? 'border-accent bg-accent-100/50 shadow-soft'
                        : 'border-border bg-bg opacity-75'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-ink">
                      {idx + 1}. {st.title}
                    </span>
                    {done && <CheckCircle2 className="h-4 w-4 text-primary-strong" />}
                  </div>
                  <p className="mt-1 text-[11px] text-ink-muted">{st.detail}</p>
                  {current && (
                    <button
                      type="button"
                      onClick={() => advanceTripChecklist(pool.id)}
                      className="mt-2.5 inline-flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-4 text-xs font-extrabold text-white hover:bg-primary-strong"
                    >
                      <CheckCircle2 className="h-4 w-4" /> Mark Step Complete
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Driver Cancellation / Standby Handover Sheet */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="w-full max-w-md rounded-3xl border border-border bg-surface p-6 shadow-elevated">
            <div className="flex items-center gap-2 text-coral">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="text-lg font-extrabold text-ink">Hand Over Tour to Standby</h3>
            </div>
            <p className="mt-1 text-xs text-ink-muted">
              Only Pool {pool.code} will be reassigned to a nearby opted-in standby vehicle. No cash fine is ever charged — completing 5 consecutive tours restores your Gold Streak bonus (+₹250).
            </p>

            <div className="mt-4 space-y-2">
              {CANCEL_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setCancelReason(r)}
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-left text-xs font-semibold ${
                    cancelReason === r
                      ? 'border-coral bg-coral-100/60 text-ink'
                      : 'border-border bg-surface-2 text-ink-muted'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                className="min-h-[44px] rounded-xl border border-border px-4 text-xs font-bold text-ink-muted"
              >
                Keep Driving
              </button>
              <button
                type="button"
                onClick={handleDriverCancel}
                className="min-h-[44px] flex-1 rounded-xl bg-coral text-xs font-extrabold text-white"
              >
                Activate Standby Replacement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
