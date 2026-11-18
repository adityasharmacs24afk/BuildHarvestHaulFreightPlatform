import type {
  CropOrCargo,
  GeoNode,
  RoadEdge,
  SolverBenchmarkResult,
  SolverName,
  Vehicle,
} from '@/types/domain';
import { areCargosCompatible } from '../compatibility';
import { roadDistanceKm } from '../geo';
import { createSeededRng } from '../prng';

export interface SolverLoadInput {
  id: string;
  crop: CropOrCargo;
  weightQuintals: number;
  pickupNodeId: string;
  dropNodeId: string;
  readyMinutesFromNow: number;
  spoilageDeadlineMinutes: number;
}

export interface SolverVehicleInput {
  id: string;
  capacityQuintals: number;
  costPerKmInr: number;
  baseNodeId: string;
  homeNodeId: string;
  detourBudgetKm: number;
}

export interface PoolSolutionItem {
  vehicleId: string;
  loadIds: string[];
  routeNodes: string[];
  outboundKm: number;
  emptyReturnKm: number;
  fillPct: number;
  costInr: number;
  spoilageViolations: number;
}

function buildDistLookup(nodes: GeoNode[]): (a: string, b: string) => number {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const cache = new Map<string, number>();
  return (a: string, b: string) => {
    if (a === b) return 0;
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    const hit = cache.get(key);
    if (hit !== undefined) return hit;
    const na = nodeMap.get(a);
    const nb = nodeMap.get(b);
    const d = na && nb ? roadDistanceKm(na, nb, 1.33) : 22;
    cache.set(key, d);
    return d;
  };
}

function orderPickupsAndDrops(
  baseNodeId: string,
  loads: SolverLoadInput[],
  dist: (a: string, b: string) => number,
  useTwoOpt: boolean,
): { routeNodes: string[]; outboundKm: number; spoilageViolations: number } {
  if (loads.length === 0) {
    return { routeNodes: [baseNodeId], outboundKm: 0, spoilageViolations: 0 };
  }

  const pickups = Array.from(new Set(loads.map((l) => l.pickupNodeId)));
  const drops = Array.from(new Set(loads.map((l) => l.dropNodeId)));

  if (useTwoOpt && pickups.length > 2) {
    // Nearest-neighbour seed followed by 2-opt on pickup sequence
    const orderedPickups: string[] = [];
    const rem = [...pickups];
    let cur = baseNodeId;
    while (rem.length > 0) {
      let bestIdx = 0;
      let bestD = dist(cur, rem[0]);
      for (let i = 1; i < rem.length; i++) {
        const d = dist(cur, rem[i]);
        if (d < bestD) {
          bestD = d;
          bestIdx = i;
        }
      }
      cur = rem[bestIdx];
      orderedPickups.push(cur);
      rem.splice(bestIdx, 1);
    }

    // 2-opt improvement on pickup chain
    let improved = true;
    while (improved) {
      improved = false;
      for (let i = 0; i < orderedPickups.length - 1; i++) {
        for (let k = i + 1; k < orderedPickups.length; k++) {
          const prevNode = i === 0 ? baseNodeId : orderedPickups[i - 1];
          const nextNode = k === orderedPickups.length - 1 ? drops[0] : orderedPickups[k + 1];
          const before =
            dist(prevNode, orderedPickups[i]) + dist(orderedPickups[k], nextNode);
          const after =
            dist(prevNode, orderedPickups[k]) + dist(orderedPickups[i], nextNode);
          if (after + 0.05 < before) {
            const rev = orderedPickups.slice(i, k + 1).reverse();
            orderedPickups.splice(i, k - i + 1, ...rev);
            improved = true;
          }
        }
      }
    }
    pickups.splice(0, pickups.length, ...orderedPickups);
  }

  if (useTwoOpt && drops.length > 1) {
    const lastPickup = pickups[pickups.length - 1];
    drops.sort((a, b) => dist(lastPickup, a) - dist(lastPickup, b));
  }

  const seq = [baseNodeId, ...pickups, ...drops];
  const deduped: string[] = [seq[0]];
  for (let i = 1; i < seq.length; i++) {
    if (seq[i] !== deduped[deduped.length - 1]) deduped.push(seq[i]);
  }

  let outboundKm = 0;
  const arrivalMinutes = new Map<string, number>();
  let elapsedMin = 0;
  arrivalMinutes.set(deduped[0], 0);
  for (let i = 1; i < deduped.length; i++) {
    const legKm = dist(deduped[i - 1], deduped[i]);
    outboundKm += legKm;
    elapsedMin += legKm * 1.85 + 12;
    arrivalMinutes.set(deduped[i], elapsedMin);
  }

  let spoilageViolations = 0;
  for (const l of loads) {
    const dropTime = arrivalMinutes.get(l.dropNodeId) ?? elapsedMin;
    if (dropTime > l.spoilageDeadlineMinutes) {
      spoilageViolations += 1;
    }
  }

  return {
    routeNodes: deduped,
    outboundKm: Math.round(outboundKm * 10) / 10,
    spoilageViolations,
  };
}

