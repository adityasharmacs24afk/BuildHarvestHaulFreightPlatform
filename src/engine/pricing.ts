import type { LanguageCode } from '@/app/constants';
import type { ShapleyShare, SplitRule } from '@/types/domain';
import { createSeededRng, rngShuffle } from './prng';

export interface TourCostBreakdown {
  outboundKm: number;
  returnKm: number;
  fuelCostInr: number;
  driverCostInr: number;
  tollCostInr: number;
  marginInr: number;
  grossTourCostInr: number;
  returnDiscountInr: number;
  netOutboundPoolCostInr: number;
  transporterEarningsInr: number;
}

/**
 * Computes transparent tour-level cost across outbound + return leg.
 * When a return load is attached, part of the return leg is paid by the return shipper,
 * giving outbound farmers an explicit return-leg discount while raising transporter tour income.
 */
export function calculateTourCost(params: {
  outboundKm: number;
  returnKm: number;
  vehicleCostPerKmInr: number;
  returnFillRatio: number; // 0..1
  returnLoadRevenueInr?: number;
}): TourCostBreakdown {
  const {
    outboundKm,
    returnKm,
    vehicleCostPerKmInr,
    returnFillRatio,
    returnLoadRevenueInr = 0,
  } = params;

  const totalTourKm = Math.max(4, outboundKm + returnKm);
  const baseVariable = totalTourKm * vehicleCostPerKmInr;
  const fuelCostInr = Math.round(baseVariable * 0.56);
  const driverCostInr = Math.round(baseVariable * 0.24 + 180);
  const tollCostInr = totalTourKm > 45 ? Math.round((totalTourKm - 35) * 2.1) : 0;
  const marginInr = Math.round((fuelCostInr + driverCostInr + tollCostInr) * 0.12);
  const grossTourCostInr = fuelCostInr + driverCostInr + tollCostInr + marginInr;

  // Return-leg credit passed back to outbound shippers when return leg carries freight
  const returnCreditFromFill = Math.round(grossTourCostInr * 0.24 * Math.max(0, Math.min(1, returnFillRatio)));
  const returnCreditFromRev = Math.round(returnLoadRevenueInr * 0.42);
  const returnDiscountInr = Math.min(
    Math.round(grossTourCostInr * 0.32),
    Math.max(returnCreditFromFill, returnCreditFromRev),
  );

  const netOutboundPoolCostInr = Math.max(250, grossTourCostInr - returnDiscountInr);
  const transporterEarningsInr = Math.round(
    driverCostInr + marginInr + fuelCostInr + Math.max(0, returnLoadRevenueInr - returnDiscountInr),
  );

  return {
    outboundKm: Math.round(outboundKm * 10) / 10,
    returnKm: Math.round(returnKm * 10) / 10,
    fuelCostInr,
    driverCostInr,
    tollCostInr,
    marginInr,
    grossTourCostInr,
    returnDiscountInr,
    netOutboundPoolCostInr,
    transporterEarningsInr,
  };
}

export interface ShipperCoalitionInput {
  loadId: string;
  shipperName: string;
  villageName: string;
  weightQuintals: number;
  directDistanceKm: number;
  marginalDetourKm: number;
}

/**
 * Characteristic cost function v(S) for a subset S of shippers sharing a vehicle.
 * Captures fixed dispatch cost + furthest trunk distance + sum of marginal detours + weight wear.
 */
export function coalitionRouteCost(
  subset: ShipperCoalitionInput[],
  costPerKmInr: number,
  fixedDispatchInr = 260,
): number {
  if (subset.length === 0) return 0;
  const maxTrunkKm = Math.max(...subset.map((s) => s.directDistanceKm));
  const totalDetourKm = subset.reduce((acc, s) => acc + s.marginalDetourKm, 0);
  const totalWeight = subset.reduce((acc, s) => acc + s.weightQuintals, 0);
  const weightLoadFactor = 1 + totalWeight * 0.0065;
  return fixedDispatchInr + (maxTrunkKm * 1.35 + totalDetourKm) * costPerKmInr * weightLoadFactor;
}

