import { createSeededRng } from './prng';

export interface TwinDayPoint {
  dayLabel: string;
  baselineFillPct: number;
  pooledFillPct: number;
  baselineEmptyKm: number;
  pooledEmptyKm: number;
  baselineCostPerQtl: number;
  pooledCostPerQtl: number;
  spoilageQuintalsSaved: number;
}

export interface TwinSimulationOutput {
  days: TwinDayPoint[];
  summary: {
    avgFillPctA: number;
    avgFillPctB: number;
    emptyKmAvoided: number;
    avgCostPerQtlA: number;
    avgCostPerQtlB: number;
    spoilageSavedQuintals: number;
    healSuccessPct: number;
  };
}

export type TwinPolicyId =
  | 'solo_first_come'
  | 'rolling_pool_shapley'
  | 'tour_return_standby';

export function simulateTalukaTwinWeek(params: {
  harvestIntensityPct: number; // 50..180
  rainMmPerDay: number; // 0..50
  cancellationRatePct: number; // 0..25
  policyA: TwinPolicyId;
  policyB: TwinPolicyId;
}): TwinSimulationOutput {
  const { harvestIntensityPct, rainMmPerDay, cancellationRatePct, policyA, policyB } = params;
  const rng = createSeededRng(
    Math.round(harvestIntensityPct * 13 + rainMmPerDay * 29 + cancellationRatePct * 47),
  );

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const policyParams: Record<
    TwinPolicyId,
    { fillBase: number; emptyFactor: number; costBase: number; standbyShield: number }
  > = {
    solo_first_come: { fillBase: 51, emptyFactor: 0.86, costBase: 146, standbyShield: 0.15 },
    rolling_pool_shapley: { fillBase: 79, emptyFactor: 0.44, costBase: 104, standbyShield: 0.68 },
    tour_return_standby: { fillBase: 88, emptyFactor: 0.24, costBase: 89, standbyShield: 0.94 },
  };

  const pA = policyParams[policyA];
  const pB = policyParams[policyB];
  const intensityFactor = harvestIntensityPct / 100;

  const days: TwinDayPoint[] = dayNames.map((dayLabel, dIdx) => {
    const mandiSurge = dIdx === 2 || dIdx === 5 ? 1.16 : 0.96;
    const jitter = (rng() - 0.5) * 4;
    const rainDrag = rainMmPerDay * 0.19;
    const cancelDragA = cancellationRatePct * (1 - pA.standbyShield) * 0.55;
    const cancelDragB = cancellationRatePct * (1 - pB.standbyShield) * 0.55;

    const fillA = Math.max(
      36,
      Math.min(96, Math.round(pA.fillBase * Math.pow(intensityFactor, 0.22) - cancelDragA + jitter)),
    );
    const fillB = Math.max(
      42,
      Math.min(98, Math.round(pB.fillBase * Math.pow(intensityFactor, 0.28) - cancelDragB + jitter)),
    );

    const dailyTours = Math.round(42 * intensityFactor * mandiSurge);
    const emptyA = Math.round(dailyTours * 28 * pA.emptyFactor * (1 + rainMmPerDay * 0.004));
    const emptyB = Math.round(dailyTours * 28 * pB.emptyFactor * (1 + rainMmPerDay * 0.002));

    const costA = Math.round(pA.costBase + rainDrag + cancelDragA * 1.8 - intensityFactor * 4);
    const costB = Math.round(pB.costBase + rainDrag * 0.55 + cancelDragB * 1.1 - intensityFactor * 7);

    const spoilageSaved = Math.max(
      2,
      Math.round(
        dailyTours * 0.45 * ((pB.standbyShield - pA.standbyShield) * (1 + cancellationRatePct * 0.06) + 0.35),
      ),
    );

    return {
      dayLabel,
      baselineFillPct: fillA,
      pooledFillPct: fillB,
      baselineEmptyKm: emptyA,
      pooledEmptyKm: emptyB,
      baselineCostPerQtl: costA,
      pooledCostPerQtl: costB,
      spoilageQuintalsSaved: spoilageSaved,
    };
  });

  const avgFillPctA = Math.round(days.reduce((a, d) => a + d.baselineFillPct, 0) / days.length);
  const avgFillPctB = Math.round(days.reduce((a, d) => a + d.pooledFillPct, 0) / days.length);
  const emptyKmAvoided = days.reduce(
    (a, d) => a + Math.max(0, d.baselineEmptyKm - d.pooledEmptyKm),
    0,
  );
  const avgCostPerQtlA = Math.round(days.reduce((a, d) => a + d.baselineCostPerQtl, 0) / days.length);
  const avgCostPerQtlB = Math.round(days.reduce((a, d) => a + d.pooledCostPerQtl, 0) / days.length);
  const spoilageSavedQuintals = days.reduce((a, d) => a + d.spoilageQuintalsSaved, 0);
  const healSuccessPct = Math.min(
    99,
    Math.round(74 + pB.standbyShield * 25 - cancellationRatePct * 0.15),
  );

  return {
    days,
    summary: {
      avgFillPctA,
      avgFillPctB,
      emptyKmAvoided,
      avgCostPerQtlA,
      avgCostPerQtlB,
      spoilageSavedQuintals,
      healSuccessPct,
    },
  };
}