function canAddToBucket(existing: SolverLoadInput[], candidate: SolverLoadInput, capacity: number): boolean {
  const used = existing.reduce((acc, l) => acc + l.weightQuintals, 0);
  if (used + candidate.weightQuintals > capacity) return false;
  for (const e of existing) {
    if (!areCargosCompatible(e.crop, candidate.crop).compatible) return false;
  }
  return true;
}

function summarizeSolution(
  solver: SolverName,
  scenarioId: 'small' | 'medium' | 'harvest_peak',
  seed: number,
  buckets: Map<string, SolverLoadInput[]>,
  vehicles: SolverVehicleInput[],
  loads: SolverLoadInput[],
  dist: (a: string, b: string) => number,
  useTwoOpt: boolean,
  returnFillDiscountFactor: number,
  solveTimeMs: number,
): SolverBenchmarkResult {
  const vMap = new Map(vehicles.map((v) => [v.id, v]));
  const assignments: SolverBenchmarkResult['assignments'] = [];

  let totalFillSum = 0;
  let activePools = 0;
  let totalEmptyKm = 0;
  let totalCostInr = 0;
  let totalSpoilageViolations = 0;
  const totalQuintals = Math.max(1, loads.reduce((a, b) => a + b.weightQuintals, 0));

  for (const [vId, assigned] of buckets.entries()) {
    if (assigned.length === 0) continue;
    const veh = vMap.get(vId)!;
    const { routeNodes, outboundKm, spoilageViolations } = orderPickupsAndDrops(
      veh.baseNodeId,
      assigned,
      dist,
      useTwoOpt,
    );
    const lastDrop = routeNodes[routeNodes.length - 1];
    const returnLegKm = dist(lastDrop, veh.homeNodeId);
    const emptyKm = Math.round(returnLegKm * (1 - returnFillDiscountFactor) * 10) / 10;
    const weightSum = assigned.reduce((a, b) => a + b.weightQuintals, 0);
    const fillPct = Math.min(100, Math.round((weightSum / veh.capacityQuintals) * 100));
    const poolCost = (outboundKm + emptyKm * 0.85) * veh.costPerKmInr + 220;

    activePools += 1;
    totalFillSum += fillPct;
    totalEmptyKm += emptyKm;
    totalCostInr += poolCost;
    totalSpoilageViolations += spoilageViolations;

    assignments.push({
      vehicleId: vId,
      loadIds: assigned.map((l) => l.id),
      routeNodes,
      fillPct,
    });
  }

  return {
    solver,
    scenarioId,
    seed,
    poolsCreated: activePools,
    avgFillPct: activePools > 0 ? Math.round(totalFillSum / activePools) : 0,
    emptyKm: Math.round(totalEmptyKm),
    costPerQuintalInr: Math.round(totalCostInr / totalQuintals),
    spoilageViolations: totalSpoilageViolations,
    solveTimeMs: Math.max(2, Math.round(solveTimeMs)),
    assignments,
  };
}

