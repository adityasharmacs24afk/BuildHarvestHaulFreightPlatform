import {
  runGreedyFirstCome,
  runLocalSearchRouter,
  runQuboAnnealingSolver,
  type SolverLoadInput,
  type SolverVehicleInput,
} from '@/engine/solvers';
import type { GeoNode, SolverBenchmarkResult } from '@/types/domain';
import type { WorkerBenchmarkRequest, WorkerBenchmarkResponse } from '@/workers/solver.worker';

export async function executeBenchmarkInWorker(params: {
  scenarioId: 'small' | 'medium' | 'harvest_peak';
  seed: number;
  loads: SolverLoadInput[];
  vehicles: SolverVehicleInput[];
  nodes: GeoNode[];
  onProgress?: (solver: string, pct: number) => void;
}): Promise<SolverBenchmarkResult[]> {
  const { scenarioId, seed, loads, vehicles, nodes, onProgress } = params;

  if (typeof Worker !== 'undefined') {
    try {
      return await new Promise<SolverBenchmarkResult[]>((resolve, reject) => {
        const worker = new Worker(new URL('../workers/solver.worker.ts', import.meta.url), {
          type: 'module',
        });
        worker.onmessage = (ev: MessageEvent<WorkerBenchmarkResponse>) => {
          const data = ev.data;
          if (data.type === 'PROGRESS') {
            onProgress?.(data.solver, data.pct);
          } else if (data.type === 'COMPLETE') {
            worker.terminate();
            resolve(data.results);
          }
        };
        worker.onerror = (err) => {
          worker.terminate();
          reject(err);
        };
        const req: WorkerBenchmarkRequest = {
          type: 'RUN_BENCHMARK',
          scenarioId,
          seed,
          loads,
          vehicles,
          nodes,
        };
        worker.postMessage(req);
      });
    } catch {
      // Fallback to main thread below
    }
  }

  onProgress?.('Greedy first-come', 100);
  const r1 = runGreedyFirstCome({ loads, vehicles, nodes, scenarioId, seed });
  onProgress?.('Local-search router', 100);
  const r2 = runLocalSearchRouter({ loads, vehicles, nodes, scenarioId, seed });
  const r3 = runQuboAnnealingSolver({
    loads,
    vehicles,
    nodes,
    scenarioId,
    seed,
    onProgress: (pct) => onProgress?.('Annealing (QUBO)', pct),
  });
  return [r1, r2, r3];
}
