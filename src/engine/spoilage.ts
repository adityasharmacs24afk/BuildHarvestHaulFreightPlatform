import type { CropOrCargo } from '@/types/domain';
import { CARGO_CATALOG } from './compatibility';

/**
 * Q10 temperature acceleration factor: respiration rate roughly doubles every 10°C above 25°C.
 */
export function adjustedShelfLifeHours(
  crop: CropOrCargo,
  ambientTempC: number,
  freshnessScore = 88,
): number {
  const baseHours = CARGO_CATALOG[crop]?.shelfLifeHoursAt25C ?? 36;
  const q10 = 2.05;
  const tempFactor = Math.pow(q10, (ambientTempC - 25) / 10);
  const freshnessFactor = Math.max(0.35, Math.min(1.08, freshnessScore / 92));
  return Math.max(3, Math.round((baseHours / tempFactor) * freshnessFactor * 10) / 10);
}

export interface SpoilageStatus {
  totalHours: number;
  elapsedHours: number;
  remainingHours: number;
  remainingPct: number;
  urgencyTag: 'calm' | 'watch' | 'urgent';
  ringColor: string;
}

export function computeSpoilageStatus(
  crop: CropOrCargo,
  readyAtIso: string,
  ambientTempC: number,
  freshnessScore: number,
  nowMs = Date.now(),
): SpoilageStatus {
  const totalHours = adjustedShelfLifeHours(crop, ambientTempC, freshnessScore);
  const readyMs = new Date(readyAtIso).getTime();
  const elapsedHours = Math.max(0, (nowMs - readyMs) / 3_600_000);
  const remainingHours = Math.max(0, Math.round((totalHours - elapsedHours) * 10) / 10);
  const remainingPct = Math.max(0, Math.min(100, Math.round((remainingHours / totalHours) * 100)));

  let urgencyTag: 'calm' | 'watch' | 'urgent' = 'calm';
  let ringColor = '#3FA374';
  if (remainingPct <= 25 || remainingHours <= 4) {
    urgencyTag = 'urgent';
    ringColor = '#EF8A6B';
  } else if (remainingPct <= 55 || remainingHours <= 9) {
    urgencyTag = 'watch';
    ringColor = '#F6B93B';
  }

  return {
    totalHours,
    elapsedHours: Math.round(elapsedHours * 10) / 10,
    remainingHours,
    remainingPct,
    urgencyTag,
    ringColor,
  };
}

export interface WaitOrGoPoint {
  waitHours: number;
  poolProbabilityPct: number;
  expectedFreightSavingsInr: number;
  expectedSpoilageLossInr: number;
  netBenefitInr: number;
}

export interface WaitOrGoAdvice {
  points: WaitOrGoPoint[];
  optimalWaitHours: number;
  expectedDiscountPct: number;
  netGainInr: number;
  recommendation: 'wait' | 'dispatch_now';
  headline: string;
}

/**
 * Optimal stopping advisor comparing freight pooling savings against accelerating spoilage loss.
 */
export function evaluateWaitOrGo(params: {
  crop: CropOrCargo;
  weightQuintals: number;
  soloPriceInr: number;
  remainingShelfHours: number;
  villageDemandRatePerHour?: number;
}): WaitOrGoAdvice {
  const {
    crop,
    weightQuintals,
    soloPriceInr,
    remainingShelfHours,
    villageDemandRatePerHour = 0.55,
  } = params;
  const cargoValue = (CARGO_CATALOG[crop]?.valuePerQuintalInr ?? 2200) * weightQuintals;

  const points: WaitOrGoPoint[] = [];
  let bestIdx = 0;

  for (let h = 0; h <= 6; h++) {
    // Poisson arrival probability of at least one compatible neighbour load within h hours
    const poolProb = h === 0 ? 0.18 : 1 - Math.exp(-villageDemandRatePerHour * h) * 0.82;
    const maxPoolDiscountFraction = Math.min(0.34, 0.12 + 0.048 * h);
    const expectedFreightSavingsInr = Math.round(
      h === 0 ? 0 : soloPriceInr * poolProb * maxPoolDiscountFraction,
    );

    // Weibull-like spoilage hazard loss as wait approaches remaining shelf life
    const ratio = h / Math.max(2, remainingShelfHours);
    const hazardFraction = Math.min(0.65, 0.012 * Math.pow(ratio * 4.2, 2.35));
    const expectedSpoilageLossInr = h === 0 ? 0 : Math.round(cargoValue * hazardFraction);
    const netBenefitInr = expectedFreightSavingsInr - expectedSpoilageLossInr;

    points.push({
      waitHours: h,
      poolProbabilityPct: Math.round(poolProb * 100),
      expectedFreightSavingsInr,
      expectedSpoilageLossInr,
      netBenefitInr,
    });

    if (netBenefitInr > points[bestIdx].netBenefitInr) {
      bestIdx = h;
    }
  }

  const best = points[bestIdx];
  const expectedDiscountPct =
    soloPriceInr > 0 ? Math.max(0, Math.round((best.expectedFreightSavingsInr / soloPriceInr) * 100)) : 0;

  const recommendation = best.waitHours >= 1 && best.netBenefitInr >= 45 ? 'wait' : 'dispatch_now';
  const headline =
    recommendation === 'wait'
      ? `Wait ${best.waitHours} ${best.waitHours === 1 ? 'hour' : 'hours'} for an estimated ${expectedDiscountPct}% cheaper shared pool (net +₹${best.netBenefitInr})`
      : 'Dispatch immediately on the next available vehicle to protect crop freshness';

  return {
    points,
    optimalWaitHours: best.waitHours,
    expectedDiscountPct,
    netGainInr: Math.max(0, best.netBenefitInr),
    recommendation,
    headline,
  };
}

/**
 * Deterministic client-side produce photo freshness analyser using byte/pixel colour & brightness heuristics.
 */
export function analyseProduceFreshnessFromStats(params: {
  avgR: number;
  avgG: number;
  avgB: number;
  brightness: number;
  fileHashSeed: number;
  crop: CropOrCargo;
}): {
  freshnessScore: number;
  urgencyTag: 'calm' | 'watch' | 'urgent';
  colourNote: string;
  estimatedHoursAt28C: number;
} {
  const { avgR, avgG, avgB, brightness, fileHashSeed, crop } = params;
  const saturation =
    (Math.max(avgR, avgG, avgB) - Math.min(avgR, avgG, avgB)) / Math.max(1, Math.max(avgR, avgG, avgB));
  const brightnessPenalty = brightness < 55 ? 14 : brightness > 235 ? 8 : 0;
  const hashJitter = ((fileHashSeed % 13) - 6);

  const rawScore = Math.round(68 + saturation * 28 - brightnessPenalty + hashJitter);
  const freshnessScore = Math.max(44, Math.min(97, rawScore));
  const estimatedHoursAt28C = adjustedShelfLifeHours(crop, 28, freshnessScore);

  let urgencyTag: 'calm' | 'watch' | 'urgent' = 'calm';
  let colourNote = 'Firm skin sheen and vibrant pigment; well suited for a 2 to 3 hour pooling window.';

  if (freshnessScore < 62) {
    urgencyTag = 'urgent';
    colourNote = 'Advanced ripening tones detected; prioritise fast dispatch with minimal waiting.';
  } else if (freshnessScore < 78) {
    urgencyTag = 'watch';
    colourNote = 'Mid-stage harvest maturity; safe to pool within a 2 hour pickup window.';
  }

  return {
    freshnessScore,
    urgencyTag,
    colourNote,
    estimatedHoursAt28C,
  };
}
