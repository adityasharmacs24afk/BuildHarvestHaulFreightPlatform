import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Play, Sparkles, TrendingUp } from 'lucide-react';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { useAppStore } from '@/stores/useAppStore';

export function TransporterShadowPage() {
  const historicalTrips = useAppStore((s) => s.historicalTrips);
  const transporters = useAppStore((s) => s.transporters);
  const currentAccountId = useAppStore((s) => s.currentAccountId);

  const activeTransporter =
    transporters.find((t) => t.accountId === currentAccountId) ?? transporters[0];

  const [monthWindow, setMonthWindow] = useState<'m1' | 'm2' | 'm3'>('m1');
  const [replayKey, setReplayKey] = useState(1);

  const replayData = useMemo(() => {
    const now = Date.now();
    const windowRange =
      monthWindow === 'm1' ? [0, 30] : monthWindow === 'm2' ? [30, 60] : [60, 90];

    const relevant = historicalTrips
      .filter((tr) => {
        const ageDays = (now - new Date(tr.date).getTime()) / 86_400_000;
        return ageDays >= windowRange[0] && ageDays <= windowRange[1] && !tr.cancelled;
      })
      .slice(0, 14);

    let cumActual = 0;
    let cumShadow = 0;
    const points = relevant.map((tr, idx) => {
      cumActual += tr.transporterEarnedInr;
      cumShadow += tr.shadowPlannedEarnedInr;
      return {
        tripLabel: `Trip ${idx + 1}`,
        dateShort: tr.date.slice(5, 10),
        actualCumulative: cumActual,
        plannedCumulative: cumShadow,
        tripDelta: tr.shadowPlannedEarnedInr - tr.transporterEarnedInr,
      };
    });

    return {
      points,
      totalActual: cumActual,
      totalPlanned: cumShadow,
      upliftInr: Math.max(0, cumShadow - cumActual),
    };
  }, [historicalTrips, monthWindow, replayKey]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-100 px-3 py-1 text-xs font-bold text-ink">
            <Sparkles className="h-3.5 w-3.5 text-primary-strong" /> Shadow-Mode Earnings Proof
          </span>
          <h1 className="mt-1.5 text-2xl font-extrabold text-ink sm:text-3xl">
            Replay your past month on pooled + return-leg planning
          </h1>
          <p className="mt-1 text-xs text-ink-muted">
            Runs the HarvestHaul tour planner over {activeTransporter.name}’s historical trips to compare part-empty earnings vs. pooled round-trip tours.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: 'm1', label: 'Last 30 Days' },
              { id: 'm2', label: '31–60 Days Ago' },
              { id: 'm3', label: '61–90 Days Ago' },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMonthWindow(m.id)}
              className={`min-h-[40px] rounded-xl px-3.5 py-2 text-xs font-bold ${
                monthWindow === m.id
                  ? 'bg-primary text-white shadow-soft'
                  : 'border border-border bg-surface text-ink hover:bg-surface-2'
              }`}
            >
              {m.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setReplayKey((k) => k + 1)}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-ink px-4 py-2 text-xs font-extrabold text-white"
          >
            <Play className="h-3.5 w-3.5" /> Replay Month
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-border bg-surface p-5 shadow-soft">
          <span className="text-xs font-semibold text-ink-muted">What Was Earned (Solo / Empty Return)</span>
          <div className="mt-1 font-heading text-2xl font-extrabold text-ink">
            <AnimatedNumber value={replayData.totalActual} prefix="₹" />
          </div>
        </div>
        <div className="rounded-3xl border border-primary/40 bg-primary-100/55 p-5 shadow-soft">
          <span className="text-xs font-semibold text-primary-strong">With Pooled Outbound + Return Leg</span>
          <div className="mt-1 font-heading text-2xl font-extrabold text-primary-strong">
            <AnimatedNumber value={replayData.totalPlanned} prefix="₹" />
          </div>
        </div>
        <div className="rounded-3xl border border-accent bg-accent-100/65 p-5 shadow-soft">
          <span className="inline-flex items-center gap-1 text-xs font-bold text-ink">
            <TrendingUp className="h-3.5 w-3.5 text-primary-strong" /> Missed Net Uplift Unlocked
          </span>
          <div className="mt-1 font-heading text-3xl font-extrabold text-ink">
            +<AnimatedNumber value={replayData.upliftInr} prefix="₹" />
          </div>
        </div>
      </div>

      {/* Dual Replay Line Chart */}
      <div className="rounded-3xl border border-border bg-surface p-6 shadow-soft">
        <h2 className="text-base font-extrabold text-ink">
          Cumulative Tour Earnings Replay ({replayData.points.length} Corridor Runs)
        </h2>
        <div className="mt-4 h-80 w-full" key={replayKey}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={replayData.points} margin={{ top: 12, right: 16, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E1EBE4" />
              <XAxis dataKey="tripLabel" tick={{ fontSize: 11, fill: '#5C6F65' }} />
              <YAxis tick={{ fontSize: 11, fill: '#5C6F65' }} />
              <Tooltip formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, '']} />
              <Legend />
              <Line
                type="monotone"
                dataKey="actualCumulative"
                name="Earned Without Pooling"
                stroke="#5C6F65"
                strokeWidth={2.5}
                strokeDasharray="6 4"
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="plannedCumulative"
                name="HarvestHaul Tour Planner"
                stroke="#3FA374"
                strokeWidth={3.5}
                dot={{ r: 4, fill: '#3FA374' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