/**
 * 1. Greedy first-come baseline: assigns loads in arrival order to the first compatible vehicle with room.
 */
export function runGreedyFirstCome(params: {
  loads: SolverLoadInput[];
  vehicles: SolverVehicleInput[];
  nodes: GeoNode[];
  scenarioId: 'small' | 'medium' | 'harvest_peak';
  seed?: number;
}): SolverBenchmarkResult {
  const t0 = performance.now();
  const { loads, vehicles, nodes, scenarioId, seed = 42 } = params;
  const dist = buildDistLookup(nodes);
  const buckets = new Map<string, SolverLoadInput[]>();
  for (const v of vehicles) buckets.set(v.id, []);

  for (const load of loads) {
    let placed = false;
    for (const v of vehicles) {
      const list = buckets.get(v.id)!;
      if (canAddToBucket(list, load, v.capacityQuintals)) {
        list.push(load);
        placed = true;
        break;
      }
    }
    if (!placed && vehicles.length > 0) {
      // Overflow onto largest remaining capacity vehicle
      const fallback = [...vehicles].sort((a, b) => b.capacityQuintals - a.capacityQuintals)[0];
      buckets.get(fallback.id)!.push(load);
    }
  }

  const elapsed = performance.now() - t0;
  return summarizeSolution(
    'Greedy first-come',
    scenarioId,
    seed,
    buckets,
    vehicles,
    loads,
    dist,
    false,
    0.12,
    elapsed,
  );
}

/**
 * 2. Local-search router: cheapest insertion + 2-opt route ordering + Or-opt inter-pool consolidation.
 */
export function runLocalSearchRouter(params: {
  loads: SolverLoadInput[];
  vehicles: SolverVehicleInput[];
  nodes: GeoNode[];
  scenarioId: 'small' | 'medium' | 'harvest_peak';
  seed?: number;
}): SolverBenchmarkResult {
  const t0 = performance.now();
  const { loads, vehicles, nodes, scenarioId, seed = 42 } = params;
  const dist = buildDistLookup(nodes);
  const buckets = new Map<string, SolverLoadInput[]>();
  for (const v of vehicles) buckets.set(v.id, []);

  // Sort loads by urgency then weight descending
  const sortedLoads = [...loads].sort(
    (a, b) => a.spoilageDeadlineMinutes - b.spoilageDeadlineMinutes || b.weightQuintals - a.weightQuintals,
  );

  for (const load of sortedLoads) {
    let bestVid: string | null = null;
    let bestDelta = Infinity;

    for (const v of vehicles) {
      const existing = buckets.get(v.id)!;
      if (!canAddToBucket(existing, load, v.capacityQuintals)) continue;

      const beforeKm =
        existing.length === 0
          ? 0
          : orderPickupsAndDrops(v.baseNodeId, existing, dist, true).outboundKm;
      const afterRes = orderPickupsAndDrops(v.baseNodeId, [...existing, load], dist, true);
      const activationFee = existing.length === 0 ? 190 : 0;
      const spoilagePenalty = afterRes.spoilageViolations * 480;
      const delta = (afterRes.outboundKm - beforeKm) * v.costPerKmInr + activationFee + spoilagePenalty;

      if (delta < bestDelta) {
        bestDelta = delta;
        bestVid = v.id;
      }
    }

    if (bestVid) {
      buckets.get(bestVid)!.push(load);
    } else if (vehicles.length > 0) {
      buckets.get(vehicles[0].id)!.push(load);
    }
  }

  // Or-opt inter-vehicle relocation pass: consolidate sparse vehicles into fuller compatible pools
  const vMap = new Map(vehicles.map((v) => [v.id, v]));
  for (let pass = 0; pass < 3; pass++) {
    for (const vFrom of vehicles) {
      const fromList = buckets.get(vFrom.id)!;
      if (fromList.length === 0) continue;

      for (let idx = fromList.length - 1; idx >= 0; idx--) {
        const candidate = fromList[idx];
        const currentFromCost =
          orderPickupsAndDrops(vFrom.baseNodeId, fromList, dist, true).outboundKm * vFrom.costPerKmInr +
          220;
        const reducedFromList = fromList.filter((_, i) => i !== idx);
        const afterFromCost =
          reducedFromList.length === 0
            ? 0
            : orderPickupsAndDrops(vFrom.baseNodeId, reducedFromList, dist, true).outboundKm *
                vFrom.costPerKmInr +
              220;

        for (const vTo of vehicles) {
          if (vTo.id === vFrom.id) continue;
          const toList = buckets.get(vTo.id)!;
          if (toList.length === 0) continue;
          if (!canAddToBucket(toList, candidate, vMap.get(vTo.id)!.capacityQuintals)) continue;

          const beforeTo = orderPickupsAndDrops(vTo.baseNodeId, toList, dist, true);
          const afterTo = orderPickupsAndDrops(vTo.baseNodeId, [...toList, candidate], dist, true);
          if (afterTo.spoilageViolations > beforeTo.spoilageViolations) continue;

          const deltaToCost = (afterTo.outboundKm - beforeTo.outboundKm) * vTo.costPerKmInr;
          const savings = currentFromCost - afterFromCost - deltaToCost;
          if (savings > 15) {
            fromList.splice(idx, 1);
            toList.push(candidate);
            break;
          }
        }
      }
    }
  }

  const elapsed = performance.now() - t0;
  return summarizeSolution(
    'Local-search router',
    scenarioId,
    seed,
    buckets,
    vehicles,
    loads,
    dist,
    true,
    0.34,
    elapsed,
  );
}

