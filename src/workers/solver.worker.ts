import {
  runGreedyFirstCome,
  runLocalSearchRouter,
  runQuboAnnealingSolver,
  type SolverLoadInput,
  type SolverVehicleInput,
} from '@/engine/solvers';
import type { GeoNode, SolverBenchmarkResult } from '@/types/domain';

export interface WorkerBenchmarkRequest {
  type: 'RUN_BENCHMARK';
  scenarioId: 'small' | 'medium' | 'harvest_peak';
  seed: number;
  loads: SolverLoadInput[];
  vehicles: SolverVehicleInput[];
  nodes: GeoNode[];
}

export type WorkerBenchmarkResponse =
  | {
      type: 'PROGRESS';
      solver: string;
      pct: number;
    }
  | {
      type: 'COMPLETE';
      results: SolverBenchmarkResult[];
    };

self.onmessage = (event: MessageEvent<WorkerBenchmarkRequest>) => {
  const msg = event.data;
  if (msg.type !== 'RUN_BENCHMARK') return;

  const { scenarioId, seed, loads, vehicles, nodes } = msg;

  self.postMessage({ type: 'PROGRESS', solver: 'Greedy first-come', pct: 35 } satisfies WorkerBenchmarkResponse);
  const greedy = runGreedyFirstCome({ loads, vehicles, nodes, scenarioId, seed });
  self.postMessage({ type: 'PROGRESS', solver: 'Greedy first-come', pct: 100 } satisfies WorkerBenchmarkResponse);

  self.postMessage({ type: 'PROGRESS', solver: 'Local-search router', pct: 30 } satisfies WorkerBenchmarkResponse);
  const localSearch = runLocalSearchRouter({ loads, vehicles, nodes, scenarioId, seed });
  self.postMessage({ type: 'PROGRESS', solver: 'Local-search router', pct: 100 } satisfies WorkerBenchmarkResponse);

  const annealing = runQuboAnnealingSolver({
    loads,
    vehicles,
    nodes,
    scenarioId,
    seed,
    iterations: scenarioId === 'harvest_peak' ? 1350 : 950,
    onProgress: (pct) => {
      self.postMessage({ type: 'PROGRESS', solver: 'Annealing (QUBO)', pct } satisfies WorkerBenchmarkResponse);
    },
  });

  self.postMessage({
    type: 'COMPLETE',
    results: [greedy, localSearch, annealing],
  } satisfies WorkerBenchmarkResponse);
};
