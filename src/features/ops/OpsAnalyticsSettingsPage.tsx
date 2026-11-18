import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Download, FileText, RotateCcw, Settings } from 'lucide-react';
import { SUPPORTED_LANGUAGES, type LanguageCode } from '@/app/constants';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { pushToast } from '@/services/eventBus';
import { downloadAnalyticsReportPdf, downloadCsvFile } from '@/services/pdfExport';
import { useAppStore } from '@/stores/useAppStore';

export function OpsAnalyticsSettingsPage() {
  const dailySeries = useAppStore((s) => s.dailySeries);
  const historicalTrips = useAppStore((s) => s.historicalTrips);
  const farmers = useAppStore((s) => s.farmers);
  const selfHealHistory = useAppStore((s) => s.selfHealHistory);
  const language = useAppStore((s) => s.language);
  const setLanguage = useAppStore((s) => s.setLanguage);
  const restoreInitialState = useAppStore((s) => s.restoreInitialState);

  const [rangeDays, setRangeDays] = useState<30 | 60 | 90>(30);
  const [quboCoolingSteps, setQuboCoolingSteps] = useState(950);
  const [smsTemplate, setSmsTemplate] = useState(
    'HarvestHaul: Pool {{poolCode}} confirmed on {{plate}}. Audited fare INR {{fare}} held safely in escrow.',
  );

  const slicedSeries = useMemo(() => dailySeries.slice(-rangeDays), [dailySeries, rangeDays]);

  const kpis = useMemo(() => {
    const emptyKmAvoided = historicalTrips
      .slice(-rangeDays * 5)
      .reduce((a, t) => a + Math.round(t.distanceKm * 0.64), 0);
    const avgFillPct = Math.round(
      slicedSeries.reduce((a, d) => a + d.avgFillPct, 0) / Math.max(1, slicedSeries.length),
    );
    const onTimeCount = historicalTrips.filter((t) => t.onTime).length;
    const onTimePct = Math.round((onTimeCount / Math.max(1, historicalTrips.length)) * 100);
    const avgRecoverySec =
      Math.round(
        (selfHealHistory.reduce((a, h) => a + h.recoverySeconds, 0) /
          Math.max(1, selfHealHistory.length)) *
          10,
      ) / 10;
    return {
      emptyKmAvoided,
      avgFillPct,
      avgCostPerQtl: 89,
      onTimePct,
      spoilageAvoidedQtl: rangeDays * 14,
      transporterUpliftPct: 36,
      avgRecoverySec,
    };
  }, [historicalTrips, slicedSeries, rangeDays, selfHealHistory]);

  const languageMix = useMemo(() => {
    const counts = { kn: 0, en: 0, hi: 0 };
    farmers.forEach((f) => {
      counts[f.preferredLanguage] += 1;
    });
    return [
      { name: 'Kannada (ಕನ್ನಡ)', value: counts.kn + 24, color: '#3FA374' },
      { name: 'English', value: counts.en, color: '#7CC6E8' },
      { name: 'Hindi (हिन्दी)', value: counts.hi + 12, color: '#F6B93B' },
    ];
  }, [farmers]);

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6">
      {/* Header & Exports */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">
            Network Impact Analytics & Platform Settings
          </h1>
          <p className="text-xs text-ink-muted">
            Compare corridor efficiency across {rangeDays}-day rolling windows and export board reports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {([30, 60, 90] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setRangeDays(d)}
              className={`min-h-[38px] rounded-xl px-3.5 text-xs font-bold ${
                rangeDays === d ? 'bg-ink text-white' : 'border border-border bg-surface text-ink'
              }`}
            >
              Last {d} Days
            </button>
          ))}
          <button
            type="button"
            onClick={() => downloadAnalyticsReportPdf(kpis)}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-primary px-3.5 text-xs font-extrabold text-white"
          >
            <FileText className="h-3.5 w-3.5" /> Export PDF
          </button>
          <button
            type="button"
            onClick={() =>
              downloadCsvFile(
                `HarvestHaul-Analytics-${rangeDays}d.csv`,
                ['Date', 'Avg Fill %', 'Empty km %', 'Mandi Arrivals qtl', 'Rain mm'],
                slicedSeries.map((d) => [d.date, d.avgFillPct, d.emptyKmPct, d.mandiArrivalQuintals, d.rainMm]),
              )
            }
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-border bg-surface px-3.5 text-xs font-bold text-ink"
          >
            <Download className="h-3.5 w-3.5 text-primary-strong" /> Export CSV
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-soft">
          <span className="text-xs text-ink-muted">Empty Return km Avoided</span>
          <div className="mt-1 font-heading text-2xl font-extrabold text-primary-strong">
            <AnimatedNumber value={kpis.emptyKmAvoided} suffix=" km" />
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-soft">
          <span className="text-xs text-ink-muted">Average Pooled Fill Rate</span>
          <div className="mt-1 font-heading text-2xl font-extrabold text-ink">
            <AnimatedNumber value={kpis.avgFillPct} suffix="%" />
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-soft">
          <span className="text-xs text-ink-muted">Produce Spoilage Avoided</span>
          <div className="mt-1 font-heading text-2xl font-extrabold text-primary-strong">
            <AnimatedNumber value={kpis.spoilageAvoidedQtl} suffix=" qtl" />
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-soft">
          <span className="text-xs text-ink-muted">Mean Self-Heal Recovery</span>
          <div className="mt-1 font-heading text-2xl font-extrabold text-ink">
            {kpis.avgRecoverySec}s ({kpis.onTimePct}% on-time)
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="rounded-3xl border border-border bg-surface p-6 shadow-soft lg:col-span-8">
          <h2 className="text-base font-extrabold text-ink">
            Bed Utilization Rise vs. Empty Return Decline ({rangeDays} Days)
          </h2>
          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={slicedSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E1EBE4" />
                <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="avgFillPct" name="Avg Bed Fill %" stroke="#3FA374" fill="#DDF1E6" strokeWidth={2.5} />
                <Area type="monotone" dataKey="emptyKmPct" name="Empty Return %" stroke="#EF8A6B" fill="#FDE7DF" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-surface p-6 shadow-soft lg:col-span-4">
          <h2 className="text-base font-extrabold text-ink">Active Voice & App Language Mix</h2>
          <div className="mt-4 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={languageMix} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78}>
                  {languageMix.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Settings & Restore Initial Seeded State */}
      <div className="rounded-3xl border border-border bg-surface p-6 shadow-soft">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary-strong" />
          <h2 className="text-lg font-extrabold text-ink">Control Tower Settings & State Recovery</h2>
        </div>

        <div className="mt-4 grid gap-6 md:grid-cols-3">
          <div>
            <span className="text-xs font-bold uppercase text-ink-muted">Default Console Language</span>
            <div className="mt-2 flex gap-2">
              {SUPPORTED_LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => setLanguage(l.code as LanguageCode)}
                  className={`min-h-[38px] rounded-xl px-3 text-xs font-bold ${
                    language === l.code ? 'bg-primary text-white' : 'bg-surface-2 text-ink'
                  }`}
                >
                  {l.nativeLabel}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold">
              <span>QUBO Annealing Cooling Steps</span>
              <span className="font-bold text-primary-strong">{quboCoolingSteps}</span>
            </div>
            <input
              type="range"
              min={400}
              max={2000}
              step={50}
              value={quboCoolingSteps}
              onChange={(e) => setQuboCoolingSteps(Number(e.target.value))}
              aria-label="QUBO solver cooling steps"
              className="mt-2 w-full accent-primary"
            />
          </div>

          <div>
            <span className="text-xs font-bold uppercase text-ink-muted">SMS / Chat Alert Template</span>
            <input
              type="text"
              value={smsTemplate}
              onChange={(e) => setSmsTemplate(e.target.value)}
              aria-label="Notification template"
              className="mt-1.5 min-h-[38px] w-full rounded-xl border border-border bg-surface-2 px-3 text-xs"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <button
            type="button"
            onClick={() => pushToast('Settings Saved', 'Solver & notification settings updated.', 'success')}
            className="min-h-[42px] rounded-xl bg-ink px-5 text-xs font-extrabold text-white"
          >
            Save Configuration
          </button>
          <button
            type="button"
            onClick={restoreInitialState}
            className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-coral bg-coral-100/60 px-4 text-xs font-extrabold text-ink hover:bg-coral-100"
          >
            <RotateCcw className="h-4 w-4 text-coral" /> Restore Initial Seeded Network State
          </button>
        </div>
      </div>
    </div>
  );
}
