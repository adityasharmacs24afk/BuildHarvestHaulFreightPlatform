import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Cpu, Download, Play, Shuffle } from 'lucide-react';
import { createSeededRng, rngInt } from '@/engine/prng';
import type { SolverLoadInput, SolverVehicleInput } from '@/engine/solvers';
import { downloadCsvFile } from '@/services/pdfExport';
import { executeBenchmarkInWorker } from '@/services/workerClient';
import { useAppStore } from '@/stores/useAppStore';
import type { CropOrCargo, SolverBenchmarkResult } from '@/types/domain';

export function OpsBenchmarkLabPage() {
  const nodes = useAppStore((s) => s.nodes);
  const vehicles = useAppStore((s) => s.vehicles);

  const [scenarioId, setScenarioId] = useState<'small' | 'medium' | 'harvest_peak'>('harvest_peak');
  const [seed, setSeed] = useState<number>(2026);
  const [running, setRunning] = useState(false);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({
    'Greedy first-come': 0,
    'Local-search router': 0,
    'Annealing (QUBO)': 0,
  });
  const [results, setResults] = useState<SolverBenchmarkResult[]>([]);

  const buildScenarioInstance = (scen: 'small' | 'medium' | 'harvest_peak', s: number) => {
    const rng = createSeededRng(s);
    const villages = nodes.filter((n) => n.kind === 'village');
    const mandis = nodes.filter((n) => n.kind === 'mandi');
    const crops: CropOrCargo[] = ['tomato', 'potato', 'beans', 'carrot', 'cabbage', 'capsicum', 'mango', 'flowers'];

    const loadCount = scen === 'small' ? 16 : scen === 'medium' ? 30 : 48;
    const vehCount = scen === 'small' ? 10 : scen === 'medium' ? 18 : 28;

    const loads: SolverLoadInput[] = Array.from({ length: loadCount }, (_, idx) => ({
      id: `b_load_${idx + 1}`,
      crop: crops[rngInt(rng, 0, crops.length - 1)],
      weightQuintals: rngInt(rng, 4, 15),
      pickupNodeId: villages[rngInt(rng, 0, villages.length - 1)].id,
      dropNodeId: mandis[rngInt(rng, 0, mandis.length - 1)].id,
      readyMinutesFromNow: rngInt(rng, 0, 90),
      spoilageDeadlineMinutes: rngInt(rng, 165, 360),
    }));

    const solverVehicles: SolverVehicleInput[] = vehicles.slice(0, vehCount).map((v) => ({
      id: v.id,
      capacityQuintals: v.capacityQuintals,
      costPerKmInr: v.costPerKmInr,
      baseNodeId: v.baseVillageId,
      homeNodeId: v.homeVillageId,
      detourBudgetKm: v.detourBudgetKm,
    }));

    return { loads, solverVehicles };
  };

  const runSolvers = async (scen = scenarioId, s = seed) => {
    setRunning(true);
    setProgressMap({
      'Greedy first-come': 10,
      'Local-search router': 5,
      'Annealing (QUBO)': 5,
    });
    const { loads, solverVehicles } = buildScenarioInstance(scen, s);
    const out = await executeBenchmarkInWorker({
      scenarioId: scen,
      seed: s,
      loads,
      vehicles: solverVehicles,
      nodes,
      onProgress: (solver, pct) => {
        setProgressMap((prev) => ({ ...prev, [solver]: pct }));
      },
    });
    setResults(out);
    setRunning(false);
  };

  useEffect(() => {
    runSolvers('harvest_peak', 2026);
  }, []);

  const handleExportCsv = () => {
    downloadCsvFile(
      `HarvestHaul-Solver-Benchmark-${scenarioId}-seed${seed}.csv`,
      ['Solver', 'Scenario', 'Seed', 'Pools Created', 'Avg Fill %', 'Empty km', 'INR per Quintal', 'Spoilage Violations', 'Solve Time ms'],
      results.map((r) => [
        r.solver,
        r.scenarioId,
        r.seed,
        r.poolsCreated,
        r.avgFillPct,
        r.emptyKm,
        r.costPerQuintalInr,
        r.spoilageViolations,
        r.solveTimeMs,
      ]),
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-border bg-surface p-6 shadow-soft">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-ink">
            <Cpu className="h-3.5 w-3.5 text-violet" /> Web Worker Solver & Benchmark Lab
          </span>
          <h1 className="mt-1.5 text-2xl font-extrabold text-ink">
            Live Solver Comparison on Identical Kolar Instances
          </h1>
          <p className="text-xs text-ink-muted">
            Every figure below is computed live in your browser Worker on the selected instance — zero pre-baked numbers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: 'small', label: 'Small (16 Loads)' },
              { id: 'medium', label: 'Medium (30 Loads)' },
              { id: 'harvest_peak', label: 'Harvest-Peak (48 Loads)' },
            ] as const
          ).map((sc) => (
            <button
              key={sc.id}
              type="button"
              onClick={() => {
                setScenarioId(sc.id);
                runSolvers(sc.id, seed);
              }}
              className={`min-h-[40px] rounded-xl px-3.5 py-2 text-xs font-bold ${
                scenarioId === sc.id
                  ? 'bg-ink text-white'
                  : 'border border-border bg-surface-2 text-ink'
              }`}
            >
              {sc.label}
            </button>
          ))}

          <button
            type="button"
            onClick={() => {
              const nextSeed = seed + 17;
              setSeed(nextSeed);
              runSolvers(scenarioId, nextSeed);
            }}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-border bg-surface px-3.5 text-xs font-bold text-ink hover:border-primary"
          >
            <Shuffle className="h-3.5 w-3.5" /> Seed #{seed}
          </button>

          <button
            type="button"
            disabled={running}
            onClick={() => runSolvers(scenarioId, seed)}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-primary px-4 text-xs font-extrabold text-white hover:bg-primary-strong"
          >
            <Play className="h-3.5 w-3.5" /> {running ? 'Solving...' : 'Run Benchmark Race'}
          </button>
        </div>
      </div>

      {/* Live Progress Race Bars */}
      <div className="grid gap-3 sm:grid-cols-3">
        {(['Greedy first-come', 'Local-search router', 'Annealing (QUBO)'] as const).map((name) => (
          <div key={name} className="rounded-2xl border border-border bg-surface p-4 shadow-soft">
            <div className="flex justify-between text-xs font-bold text-ink">
              <span>{name}</span>
              <span>{progressMap[name] ?? 100}%</span>
            </div>
            <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-primary transition-all duration-200"
                style={{ width: `${progressMap[name] ?? 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Results Table */}
      <div className="rounded-3xl border border-border bg-surface p-6 shadow-soft">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-ink">
            Solver Metrics Table ({scenarioId.replace('_', ' ').toUpperCase()} • Seed {seed})
          </h2>
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-border bg-surface-2 px-3.5 text-xs font-bold text-ink"
          >
            <Download className="h-3.5 w-3.5 text-primary-strong" /> Export CSV
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-2 text-[11px] uppercase text-ink-muted">
              <tr>
                <th className="px-3 py-3">Solver Engine</th>
                <th className="px-3 py-3">Pools Dispatched</th>
                <th className="px-3 py-3">Avg Bed Fill %</th>
                <th className="px-3 py-3">Empty Return km</th>
                <th className="px-3 py-3">₹ per Quintal</th>
                <th className="px-3 py-3">Spoilage Violations</th>
                <th className="px-3 py-3">Worker Solve Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {results.map((r) => (
                <tr key={r.solver} className={r.solver === 'Annealing (QUBO)' ? 'bg-primary-100/35' : ''}>
                  <td className="px-3 py-3 font-extrabold text-ink">{r.solver}</td>
                  <td className="px-3 py-3 font-semibold">{r.poolsCreated}</td>
                  <td className="px-3 py-3 font-extrabold text-primary-strong">{r.avgFillPct}%</td>
                  <td className="px-3 py-3">{r.emptyKm} km</td>
                  <td className="px-3 py-3 font-bold">₹{r.costPerQuintalInr}/qtl</td>
                  <td className="px-3 py-3">{r.spoilageViolations}</td>
                  <td className="px-3 py-3 font-mono">{r.solveTimeMs} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Side-by-Side Benchmark Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-border bg-surface p-6 shadow-soft">
          <h3 className="text-sm font-extrabold text-ink">Bed Fill Rate (%) & ₹ per Quintal</h3>
          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={results}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E1EBE4" />
                <XAxis dataKey="solver" tick={{ fontSize: 11, fill: '#5C6F65' }} />
                <YAxis tick={{ fontSize: 11, fill: '#5C6F65' }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="avgFillPct" name="Avg Bed Fill %" fill="#3FA374" radius={[6, 6, 0, 0]} />
                <Bar dataKey="costPerQuintalInr" name="Cost (₹/qtl)" fill="#F6B93B" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-surface p-6 shadow-soft">
          <h3 className="text-sm font-extrabold text-ink">Empty Return Kilometres & Spoilage Violations</h3>
          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={results}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E1EBE4" />
                <XAxis dataKey="solver" tick={{ fontSize: 11, fill: '#5C6F65' }} />
                <YAxis tick={{ fontSize: 11, fill: '#5C6F65' }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="emptyKm" name="Empty Return km" fill="#7CC6E8" radius={[6, 6, 0, 0]} />
                <Bar dataKey="spoilageViolations" name="Spoilage Violations" fill="#EF8A6B" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