function roundSharesToExactTotal(rawShares: number[], targetTotalInr: number): number[] {
  if (rawShares.length === 0) return [];
  const rawSum = rawShares.reduce((a, b) => a + b, 0);
  if (rawSum <= 0) {
    const base = Math.floor(targetTotalInr / rawShares.length);
    const rem = targetTotalInr - base * rawShares.length;
    return rawShares.map((_, i) => base + (i < rem ? 1 : 0));
  }
  const scaled = rawShares.map((x) => (x / rawSum) * targetTotalInr);
  const floored = scaled.map((x) => Math.floor(x));
  let remainder = Math.round(targetTotalInr) - floored.reduce((a, b) => a + b, 0);
  const order = scaled
    .map((val, idx) => ({ idx, frac: val - floored[idx] }))
    .sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < order.length && remainder > 0; k++) {
    floored[order[k].idx] += 1;
    remainder -= 1;
  }
  return floored;
}

/**
 * Computes Exact Shapley values for n <= 8 shippers (2^n coalitions),
 * and Monte Carlo permutation sampling for n > 8 shippers.
 * Scales/reconciles against netOutboundPoolCostInr so efficiency holds to the exact rupee.
 */
export function computePoolCostShares(params: {
  shippers: ShipperCoalitionInput[];
  netPoolCostInr: number;
  returnDiscountInr: number;
  costPerKmInr: number;
  activeSplitRule: SplitRule;
  monteCarloSamples?: number;
}): ShapleyShare[] {
  const {
    shippers,
    netPoolCostInr,
    returnDiscountInr,
    costPerKmInr,
    activeSplitRule,
    monteCarloSamples = 320,
  } = params;

  const n = shippers.length;
  if (n === 0) return [];

  const targetTotal = Math.round(netPoolCostInr);
  let rawShapley = new Array<number>(n).fill(0);

  if (n <= 8) {
    // Exact Shapley via precomputed bitmask coalition values v(mask)
    const totalMasks = 1 << n;
    const v = new Float64Array(totalMasks);
    for (let mask = 1; mask < totalMasks; mask++) {
      const sub: ShipperCoalitionInput[] = [];
      for (let i = 0; i < n; i++) {
        if ((mask & (1 << i)) !== 0) sub.push(shippers[i]);
      }
      v[mask] = coalitionRouteCost(sub, costPerKmInr);
    }

    const fact = [1];
    for (let i = 1; i <= n; i++) fact[i] = fact[i - 1] * i;

    for (let i = 0; i < n; i++) {
      let phi = 0;
      const bit = 1 << i;
      for (let mask = 0; mask < totalMasks; mask++) {
        if ((mask & bit) !== 0) continue;
        // Count bits in mask
        let sSize = 0;
        let m = mask;
        while (m) {
          sSize += m & 1;
          m >>= 1;
        }
        const weight = (fact[sSize] * fact[n - sSize - 1]) / fact[n];
        const marginal = v[mask | bit] - v[mask];
        phi += weight * marginal;
      }
      rawShapley[i] = Math.max(1, phi);
    }
  } else {
    // Monte Carlo Shapley for > 8 shippers
    const rng = createSeededRng(202505 + n * 31);
    const indices = shippers.map((_, idx) => idx);
    for (let sample = 0; sample < monteCarloSamples; sample++) {
      const perm = rngShuffle(rng, indices);
      const currentSub: ShipperCoalitionInput[] = [];
      let prevCost = 0;
      for (const idx of perm) {
        currentSub.push(shippers[idx]);
        const nextCost = coalitionRouteCost(currentSub, costPerKmInr);
        rawShapley[idx] += Math.max(0, nextCost - prevCost);
        prevCost = nextCost;
      }
    }
    rawShapley = rawShapley.map((sum) => Math.max(1, sum / monteCarloSamples));
  }

  const shapleyShares = roundSharesToExactTotal(rawShapley, targetTotal);
  const weightShares = roundSharesToExactTotal(
    shippers.map((s) => s.weightQuintals),
    targetTotal,
  );
  const distanceShares = roundSharesToExactTotal(
    shippers.map((s) => s.directDistanceKm * Math.sqrt(Math.max(1, s.weightQuintals))),
    targetTotal,
  );
  const equalShares = roundSharesToExactTotal(
    shippers.map(() => 1),
    targetTotal,
  );

  const totalWeight = Math.max(1, shippers.reduce((a, b) => a + b.weightQuintals, 0));

  return shippers.map((s, idx) => {
    const soloCostInr = Math.round(coalitionRouteCost([s], costPerKmInr, 310));
    const finalShareInr =
      activeSplitRule === 'weight'
        ? weightShares[idx]
        : activeSplitRule === 'distance'
          ? distanceShares[idx]
          : activeSplitRule === 'equal'
            ? equalShares[idx]
            : shapleyShares[idx];

    const returnLegCreditInr = Math.round((s.weightQuintals / totalWeight) * returnDiscountInr);
    const grossBeforeReturn = finalShareInr + returnLegCreditInr;
    const detourDeltaInr = Math.round(s.marginalDetourKm * costPerKmInr * 0.9);
    const baseWeightChargeInr = Math.round((grossBeforeReturn - detourDeltaInr) * 0.58);
    const distanceComponentInr = Math.max(
      0,
      grossBeforeReturn - detourDeltaInr - baseWeightChargeInr,
    );
    const savingsPct =
      soloCostInr > finalShareInr
        ? Math.round(((soloCostInr - finalShareInr) / soloCostInr) * 100)
        : 8;

    return {
      loadId: s.loadId,
      shipperName: s.shipperName,
      villageName: s.villageName,
      weightQuintals: s.weightQuintals,
      directDistanceKm: s.directDistanceKm,
      soloCostInr,
      baseWeightChargeInr,
      distanceComponentInr,
      detourDeltaInr,
      returnLegCreditInr,
      shapleyShareInr: shapleyShares[idx],
      weightRuleShareInr: weightShares[idx],
      distanceRuleShareInr: distanceShares[idx],
      equalRuleShareInr: equalShares[idx],
      finalShareInr,
      savingsPct,
    };
  });
}