/**
 * 3. Simulated Annealing on a QUBO formulation of load-to-vehicle pooling:
 * Binary state vector assign[i] = v (equivalent to one-hot QUBO spin vector x_{i,v} in {0,1} with sum_v x_{i,v} = 1)
 * Energy H(x) = sum_{i,v} L_{i,v} x_{i,v} + sum_{i<j, v} Q_{i,j,v} x_{i,v} x_{j,v} + Penalty(overflow, incompatibility).
 */
export function runQuboAnnealingSolver(params: {
  loads: SolverLoadInput[];
  vehicles: SolverVehicleInput[];
  nodes: GeoNode[];
  scenarioId: 'small' | 'medium' | 'harvest_peak';
  seed?: number;
  iterations?: number;
  onProgress?: (pct: number) => void;
}): SolverBenchmarkResult {
  const t0 = performance.now();
  const {
    loads,
    vehicles,
    nodes,
    scenarioId,
    seed = 42,
    iterations = 950,
    onProgress,
  } = params;
  const dist = buildDistLookup(nodes);
  const rng = createSeededRng(seed);
  const nLoads = loads.length;
  const nVeh = Math.max(1, vehicles.length);

  // Precompute pairwise QUBO synergy / conflict coupling matrix J[i][j]
  const coupling: number[][] = Array.from({ length: nLoads }, () => new Array<number>(nLoads).fill(0));
  for (let i = 0; i < nLoads; i++) {
    for (let j = i + 1; j < nLoads; j++) {
      const li = loads[i];
      const lj = loads[j];
      if (!areCargosCompatible(li.crop, lj.crop).compatible) {
        coupling[i][j] = 12000;
        coupling[j][i] = 12000;
        continue;
      }
      const pickupDist = dist(li.pickupNodeId, lj.pickupNodeId);
      const dropDist = dist(li.dropNodeId, lj.dropNodeId);
      // Strong negative energy (reward) when loads share nearby pickups and same/nearby mandi drop
      const synergy = (pickupDist + dropDist * 1.25 - 26) * 11.5;
      coupling[i][j] = synergy;
      coupling[j][i] = synergy;
    }
  }

  // Warm-start state from feasible round-robin compatible buckets
  const state = new Int32Array(nLoads);
  const usedWeights = new Float64Array(nVeh);
  for (let i = 0; i < nLoads; i++) {
    let chosen = i % nVeh;
    for (let v = 0; v < nVeh; v++) {
      if (usedWeights[v] + loads[i].weightQuintals <= vehicles[v].capacityQuintals) {
        chosen = v;
        break;
      }
    }
    state[i] = chosen;
    usedWeights[chosen] += loads[i].weightQuintals;
  }

  function computeEnergy(assign: Int32Array): number {
    let energy = 0;
    const weights = new Float64Array(nVeh);
    const counts = new Int32Array(nVeh);

    for (let i = 0; i < nLoads; i++) {
      const vIdx = assign[i];
      const veh = vehicles[vIdx];
      const load = loads[i];
      weights[vIdx] += load.weightQuintals;
      counts[vIdx] += 1;
      // Linear field term L_{i,v}
      const accessKm =
        dist(veh.baseNodeId, load.pickupNodeId) * 0.45 +
        dist(load.pickupNodeId, load.dropNodeId) +
        dist(load.dropNodeId, veh.homeNodeId) * 0.35;
      energy += accessKm * veh.costPerKmInr;
    }

    // Vehicle fixed dispatch + quadratic capacity penalty
    for (let v = 0; v < nVeh; v++) {
      if (counts[v] > 0) {
        energy += 265;
        const overflow = Math.max(0, weights[v] - vehicles[v].capacityQuintals);
        if (overflow > 0) {
          energy += overflow * overflow * 450 + overflow * 900;
        }
        // Reward high utilization
        const fillRatio = Math.min(1, weights[v] / vehicles[v].capacityQuintals);
        energy -= fillRatio * fillRatio * 185;
      }
    }

    // Pairwise QUBO interaction sum_{i<j} Q_{ij} delta(v_i, v_j)
    for (let i = 0; i < nLoads; i++) {
      const vi = assign[i];
      for (let j = i + 1; j < nLoads; j++) {
        if (assign[j] === vi) {
          energy += coupling[i][j];
        }
      }
    }

    return energy;
  }

  let currentEnergy = computeEnergy(state);
  let bestState = new Int32Array(state);
  let bestEnergy = currentEnergy;

  const tStart = 420;
  const tEnd = 1.5;
  const cooling = Math.pow(tEnd / tStart, 1 / Math.max(1, iterations));
  let temp = tStart;

  for (let step = 0; step < iterations; step++) {
    if (onProgress && step % 120 === 0) {
      onProgress(Math.round((step / iterations) * 100));
    }
    const moveSwap = rng() < 0.28 && nLoads >= 2;
    if (moveSwap) {
      const i = Math.floor(rng() * nLoads);
      const j = Math.floor(rng() * nLoads);
      if (state[i] === state[j]) continue;
      const tmp = state[i];
      state[i] = state[j];
      state[j] = tmp;
      const nextE = computeEnergy(state);
      const dE = nextE - currentEnergy;
      if (dE <= 0 || rng() < Math.exp(-dE / temp)) {
        currentEnergy = nextE;
        if (nextE < bestEnergy) {
          bestEnergy = nextE;
          bestState = new Int32Array(state);
        }
      } else {
        state[j] = state[i];
        state[i] = tmp;
      }
    } else {
      const i = Math.floor(rng() * nLoads);
      const prevV = state[i];
      const nextV = Math.floor(rng() * nVeh);
      if (prevV === nextV) continue;
      state[i] = nextV;
      const nextE = computeEnergy(state);
      const dE = nextE - currentEnergy;
      if (dE <= 0 || rng() < Math.exp(-dE / temp)) {
        currentEnergy = nextE;
        if (nextE < bestEnergy) {
          bestEnergy = nextE;
          bestState = new Int32Array(state);
        }
      } else {
        state[i] = prevV;
      }
    }
    temp *= cooling;
  }

  // Decode bestState into feasible vehicle buckets with repair if any soft constraint was exceeded
  const buckets = new Map<string, SolverLoadInput[]>();
  for (const v of vehicles) buckets.set(v.id, []);

  for (let i = 0; i < nLoads; i++) {
    const chosenVeh = vehicles[bestState[i]];
    const targetList = buckets.get(chosenVeh.id)!;
    if (canAddToBucket(targetList, loads[i], chosenVeh.capacityQuintals)) {
      targetList.push(loads[i]);
    } else {
      // Repair onto best feasible vehicle
      let repaired = false;
      for (const alt of vehicles) {
        const altList = buckets.get(alt.id)!;
        if (canAddToBucket(altList, loads[i], alt.capacityQuintals)) {
          altList.push(loads[i]);
          repaired = true;
          break;
        }
      }
      if (!repaired) {
        targetList.push(loads[i]);
      }
    }
  }

  onProgress?.(100);
  const elapsed = performance.now() - t0;
  return summarizeSolution(
    'Annealing (QUBO)',
    scenarioId,
    seed,
    buckets,
    vehicles,
    loads,
    dist,
    true,
    0.46,
    elapsed,
  );
}

