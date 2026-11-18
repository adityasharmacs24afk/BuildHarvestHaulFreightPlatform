import { useState } from 'react';
import { CheckCircle2, RefreshCw, ShieldAlert, Zap } from 'lucide-react';
import { KolarNetworkMap } from '@/components/map/KolarNetworkMap';
import { useAppStore } from '@/stores/useAppStore';

export function OpsSelfHealingPage() {
  const nodes = useAppStore((s) => s.nodes);
  const edges = useAppStore((s) => s.edges);
  const vehicles = useAppStore((s) => s.vehicles);
  const pools = useAppStore((s) => s.pools);
  const selfHealHistory = useAppStore((s) => s.selfHealHistory);
  const triggerNetworkEvent = useAppStore((s) => s.triggerNetworkEvent);

  const [selectedHealIdx, setSelectedHealIdx] = useState(0);
  const [running, setRunning] = useState(false);

  const activeRecord = selfHealHistory[selectedHealIdx] ?? selfHealHistory[0];
  const healedPool = pools.find((p) => p.id === activeRecord?.poolId) ?? pools[1];

  const handleSimulateLiveCancellation = async () => {
    setRunning(true);
    await triggerNetworkEvent('transporter_cancel', pools[0].id);
    setSelectedHealIdx(0);
    setRunning(false);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-coral-100 px-3 py-1 text-xs font-bold text-ink">
            <RefreshCw className="h-3.5 w-3.5 text-coral" /> Minimal-Change Self-Healing Recovery
          </span>
          <h1 className="mt-1.5 text-2xl font-extrabold text-ink">
            Before & After Route Diff — Standby Takeover Trail
          </h1>
        </div>
        <button
          type="button"
          disabled={running}
          onClick={handleSimulateLiveCancellation}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-coral px-5 py-2.5 text-xs font-extrabold text-white shadow-soft"
        >
          <Zap className="h-4 w-4" />
          <span>{running ? 'Healing Pool...' : 'Trigger Live Cancellation & Watch Heal'}</span>
        </button>
      </div>

      {activeRecord && (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Map Diff View */}
          <div className="space-y-4 lg:col-span-7">
            <KolarNetworkMap
              nodes={nodes}
              edges={edges}
              vehicles={vehicles.filter((v) => v.plate === activeRecord.newVehiclePlate || v.status === 'standby')}
              highlightedPool={healedPool}
              previousRouteNodeIds={activeRecord.oldRouteNodeIds}
              heightClass="h-[390px]"
            />

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-border bg-surface p-4 text-center shadow-soft">
                <span className="text-[11px] font-bold uppercase text-ink-muted">Time to Recover</span>
                <div className="mt-1 font-heading text-2xl font-extrabold text-primary-strong">
                  {activeRecord.recoverySeconds}s
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-surface p-4 text-center shadow-soft">
                <span className="text-[11px] font-bold uppercase text-ink-muted">Pools Re-Planned</span>
                <div className="mt-1 font-heading text-2xl font-extrabold text-coral">1 Only</div>
              </div>
              <div className="rounded-2xl border border-border bg-surface p-4 text-center shadow-soft">
                <span className="text-[11px] font-bold uppercase text-ink-muted">Pools Untouched</span>
                <div className="mt-1 font-heading text-2xl font-extrabold text-ink">
                  {activeRecord.untouchedPoolCount} Calm
                </div>
              </div>
            </div>
          </div>

          {/* Minimal Changes & Millisecond Notification Trail */}
          <div className="space-y-4 rounded-3xl border border-border bg-surface p-6 shadow-soft lg:col-span-5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase text-coral">
                <ShieldAlert className="h-4 w-4" /> Incident Trail
              </span>
              <select
                aria-label="Select self-heal event"
                value={selectedHealIdx}
                onChange={(e) => setSelectedHealIdx(Number(e.target.value))}
                className="rounded-xl border border-border bg-surface-2 px-2.5 py-1 text-xs font-bold"
              >
                {selfHealHistory.map((h, i) => (
                  <option key={h.id} value={i}>
                    {h.newVehiclePlate} ({h.recoverySeconds}s)
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-2xl bg-surface-2 p-4 text-xs space-y-1.5">
              <div>
                <strong>Reason:</strong> {activeRecord.reason}
              </div>
              <div>
                <strong>Previous Vehicle (Coral Dashed):</strong> {activeRecord.previousVehiclePlate}
              </div>
              <div>
                <strong>Standby Assigned (Emerald Solid):</strong>{' '}
                <span className="font-extrabold text-primary-strong">
                  {activeRecord.newVehiclePlate} ({activeRecord.newTransporterName})
                </span>
              </div>
            </div>

            <div>
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-ink-muted">
                Automated Notification Delivery Log
              </h2>
              <div className="mt-2.5 space-y-2">
                {activeRecord.notificationsSent.map((n, idx) => (
                  <div key={idx} className="rounded-2xl border border-border bg-bg p-3 text-xs">
                    <div className="flex items-center justify-between font-bold text-ink">
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary-strong" /> {n.recipient}
                      </span>
                      <span className="font-mono text-[10px] text-primary-strong">{n.deliveredMs} ms</span>
                    </div>
                    <p className="mt-1 text-ink-muted leading-relaxed">{n.message}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
