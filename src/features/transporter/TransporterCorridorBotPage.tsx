import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, CheckCircle2, PlusCircle, Send, Sparkles, Truck } from 'lucide-react';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { VoiceWaveformWidget } from '@/components/ui/VoiceWaveformModal';
import { CARGO_CATALOG } from '@/engine/compatibility';
import { roadDistanceKm } from '@/engine/geo';
import { useAppStore } from '@/stores/useAppStore';

export function TransporterCorridorBotPage() {
  const language = useAppStore((s) => s.language);
  const nodes = useAppStore((s) => s.nodes);
  const pools = useAppStore((s) => s.pools);
  const returnLegOffers = useAppStore((s) => s.returnLegOffers);
  const voicePhrases = useAppStore((s) => s.voicePhrases);
  const attachReturnLegToPool = useAppStore((s) => s.attachReturnLegToPool);

  const [query, setQuery] = useState('Heading home to Srinivaspur from Kolar APMC');
  const [detourBudgetKm, setDetourBudgetKm] = useState(16);
  const [selectedPoolId, setSelectedPoolId] = useState(pools[0]?.id ?? 'pool_1');
  const [attachingId, setAttachingId] = useState<string | null>(null);

  const activePool = pools.find((p) => p.id === selectedPoolId) ?? pools[0];
  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  // Detect target home village from spoken/typed text
  const matchedHomeNode = useMemo(() => {
    const lower = query.toLowerCase();
    const villages = nodes.filter((n) => n.kind === 'village');
    return (
      villages.find(
        (v) =>
          lower.includes(v.name.toLowerCase()) ||
          lower.includes(v.nameHi.toLowerCase()) ||
          lower.includes(v.nameKn.toLowerCase()),
      ) ?? nodeMap.get('v_srinivaspur')!
    );
  }, [query, nodes, nodeMap]);

  const matchingOffers = useMemo(() => {
    const mandiOrigin = nodeMap.get('m_kolar_apmc')!;
    const directHomeKm = roadDistanceKm(mandiOrigin, matchedHomeNode, 1.3);

    return returnLegOffers
      .map((offer) => {
        const orig = nodeMap.get(offer.originNodeId) ?? mandiOrigin;
        const dest = nodeMap.get(offer.destinationNodeId) ?? matchedHomeNode;
        const viaOfferKm =
          roadDistanceKm(mandiOrigin, orig, 1.3) +
          roadDistanceKm(orig, dest, 1.3) +
          roadDistanceKm(dest, matchedHomeNode, 1.3);
        const extraDetourKm = Math.max(1.2, Math.round((viaOfferKm - directHomeKm) * 10) / 10);
        const driverNetAddInr = Math.round(offer.totalOfferInr * 0.78);
        return {
          offer,
          origName: orig.name,
          destName: dest.name,
          extraDetourKm,
          driverNetAddInr,
          withinBudget: extraDetourKm <= detourBudgetKm,
        };
      })
      .sort((a, b) => Number(b.offer.status === 'open') - Number(a.offer.status === 'open') || a.extraDetourKm - b.extraDetourKm);
  }, [returnLegOffers, matchedHomeNode, detourBudgetKm, nodeMap]);

  const handleAttach = async (offerId: string) => {
    setAttachingId(offerId);
    await attachReturnLegToPool(offerId, activePool.id);
    setAttachingId(null);
  };

  const driverPhrases = voicePhrases.filter((p) => p.role === 'transporter');

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-ink">
            <Bot className="h-3.5 w-3.5 text-primary-strong" /> Return-Leg Marketplace & Corridor Bot
          </span>
          <h1 className="mt-1.5 text-2xl font-extrabold text-ink sm:text-3xl">
            Never drive home empty from the mandi
          </h1>
        </div>

        <div className="rounded-2xl border border-primary/30 bg-primary-100/60 px-4 py-3 text-right">
          <span className="text-[11px] font-bold uppercase text-ink-muted">
            Active Tour ({activePool.code}) Income
          </span>
          <div className="font-heading text-2xl font-extrabold text-primary-strong">
            <AnimatedNumber value={activePool.transporterEarningsInr} prefix="₹" />
          </div>
        </div>
      </div>

      <VoiceWaveformWidget
        language={language}
        phrases={driverPhrases}
        value={query}
        onChange={setQuery}
        label="Tell the Corridor Bot where you are heading home (e.g., Srinivaspur, Mulbagal, Malur, Holur)"
      />

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Bot Controls & Detour Budget */}
        <div className="space-y-4 rounded-3xl border border-border bg-surface p-5 shadow-soft lg:col-span-4">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary-strong" />
            <h2 className="text-base font-extrabold text-ink">Homeward Corridor Filter</h2>
          </div>

          <div className="rounded-2xl bg-surface-2 p-3.5 text-xs">
            <div className="text-ink-muted">Matched Home Destination</div>
            <div className="mt-0.5 text-sm font-extrabold text-ink">
              {matchedHomeNode.name} ({matchedHomeNode.taluka} Taluka)
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold">
              <span>Maximum Detour Budget</span>
              <span className="font-bold text-primary-strong">+{detourBudgetKm} km</span>
            </div>
            <input
              type="range"
              min={2}
              max={40}
              value={detourBudgetKm}
              onChange={(e) => setDetourBudgetKm(Number(e.target.value))}
              aria-label="Maximum detour budget in kilometres"
              className="mt-2 w-full accent-primary"
            />
          </div>

          <div>
            <label htmlFor="attach-pool-sel" className="text-xs font-semibold text-ink-muted">
              Attach Return Cargo To Tour
            </label>
            <select
              id="attach-pool-sel"
              value={activePool.id}
              onChange={(e) => setSelectedPoolId(e.target.value)}
              className="mt-1 min-h-[44px] w-full rounded-xl border border-border bg-surface-2 px-3 text-xs font-bold text-ink"
            >
              {pools.slice(0, 4).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} • {p.vehiclePlate} (₹{p.transporterEarningsInr})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {['Srinivaspur', 'Mulbagal', 'Malur', 'Holur', 'Bangarapet'].map((town) => (
              <button
                key={town}
                type="button"
                onClick={() => setQuery(`I'm heading home to ${town}`)}
                className="inline-flex items-center gap-1 rounded-xl border border-border bg-bg px-2.5 py-1.5 text-xs font-semibold text-ink hover:border-primary"
              >
                <Send className="h-3 w-3 text-primary" /> {town}
              </button>
            ))}
          </div>
        </div>

        {/* Bot Matched Return Loads */}
        <div className="space-y-3 lg:col-span-8">
          <div className="rounded-2xl border border-sky/50 bg-sky-100/55 px-4 py-3 text-xs font-medium text-ink">
            <Sparkles className="mr-1.5 inline h-4 w-4 text-primary-strong" />
            <strong>Corridor Bot:</strong> Found{' '}
            {matchingOffers.filter((m) => m.withinBudget).length} pre-booked agro-input & packaging loads within +{detourBudgetKm} km of your run towards{' '}
            <strong>{matchedHomeNode.name}</strong>.
          </div>

          {matchingOffers.map(({ offer, origName, destName, extraDetourKm, driverNetAddInr, withinBudget }) => {
            const isAttached = offer.status === 'attached';
            return (
              <motion.div
                key={offer.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: withinBudget ? 1 : 0.55, y: 0 }}
                className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-border bg-surface p-5 shadow-soft"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-sky-100 px-2.5 py-1 text-xs font-extrabold text-ink">
                      {CARGO_CATALOG[offer.cargo].labelEn} • {offer.weightQuintals} qtl
                    </span>
                    <span className="text-xs font-bold text-ink">{offer.businessName}</span>
                    {!withinBudget && (
                      <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                        Outside {detourBudgetKm} km slider
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 text-xs font-semibold text-ink-muted">
                    {origName} → {destName} • Extra detour: <strong>+{extraDetourKm} km</strong>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-[11px] text-ink-muted">Extra Tour Earnings</div>
                    <div className="font-heading text-xl font-extrabold text-primary-strong">
                      +₹{driverNetAddInr}
                    </div>
                  </div>

                  {isAttached ? (
                    <span className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl bg-primary-100 px-4 text-xs font-extrabold text-primary-strong">
                      <CheckCircle2 className="h-4 w-4" /> Attached
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={attachingId === offer.id}
                      onClick={() => handleAttach(offer.id)}
                      className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-extrabold text-white shadow-soft hover:bg-primary-strong"
                    >
                      <PlusCircle className="h-4 w-4" />
                      <span>{attachingId === offer.id ? 'Attaching...' : 'Attach to Tour'}</span>
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