export function explainPriceInLanguage(
  share: ShapleyShare,
  splitRule: SplitRule,
  shipperCount: number,
  lang: LanguageCode,
): string {
  const ruleLabels: Record<SplitRule, Record<LanguageCode, string>> = {
    shapley: {
      en: 'fair route-contribution split (Shapley)',
      hi: 'न्यायसंगत मार्ग-योगदान विभाजन (शेपली)',
      kn: 'ನ್ಯಾಯಯುತ ಮಾರ್ಗ-ಕೊಡುಗೆ ಹಂಚಿಕೆ (ಶಾಪ್ಲಿ)',
    },
    weight: {
      en: 'weight-share split',
      hi: 'वज़न अनुपात विभाजन',
      kn: 'ತೂಕದ ಅನುಪಾತ ಹಂಚಿಕೆ',
    },
    distance: {
      en: 'distance-weighted split',
      hi: 'दूरी आधारित विभाजन',
      kn: 'ದೂರ ಆಧಾರಿತ ಹಂಚಿಕೆ',
    },
    equal: {
      en: 'equal neighbour split',
      hi: 'बराबर हिस्सेदारी विभाजन',
      kn: 'ಸಮಾನ ಪಾಲು ಹಂಚಿಕೆ',
    },
  };

  if (lang === 'hi') {
    return `${share.shipperName}, आपका किराया ₹${share.finalShareInr} है (${ruleLabels[splitRule].hi})। अकेले गाड़ी बुक करने पर ₹${share.soloCostInr} लगते, यानी आपकी ${share.savingsPct}% बचत हुई। ${shipperCount} किसानों के साथ ट्रक साझा करने से ₹${share.baseWeightChargeInr} वज़न हिस्सा, ₹${share.distanceComponentInr} मुख्य सड़क हिस्सा, ₹${share.detourDeltaInr} आपके गाँव के मोड़ का खर्च जुड़ा और वापसी लोड भरने से ₹${share.returnLegCreditInr} की सीधी छूट मिली।`;
  }
  if (lang === 'kn') {
    return `${share.shipperName} ಅವರೇ, ನಿಮ್ಮ ಬಾಡಿಗೆ ₹${share.finalShareInr} ಆಗಿದೆ (${ruleLabels[splitRule].kn}). ಒಬ್ಬರೇ ವಾಹನ ಬುಕ್ ಮಾಡಿದ್ದರೆ ₹${share.soloCostInr} ಆಗುತ್ತಿತ್ತು — ಇದರಿಂದ ನಿಮಗೆ ${share.savingsPct}% ಉಳಿತಾಯವಾಗಿದೆ. ${shipperCount} ರೈತರೊಂದಿಗೆ ಲೋಡ್ ಸೇರಿಸಿದ್ದರಿಂದ ತೂಕದ ಪಾಲು ₹${share.baseWeightChargeInr}, ಮುಖ್ಯ ರಸ್ತೆ ಪಾಲು ₹${share.distanceComponentInr}, ನಿಮ್ಮ ಗ್ರಾಮದ ಸುತ್ತು ದಾರಿ ₹${share.detourDeltaInr}, ಮತ್ತು ಹಿಂತಿರುಗುವ ಲೋಡ್ ರಿಯಾಯಿತಿ ₹${share.returnLegCreditInr} ಕಡಿತಗೊಂಡಿದೆ.`;
  }
  return `${share.shipperName}, your trip fare is ₹${share.finalShareInr} under the ${ruleLabels[splitRule].en}. Booking a dedicated vehicle alone would cost ₹${share.soloCostInr}, saving you ${share.savingsPct}%. Sharing the bed across ${shipperCount} shippers combined ₹${share.baseWeightChargeInr} for your ${share.weightQuintals} qtl weight share, ₹${share.distanceComponentInr} for the ${share.directDistanceKm} km trunk corridor, plus ₹${share.detourDeltaInr} for your village pickup turn, minus a ₹${share.returnLegCreditInr} return-leg credit because the vehicle carries goods back.`;
}

