import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Layers } from 'lucide-react';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { simulateTalukaTwinWeek, type TwinPolicyId } from '@/engine/twin';

export function OpsDigitalTwinPage() {
  const [harvestIntensityPct, setHarvestIntensityPct] = useState(125);
  const [rainMmPerDay, setRainMmPerDay] = useState(12);
  const [cancellationRatePct, setCancellationRatePct] = useState(8);
  const [policyA, setPolicyA] = useState<TwinPolicyId>('solo_first_come');
  const [policyB, setPolicyB] = useState<TwinPolicyId>('tour_return_standby');

  const output = useMemo(
    () =>
      simulateTalukaTwinWeek({
        harvestIntensityPct,
        rainMmPerDay,
        cancellationRatePct,
        policyA,
        policyB,
      }),
    [harvestIntensityPct, rainMmPerDay, cancellationRatePct, policyA, policyB],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <div className="rounded-3xl border border-border bg-surface p-6 shadow-soft">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-ink">
          <Layers className="h-3.5 w-3.5 text-primary-strong" /> Kolar Taluka 7-Day Digital Twin
        </span>
        <h1 className="mt-1.5 text-2xl font-extrabold text-ink">
          Stress-Test Dispatch Policies Under Harvest Peak & Monsoon Conditions
        </h1>

        <div className="mt-5 grid gap-5 md:grid-cols-3">
          <div>
            <div className="flex justify-between text-xs font-semibold">
              <span>Harvest Arrival Intensity</span>
              <span className="font-bold text-primary-strong">{harvestIntensityPct}%</span>
            </div>
            <input
              type="range"
              min={60}
              max={180}
              value={harvestIntensityPct}
              onChange={(e) => setHarvestIntensityPct(Number(e.target.value))}
              aria-label="Harvest intensity percentage"
              className="mt-2 w-full accent-primary"
            />
          </div>
          <div>
            <div className="flex justify-between text-xs font-semibold">
              <span>Daily Rainfall</span>
              <span className="font-bold text-primary-strong">{rainMmPerDay} mm/day</span>
            </div>
            <input
              type="range"
              min={0}
              max={48}
              value={rainMmPerDay}
              onChange={(e) => setRainMmPerDay(Number(e.target.value))}
              aria-label="Daily rainfall in millimetres"
              className="mt-2 w-full accent-primary"
            />
          </div>
          <div>
            <div className="flex justify-between text-xs font-semibold">
              <span>Raw Vehicle Cancellation Rate</span>
              <span className="font-bold text-coral">{cancellationRatePct}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={24}
              value={cancellationRatePct}
              onChange={(e) => setCancellationRatePct(Number(e.target.value))}
              aria-label="Cancellation rate percentage"
              className="mt-2 w-full accent-primary"
            />
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="twin-pa" className="text-[11px] font-bold uppercase text-ink-muted">
              Policy A (Baseline)
            </label>
            <select
              id="twin-pa"
              value={policyA}
              onChange={(e) => setPolicyA(e.target.value as TwinPolicyId)}
              className="mt-1 min-h-[42px] w-full rounded-xl border border-border bg-surface-2 px-3 text-xs font-bold"
            >
              <option value="solo_first_come">Solo First-Come Dispatch (No Return Pool)</option>
              <option value="rolling_pool_shapley">Outbound Rolling Pool + Shapley</option>
              <option value="tour_return_standby">Full Round-Trip Tour + Return Leg + Standby</option>
            </select>
          </div>
          <div>
            <label htmlFor="twin-pb" className="text-[11px] font-bold uppercase text-ink-muted">
              Policy B (Candidate)
            </label>
            <select
              id="twin-pb"
              value={policyB}
              onChange={(e) => setPolicyB(e.target.value as TwinPolicyId)}
              className="mt-1 min-h-[42px] w-full rounded-xl border border-primary bg-primary-100/50 px-3 text-xs font-bold"
            >
              <option value="tour_return_standby">Full Round-Trip Tour + Return Leg + Standby</option>
              <option value="rolling_pool_shapley">Outbound Rolling Pool + Shapley</option>
              <option value="solo_first_come">Solo First-Come Dispatch (No Return Pool)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Twin Summary KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-soft">
          <span className="text-xs text-ink-muted">Avg Bed Fill (A vs B)</span>
          <div className="mt-1 font-heading text-2xl font-extrabold text-primary-strong">
            {output.summary.avgFillPctA}% → <AnimatedNumber value={output.summary.avgFillPctB} suffix="%" />
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-soft">
          <span className="text-xs text-ink-muted">Empty km Avoided (Week)</span>
          <div className="mt-1 font-heading text-2xl font-extrabold text-ink">
            <AnimatedNumber value={output.summary.emptyKmAvoided} suffix=" km" />
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-soft">
          <span className="text-xs text-ink-muted">Freight Cost / Quintal</span>
          <div className="mt-1 font-heading text-2xl font-extrabold text-primary-strong">
            ₹{output.summary.avgCostPerQtlA} → ₹{output.summary.avgCostPerQtlB}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-soft">
          <span className="text-xs text-ink-muted">Spoilage Saved</span>
          <div className="mt-1 font-heading text-2xl font-extrabold text-ink">
            <AnimatedNumber value={output.summary.spoilageSavedQuintals} suffix=" qtl" />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-border bg-surface p-6 shadow-soft">
          <h2 className="text-sm font-extrabold text-ink">7-Day Cost per Quintal Trajectory (₹)</h2>
          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={output.days}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E1EBE4" />
                <XAxis dataKey="dayLabel" tick={{ fontSize: 11, fill: '#5C6F65' }} />
                <YAxis tick={{ fontSize: 11, fill: '#5C6F65' }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="baselineCostPerQtl" name="Policy A (₹/qtl)" stroke="#EF8A6B" strokeWidth={2.5} />
                <Line type="monotone" dataKey="pooledCostPerQtl" name="Policy B (₹/qtl)" stroke="#3FA374" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-surface p-6 shadow-soft">
          <h2 className="text-sm font-extrabold text-ink">Daily Empty Return Kilometres (A vs B)</h2>
          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={output.days}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E1EBE4" />
                <XAxis dataKey="dayLabel" tick={{ fontSize: 11, fill: '#5C6F65' }} />
                <YAxis tick={{ fontSize: 11, fill: '#5C6F65' }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="baselineEmptyKm" name="Policy A Empty km" fill="#94A39B" radius={[6, 6, 0, 0]} />
                <Bar dataKey="pooledEmptyKm" name="Policy B Empty km" fill="#7CC6E8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