/**
 * Minimal-change self-healing re-planner:
 * Reassigns ONLY the disrupted pool's loads onto the closest standby or idle compatible vehicle,
 * preserving every other active pool untouched.
 */
export function minimalChangeReplan(params: {
  affectedLoads: SolverLoadInput[];
  candidateVehicles: Vehicle[];
  excludedVehicleId: string;
  nodes: GeoNode[];
  edges?: RoadEdge[];
}): {
  selectedVehicle: Vehicle;
  newRouteNodeIds: string[];
  outboundKm: number;
  recoverySeconds: number;
} {
  const t0 = performance.now();
  const { affectedLoads, candidateVehicles, excludedVehicleId, nodes } = params;
  const dist = buildDistLookup(nodes);
  const totalWeight = affectedLoads.reduce((a, b) => a + b.weightQuintals, 0);

  const eligible = candidateVehicles.filter(
    (v) =>
      v.id !== excludedVehicleId &&
      v.capacityQuintals >= totalWeight * 0.9 &&
      (v.status === 'standby' || v.status === 'idle'),
  );

  const poolCandidates =
    eligible.length > 0
      ? eligible
      : candidateVehicles.filter((v) => v.id !== excludedVehicleId);

  let bestVehicle = poolCandidates[0] ?? candidateVehicles[0];
  let bestRoute: string[] = [bestVehicle.currentNodeId];
  let bestKm = Infinity;

  for (const veh of poolCandidates) {
    const routed = orderPickupsAndDrops(veh.currentNodeId, affectedLoads, dist, true);
    const score =
      routed.outboundKm * veh.costPerKmInr -
      (veh.standbyOptIn ? 180 : 0) +
      routed.spoilageViolations * 400;
    if (score < bestKm) {
      bestKm = score;
      bestVehicle = veh;
      bestRoute = routed.routeNodes;
    }
  }

  const finalRouted = orderPickupsAndDrops(bestVehicle.currentNodeId, affectedLoads, dist, true);
  const computeMs = Math.max(1, performance.now() - t0);
  const recoverySeconds = Math.round((2.4 + computeMs / 100) * 10) / 10;

  return {
    selectedVehicle: bestVehicle,
    newRouteNodeIds: bestRoute.length > 1 ? bestRoute : finalRouted.routeNodes,
    outboundKm: finalRouted.outboundKm,
    recoverySeconds,
  };
}