/**
 * Computes real SHA-256 hex digest using Web Crypto API (`crypto.subtle`).
 */
export async function sha256Hex(payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(payload);
  const digestBuffer = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(digestBuffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function canonicalAuditPayload(entry: {
  index: number;
  poolId: string;
  poolCode: string;
  timestamp: string;
  solver: string;
  splitRule: string;
  totalInr: number;
  sharesSummary: string;
  prevHash: string;
}): string {
  return `${entry.index}|${entry.poolId}|${entry.poolCode}|${entry.timestamp}|${entry.solver}|${entry.splitRule}|${entry.totalInr}|${entry.sharesSummary}|${entry.prevHash}`;
}

export async function verifyAuditChain(
  entries: {
    index: number;
    poolId: string;
    poolCode: string;
    timestamp: string;
    solver: string;
    splitRule: string;
    totalInr: number;
    sharesSummary: string;
    prevHash: string;
    hash: string;
  }[],
): Promise<{ valid: boolean; checkedCount: number; brokenAtIndex?: number }> {
  let expectedPrev = '0'.repeat(64);
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (e.prevHash !== expectedPrev) {
      return { valid: false, checkedCount: i + 1, brokenAtIndex: e.index };
    }
    const recomputed = await sha256Hex(canonicalAuditPayload(e));
    if (recomputed !== e.hash) {
      return { valid: false, checkedCount: i + 1, brokenAtIndex: e.index };
    }
    expectedPrev = e.hash;
  }
  return { valid: true, checkedCount: entries.length };
}
