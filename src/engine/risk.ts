/**
 * Logistic-style cancellation risk calculator (0 to 100%)
 * combining rainfall, driver reliability score, vehicle age, and route detour ratio.
 */
export function computeCancellationRiskPct(params: {
  rainMm: number;
  reliabilityScore: number; // 0-100
  vehicleAgeYears: number;
  detourRatio: number; // e.g., 0.15 means 15% extra km
  hasStandby: boolean;
}): { riskPct: number; drivers: string[] } {
  const { rainMm, reliabilityScore, vehicleAgeYears, detourRatio, hasStandby } = params;
  const z =
    -2.65 +
    0.048 * Math.min(60, rainMm) +
    2.9 * ((100 - Math.max(50, reliabilityScore)) / 100) +
    0.09 * Math.max(0, vehicleAgeYears - 3) +
    1.85 * Math.max(0, detourRatio) -
    (hasStandby ? 0.55 : 0);

  const prob = 1 / (1 + Math.exp(-z));
  const riskPct = Math.max(2, Math.min(68, Math.round(prob * 100)));

  const drivers: string[] = [];
  if (rainMm > 12) drivers.push(`Heavy rain forecast (${rainMm} mm)`);
  if (reliabilityScore < 88) drivers.push('Moderate historical completion rate');
  if (vehicleAgeYears >= 7) drivers.push(`Older vehicle (${vehicleAgeYears} yrs)`);
  if (detourRatio > 0.22) drivers.push('Multi-village rural detour');
  if (hasStandby) drivers.push('Protected by active standby retainer');
  if (drivers.length === 0) drivers.push('Clear weather & high-reliability operator');

  return { riskPct, drivers };
}
