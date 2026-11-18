import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Flame,
  Shield,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  X,
} from 'lucide-react';
import { KolarNetworkMap } from '@/components/map/KolarNetworkMap';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { CARGO_CATALOG } from '@/engine/compatibility';
import { forecastNextDayDemand } from '@/engine/forecast';
import { useAppStore } from '@/stores/useAppStore';

const COUNTER_REASONS = [
  'Steep ghat / interior village road',
  'Morning mandi unloading wait',
  'Extra tarpaulin & crate lashing',
  'Diesel rate adjustment',
];

export function TransporterOffersPage() {
  const navigate = useNavigate();
  const nodes = useAppStore((s) => s.nodes);
  const edges = useAppStore((s) => s.edges);
  const vehicles = useAppStore((s) => s.vehicles);
  const transporters = useAppStore((s) => s.transporters);
  const currentAccountId = useAppStore((s) => s.currentAccountId);
  const pools = useAppStore((s) => s.pools);
  const dailySeries = useAppStore((s) => s.dailySeries);

  const respondToPoolOffer = useAppStore((s) => s.respondToPoolOffer);
  const toggleStandbyRetainer = useAppStore((s) => s.toggleStandbyRetainer);

  const activeTransporter =
    transporters.find((t) => t.accountId === currentAccountId) ?? transporters[0];

  const heatmap = useMemo(
    () => forecastNextDayDemand(nodes, dailySeries),
    [nodes, dailySeries],
  );
  const topHotspots = useMemo(
    () => [...heatmap].sort((a, b) => b.predictedQuintals - a.predictedQuintals).slice(0, 4),
    [heatmap],
  );

  const offerPools = pools.filter(
    (p) => p.status === 'offered' || p.status === 'forming' || p.status === 'confirmed',
  );

  const [counterPoolId, setCounterPoolId] = useState<string | null>(null);
  const [counterPrice, setCounterPrice] = useState<number>(2200);
  const [counterReason, setCounterReason] = useState<string>(COUNTER_REASONS[0]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const activeCounterPool = pools.find((p) => p.id === counterPoolId) ?? null;

  const handleOfferAction = async (poolId: string, action: 'accept' | 'reject') => {
    setBusyId(poolId);
    const res = await respondToPoolOffer(poolId, action);
    setBusyId(null);
    if (action === 'accept' && res.accepted) {
      navigate('/transporter/tour');
    }
  };

  const handleSubmitCounter = async () => {
    if (!activeCounterPool) return;
    setBusyId(activeCounterPool.id);
    await respondToPoolOffer(activeCounterPool.id, 'counter', counterPrice, counterReason);
    setBusyId(null);
    setCounterPoolId(null);
    navigate('/transporter/tour');
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      {/* Header & Standby Retainer Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-border bg-surface p-5 shadow-soft">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-100 px-3 py-1 text-xs font-bold text-primary-strong">
            <TrendingUp className="h-3.5 w-3.5" /> Choice-First Transporter Feed (Zero Rejection Penalty)
          </span>
          <h1 className="mt-1.5 text-2xl font-extrabold text-ink">
            Welcome, {activeTransporter.name} • Reliability {activeTransporter.reliabilityScore}/100
          </h1>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-violet/35 bg-violet-100/50 px-4 py-3">
          <Shield className="h-5 w-5 text-violet" />
          <div>
            <div className="text-xs font-extrabold text-ink">Standby Retainer (+₹350/shift)</div>
            <div className="text-[11px] text-ink-muted">
              Cover urgent self-healing pools near your home village
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={activeTransporter.standbyActive}
            onClick={() => toggleStandbyRetainer(activeTransporter.id)}
            className={`min-h-[36px] rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-colors ${
              activeTransporter.standbyActive
                ? 'bg-primary text-white'
                : 'border border-border bg-surface text-ink-muted'
            }`}
          >
            {activeTransporter.standbyActive ? 'Opted In' : 'Opt In'}
          </button>
        </div>
      </div>

      {/* Tomorrow's Predicted Demand Heatmap */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <KolarNetworkMap
            nodes={nodes}
            edges={edges}
            vehicles={vehicles.filter((v) => activeTransporter.vehicleIds.includes(v.id))}
            heatmapCells={heatmap}
            heightClass="h-[370px]"
          />
        </div>

        <div className="rounded-3xl border border-border bg-surface p-5 shadow-soft lg:col-span-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary-strong">
            <Flame className="h-4 w-4 text-accent" /> Tomorrow’s Dawn Demand Hotspots
          </div>
          <h2 className="mt-1 text-base font-extrabold text-ink">
            “Move Here” Positioning Suggestions
          </h2>
          <div className="mt-3 space-y-2.5">
            {topHotspots.map((spot) => (
              <div
                key={spot.nodeId}
                className="flex items-center justify-between rounded-2xl border border-border bg-surface-2/70 p-3"
              >
                <div>
                  <div className="text-xs font-extrabold text-ink">
                    {spot.villageName} ({spot.taluka})
                  </div>
                  <div className="text-[11px] text-ink-muted">
                    {spot.predictedQuintals} qtl forecast • {spot.topCrop}
                  </div>
                </div>
                <div className="text-right">
                  <div className="rounded-lg bg-accent-100 px-2.5 py-1 text-xs font-extrabold text-ink">
                    ₹{spot.expectedHourlyEarningsInr}/hr
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pooled Load Offers Feed */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-ink">
            Pooled Tour Offers ({offerPools.length} Available)
          </h2>
          <span className="text-xs font-semibold text-ink-muted">
            Accept, Counter, or Pass freely — passing never lowers your score
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {offerPools.map((pool) => {
            const pickups = pool.stops.filter((s) => s.kind === 'pickup');
            const drops = pool.stops.filter((s) => s.kind === 'drop');
            const isBusy = busyId === pool.id;

            return (
              <div
                key={pool.id}
                className="flex flex-col justify-between rounded-3xl border border-border bg-surface p-5 shadow-soft transition-all hover:shadow-elevated"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg bg-primary-100 px-2.5 py-1 text-xs font-extrabold text-primary-strong">
                        {pool.code}
                      </span>
                      <span className="rounded-lg bg-surface-2 px-2.5 py-1 text-xs font-bold text-ink">
                        {pool.fillPct}% Bed Fill ({pool.totalWeightQuintals}/{pool.capacityQuintals} qtl)
                      </span>
                    </div>
                    <span className="text-xs font-bold text-primary-strong">
                      {pool.returnWeightQuintals > 0 ? '+ Return Leg Attached' : 'Return Slot Open'}
                    </span>
                  </div>

                  <div className="mt-3 flex items-baseline justify-between">
                    <div>
                      <span className="text-[11px] font-semibold uppercase text-ink-muted">
                        Net Tour Income (Outbound + Return)
                      </span>
                      <div className="font-heading text-2xl font-extrabold text-ink">
                        <AnimatedNumber value={pool.transporterEarningsInr} prefix="₹" />
                      </div>
                    </div>
                    <div className="text-right text-xs text-ink-muted">
                      <div>{pool.outboundKm} km outbound</div>
                      <div>Detour: +{(pickups.length * 2.4).toFixed(1)} km</div>
                    </div>
                  </div>

                  <div className="mt-3 rounded-2xl bg-surface-2 p-3 text-xs">
                    <div className="font-bold text-ink">
                      Pickup Sequence:{' '}
                      {pickups.map((s) => `${s.villageName} (${s.weightQuintals}q ${CARGO_CATALOG[s.crop].labelEn})`).join(' → ')}
                    </div>
                    <div className="mt-1 text-ink-muted">
                      Mandi Drop: {drops[0]?.villageName ?? 'Kolar APMC'} • Spoilage risk: Low ({pool.spoilageRiskPct}%)
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleOfferAction(pool.id, 'accept')}
                    className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-extrabold text-white hover:bg-primary-strong"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{pool.status === 'confirmed' ? 'Open Tour' : 'Accept'}</span>
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => {
                      setCounterPoolId(pool.id);
                      setCounterPrice(Math.round(pool.transporterEarningsInr * 1.08));
                    }}
                    className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-primary bg-primary-100/50 px-3 py-2 text-xs font-extrabold text-primary-strong hover:bg-primary-100"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    <span>Counter</span>
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleOfferAction(pool.id, 'reject')}
                    className="inline-flex min-h-[44px] items-center justify-center gap-1 rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs font-bold text-ink-muted hover:text-ink"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>Pass (0 Fee)</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Counter-Offer Negotiation Sheet */}
      {activeCounterPool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-border bg-surface p-6 shadow-elevated">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-ink">
                Counter-Offer — {activeCounterPool.code}
              </h3>
              <button
                type="button"
                onClick={() => setCounterPoolId(null)}
                className="rounded-lg p-1 text-ink-muted hover:bg-surface-2"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-xs text-ink-muted">
              Base offered tour income: ₹{activeCounterPool.transporterEarningsInr}. Propose your counter rate:
            </p>

            <div className="mt-4 rounded-2xl bg-surface-2 p-4">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-bold text-ink-muted">Your Counter Ask</span>
                <span className="font-heading text-2xl font-extrabold text-primary-strong">
                  ₹{counterPrice}
                </span>
              </div>
              <input
                type="range"
                min={activeCounterPool.transporterEarningsInr}
                max={Math.round(activeCounterPool.transporterEarningsInr * 1.25)}
                step={25}
                value={counterPrice}
                onChange={(e) => setCounterPrice(Number(e.target.value))}
                aria-label="Counter offer amount in rupees"
                className="mt-2 w-full accent-primary"
              />
            </div>

            <div className="mt-4">
              <span className="text-xs font-bold text-ink-muted">Select Reason</span>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {COUNTER_REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setCounterReason(r)}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-semibold ${
                      counterReason === r
                        ? 'border-primary bg-primary-100 text-primary-strong'
                        : 'border-border bg-bg text-ink'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setCounterPoolId(null)}
                className="min-h-[44px] rounded-xl border border-border px-4 text-xs font-bold text-ink-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitCounter}
                className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 text-xs font-extrabold text-white hover:bg-primary-strong"
              >
                <Sparkles className="h-4 w-4" /> Send Counter-Offer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
