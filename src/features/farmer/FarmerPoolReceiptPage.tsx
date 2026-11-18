import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from 'recharts';
import {
  ArrowRight,
  CheckCircle2,
  Download,
  HelpCircle,
  Mic,
  ShieldCheck,
  Truck,
  Vote,
  Volume2,
} from 'lucide-react';
import type { LanguageCode } from '@/app/constants';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { CARGO_CATALOG } from '@/engine/compatibility';
import { explainPriceInLanguage } from '@/engine/pricing';
import { downloadPoolReceiptPdf, speakTextAloud } from '@/services/pdfExport';
import { useAppStore } from '@/stores/useAppStore';
import type { SplitRule } from '@/types/domain';

export function FarmerPoolReceiptPage() {
  const pools = useAppStore((s) => s.pools);
  const farmers = useAppStore((s) => s.farmers);
  const currentAccountId = useAppStore((s) => s.currentAccountId);
  const language = useAppStore((s) => s.language);
  const auditChain = useAppStore((s) => s.auditChain);
  const voteOnSplitRule = useAppStore((s) => s.voteOnSplitRule);

  const activeFarmer = farmers.find((f) => f.accountId === currentAccountId) ?? farmers[0];

  // Select pool containing active farmer or latest pool
  const farmerPools = pools.filter((p) =>
    p.shares.some((s) => s.shipperName.toLowerCase().includes(activeFarmer.name.split(' ')[0].toLowerCase())),
  );
  const [selectedPoolId, setSelectedPoolId] = useState<string>(
    farmerPools[0]?.id ?? pools[0]?.id ?? 'pool_1',
  );
  const pool = pools.find((p) => p.id === selectedPoolId) ?? farmerPools[0] ?? pools[0];

  const myShare =
    pool.shares.find((s) =>
      s.shipperName.toLowerCase().includes(activeFarmer.name.split(' ')[0].toLowerCase()),
    ) ?? pool.shares[0];

  const [explainLang, setExplainLang] = useState<LanguageCode>(language);
  const [assistantOpen, setAssistantOpen] = useState(true);
  const [spokenQuestion, setSpokenQuestion] = useState<string | null>(null);

  const explanationText = useMemo(
    () => explainPriceInLanguage(myShare, pool.splitRule, pool.shares.length, explainLang),
    [myShare, pool.splitRule, pool.shares.length, explainLang],
  );

  const waterfallData = useMemo(
    () => [
      { name: 'Solo Truck', amount: myShare.soloCostInr, color: '#94A39B' },
      { name: 'Weight Share', amount: myShare.baseWeightChargeInr, color: '#3FA374' },
      { name: 'Trunk Road', amount: myShare.distanceComponentInr, color: '#2A7F58' },
      { name: 'Village Turn', amount: myShare.detourDeltaInr, color: '#F6B93B' },
      { name: 'Return Credit', amount: -myShare.returnLegCreditInr, color: '#7CC6E8' },
      { name: 'Your Fare', amount: myShare.finalShareInr, color: '#1E2B25' },
    ],
    [myShare],
  );

  const auditEntry = auditChain.find((a) => a.poolId === pool.id);
  const pickupStops = pool.stops.filter((s) => s.kind === 'pickup');

  const handleAskWhyByVoice = (lang: LanguageCode) => {
    setExplainLang(lang);
    setAssistantOpen(true);
    const prompts: Record<LanguageCode, string> = {
      en: 'Why is my pooled fare this amount?',
      hi: 'मेरा साझा किराया इतना क्यों है?',
      kn: 'ನನ್ನ ಬಾಡಿಗೆ ದರ ಹೀಗೆ ಹೇಗೆ ನಿರ್ಧಾರವಾಯಿತು?',
    };
    setSpokenQuestion(prompts[lang]);
    const answer = explainPriceInLanguage(myShare, pool.splitRule, pool.shares.length, lang);
    speakTextAloud(answer, lang);
  };

  const splitRules: { id: SplitRule; title: string; subtitle: string }[] = [
    { id: 'shapley', title: 'Shapley Fair Route', subtitle: 'Weight + trunk + detour contribution' },
    { id: 'weight', title: 'Weight Share', subtitle: 'Proportional to quintals loaded' },
    { id: 'distance', title: 'Distance Share', subtitle: 'Weighted by village-to-mandi km' },
    { id: 'equal', title: 'Equal Split', subtitle: 'Same rupee share per shipper' },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      {/* Pool Selector Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-100 px-3 py-1 text-xs font-bold text-primary-strong">
            <Truck className="h-3.5 w-3.5" /> Shared Vehicle Pool & Shapley Receipt
          </span>
          <h1 className="mt-1.5 text-2xl font-extrabold text-ink sm:text-3xl">
            Pool {pool.code} • {pool.vehiclePlate}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Select pool"
            value={pool.id}
            onChange={(e) => setSelectedPoolId(e.target.value)}
            className="min-h-[42px] rounded-xl border border-border bg-surface px-3 text-xs font-bold text-ink"
          >
            {pools.slice(0, 6).map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} ({p.fillPct}% full • {p.vehiclePlate})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => downloadPoolReceiptPdf(pool, myShare)}
            className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-border bg-surface px-3.5 py-2 text-xs font-bold text-ink hover:border-primary"
          >
            <Download className="h-4 w-4 text-primary-strong" />
            <span>PDF Receipt</span>
          </button>
          <Link
            to="/farmer/track"
            className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-soft hover:bg-primary-strong"
          >
            <span>Pay Escrow & Track</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Truck-Bed Fill Animation & Neighbour LIFO Cards */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="rounded-3xl border border-border bg-surface p-5 shadow-soft sm:p-6 lg:col-span-7">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-ink">
                Neighbours Sharing Your Vehicle Bed (First Names & Villages Only)
              </h2>
              <p className="text-xs text-ink-muted">
                Loaded in Last-In-First-Out (LIFO) sequence so mandi bays unload cleanly without crate bruising.
              </p>
            </div>
            <div className="text-right">
              <span className="font-heading text-2xl font-extrabold text-primary-strong">
                <AnimatedNumber value={pool.fillPct} suffix="%" />
              </span>
              <div className="text-[11px] font-semibold text-ink-muted">
                {pool.totalWeightQuintals}/{pool.capacityQuintals} qtl bed fill
              </div>
            </div>
          </div>

          {/* Animated SVG Truck Bed snapping crates in */}
          <div className="mt-4 rounded-2xl bg-surface-2 p-4">
            <div className="mb-2 flex items-center justify-between text-xs font-semibold text-ink-muted">
              <span>Cab Front (Load First • Unload Last)</span>
              <span>Rear Tailgate (Load Last • Unload First)</span>
            </div>
            <div className="flex min-h-[76px] items-stretch gap-2 rounded-xl border-2 border-primary-strong/40 bg-surface p-2">
              {pickupStops.map((stop, idx) => {
                const widthPct = Math.max(
                  22,
                  Math.round((stop.weightQuintals / Math.max(1, pool.capacityQuintals)) * 100),
                );
                const colors = ['bg-primary-100 border-primary', 'bg-accent-100 border-accent', 'bg-sky-100 border-sky'];
                return (
                  <motion.div
                    key={stop.loadId}
                    initial={{ opacity: 0, x: 40, scale: 0.9 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    transition={{ delay: idx * 0.14, type: 'spring', stiffness: 280, damping: 24 }}
                    style={{ width: `${widthPct}%` }}
                    className={`flex flex-col justify-between rounded-xl border-2 p-2.5 ${colors[idx % colors.length]}`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate text-xs font-extrabold text-ink">
                        {stop.shipperFirstName} • {stop.villageName}
                      </span>
                      <span className="rounded bg-surface/90 px-1.5 py-0.5 text-[10px] font-bold text-ink">
                        LIFO #{stop.lifoSequence}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] font-semibold text-ink-muted">
                      {stop.weightQuintals} qtl {CARGO_CATALOG[stop.crop].labelEn}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {pickupStops.map((st, idx) => (
              <div key={st.loadId} className="rounded-2xl border border-border bg-bg p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-ink">
                    {st.shipperFirstName} ({st.villageName})
                  </span>
                  <span className="text-[10px] font-bold text-primary-strong">Stop {idx + 1}</span>
                </div>
                <div className="mt-1 text-xs text-ink-muted">
                  {st.weightQuintals} qtl • {CARGO_CATALOG[st.crop].labelEn}
                </div>
                <div className="mt-2 text-[11px] font-semibold text-ink">
                  Est. Pickup:{' '}
                  {new Date(st.eta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* “Why This Price?” Voice Assistant Card */}
        <div className="rounded-3xl border border-violet/35 bg-gradient-to-b from-violet-100/55 to-surface p-5 shadow-soft sm:p-6 lg:col-span-5">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink">
              <HelpCircle className="h-4 w-4 text-violet" /> “Why This Price?” Voice Explainer
            </span>
            <button
              type="button"
              onClick={() => speakTextAloud(explanationText, explainLang)}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl bg-ink px-3 py-1.5 text-xs font-bold text-white hover:bg-primary-strong"
            >
              <Volume2 className="h-3.5 w-3.5" /> Read Aloud
            </button>
          </div>

          <p className="mt-2 text-xs text-ink-muted">
            Ask by voice in Kannada, Hindi, or English to hear every cost line explained aloud:
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {(
              [
                { code: 'kn', label: 'ಕನ್ನಡದಲ್ಲಿ ಕೇಳಿ (Ask in Kannada)' },
                { code: 'hi', label: 'हिन्दी में पूछें (Ask in Hindi)' },
                { code: 'en', label: 'Ask in English' },
              ] as const
            ).map((btn) => (
              <button
                key={btn.code}
                type="button"
                onClick={() => handleAskWhyByVoice(btn.code)}
                className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all ${
                  explainLang === btn.code
                    ? 'border-primary bg-primary text-white shadow-soft'
                    : 'border-border bg-surface text-ink hover:bg-surface-2'
                }`}
              >
                <Mic className="h-3.5 w-3.5" />
                <span>{btn.label}</span>
              </button>
            ))}
          </div>

          {spokenQuestion && (
            <div className="mt-3 rounded-xl bg-surface px-3 py-2 text-xs font-semibold text-ink border border-border">
              You asked: “{spokenQuestion}”
            </div>
          )}

          {assistantOpen && (
            <motion.div
              key={`${explainLang}_${pool.splitRule}_${myShare.finalShareInr}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="mt-3 rounded-2xl border border-border bg-surface p-4 text-sm leading-relaxed text-ink shadow-soft"
            >
              {explanationText}
            </motion.div>
          )}

          {auditEntry && (
            <div className="mt-4 rounded-xl border border-border bg-surface-2 p-3 text-[11px] text-ink-muted">
              <div className="flex items-center gap-1.5 font-bold text-ink">
                <ShieldCheck className="h-3.5 w-3.5 text-primary-strong" />
                <span>SHA-256 Audit Entry #{auditEntry.index} ({pool.solverUsed})</span>
              </div>
              <div className="mt-1 truncate font-mono text-[10px]">Hash: {auditEntry.hash}</div>
            </div>
          )}
        </div>
      </div>

      {/* Waterfall Chart + Itemised Shapley Table + Split-Rule Vote */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="rounded-3xl border border-border bg-surface p-5 shadow-soft sm:p-6 lg:col-span-6">
          <h2 className="text-base font-extrabold text-ink">
            Your Fare Waterfall Breakdown ({myShare.shipperName})
          </h2>
          <p className="text-xs text-ink-muted">
            Solo vehicle benchmark ₹{myShare.soloCostInr} vs. pooled fare ₹{myShare.finalShareInr} ({myShare.savingsPct}% saved)
          </p>

          <div className="mt-4 h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={waterfallData} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E1EBE4" />
                <XAxis dataKey="name" tick={{ fontSize: 10.5, fill: '#5C6F65' }} />
                <YAxis tick={{ fontSize: 11, fill: '#5C6F65' }} />
                <Tooltip formatter={(val: any) => [`₹${val}`, 'Amount']} />
                <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                  {waterfallData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 divide-y divide-border text-xs">
            <div className="flex justify-between py-2">
              <span className="text-ink-muted">Weight Share ({myShare.weightQuintals} qtl)</span>
              <span className="font-bold text-ink">₹{myShare.baseWeightChargeInr}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-ink-muted">Shared Trunk Corridor ({myShare.directDistanceKm} km)</span>
              <span className="font-bold text-ink">₹{myShare.distanceComponentInr}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-ink-muted">Village Pickup Detour Caused</span>
              <span className="font-bold text-ink">₹{myShare.detourDeltaInr}</span>
            </div>
            <div className="flex justify-between py-2 text-primary-strong">
              <span className="font-semibold">Filled Return-Leg Discount</span>
              <span className="font-extrabold">-₹{myShare.returnLegCreditInr}</span>
            </div>
            <div className="flex justify-between py-2.5 text-sm">
              <span className="font-extrabold text-ink">Your Final Payable Share</span>
              <span className="font-heading text-lg font-extrabold text-primary-strong">
                <AnimatedNumber value={myShare.finalShareInr} prefix="₹" />
              </span>
            </div>
          </div>
        </div>

        {/* Pool Split-Rule Democratic Vote */}
        <div className="rounded-3xl border border-border bg-surface p-5 shadow-soft sm:p-6 lg:col-span-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Vote className="h-5 w-5 text-primary-strong" />
              <h2 className="text-base font-extrabold text-ink">Pool Split-Rule Vote</h2>
            </div>
            <span className="rounded-full bg-accent-100 px-3 py-1 text-xs font-bold text-ink">
              Active: {pool.splitRule.toUpperCase()}
            </span>
          </div>
          <p className="mt-1 text-xs text-ink-muted">
            Every shipper in the pool can vote on how the ₹{pool.tourCostInr} net tour cost is split. Tap any rule to cast your vote and preview shares live:
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2.5">
            {splitRules.map((r) => {
              const active = pool.splitRule === r.id;
              const voteCount = pool.votes.filter((v) => v.choice === r.id).length;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() =>
                    voteOnSplitRule(pool.id, activeFarmer.id, activeFarmer.name.split(' ')[0], r.id)
                  }
                  className={`flex flex-col justify-between rounded-2xl border p-3.5 text-left transition-all ${
                    active
                      ? 'border-primary bg-primary-100/70 shadow-soft'
                      : 'border-border bg-surface-2/60 hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-ink">{r.title}</span>
                    {active && <CheckCircle2 className="h-4 w-4 text-primary-strong" />}
                  </div>
                  <p className="mt-1 text-[11px] text-ink-muted">{r.subtitle}</p>
                  <div className="mt-2 text-[11px] font-bold text-primary-strong">
                    {voteCount} {voteCount === 1 ? 'vote' : 'votes'}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Live Multi-Shipper Comparison Table */}
          <div className="mt-5 overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-2 text-[11px] uppercase text-ink-muted">
                <tr>
                  <th className="px-3 py-2.5">Shipper</th>
                  <th className="px-3 py-2.5">Shapley</th>
                  <th className="px-3 py-2.5">Weight</th>
                  <th className="px-3 py-2.5">Distance</th>
                  <th className="px-3 py-2.5">Equal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pool.shares.map((sh) => (
                  <tr key={sh.loadId} className="bg-surface">
                    <td className="px-3 py-2.5 font-bold text-ink">
                      {sh.shipperName.split(' ')[0]} ({sh.weightQuintals}q)
                    </td>
                    <td className={`px-3 py-2.5 ${pool.splitRule === 'shapley' ? 'font-extrabold text-primary-strong' : ''}`}>
                      ₹{sh.shapleyShareInr}
                    </td>
                    <td className={`px-3 py-2.5 ${pool.splitRule === 'weight' ? 'font-extrabold text-primary-strong' : ''}`}>
                      ₹{sh.weightRuleShareInr}
                    </td>
                    <td className={`px-3 py-2.5 ${pool.splitRule === 'distance' ? 'font-extrabold text-primary-strong' : ''}`}>
                      ₹{sh.distanceRuleShareInr}
                    </td>
                    <td className={`px-3 py-2.5 ${pool.splitRule === 'equal' ? 'font-extrabold text-primary-strong' : ''}`}>
                      ₹{sh.equalRuleShareInr}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
