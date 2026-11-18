import type { DailySeriesPoint, GeoNode } from '@/types/domain';

export interface VillageDemandForecast {
  nodeId: string;
  villageName: string;
  taluka: string;
  lat: number;
  lng: number;
  predictedQuintals: number;
  intensity: number; // 0..1
  expectedHourlyEarningsInr: number;
  topCrop: string;
  moveHereRecommended: boolean;
}

/**
 * Forecasts next-day village freight demand from seasonal crop momentum,
 * recent 7-day mandi arrivals, and weather conditions.
 */
export function forecastNextDayDemand(
  nodes: GeoNode[],
  series: DailySeriesPoint[],
  rainMultiplier = 1,
): VillageDemandForecast[] {
  const villages = nodes.filter((n) => n.kind === 'village');
  const recent = series.slice(-7);
  const avgArrivals =
    recent.length > 0
      ? recent.reduce((acc, d) => acc + d.mandiArrivalQuintals, 0) / recent.length
      : 480;
  const latestRain = (recent[recent.length - 1]?.rainMm ?? 3) * rainMultiplier;
  const momentum = Math.max(0.75, Math.min(1.4, avgArrivals / 460));
  const rainDampener = latestRain > 22 ? 0.84 : latestRain > 8 ? 0.94 : 1.05;

  const cropByTaluka: Record<string, string> = {
    Kolar: 'Tomato & Beans',
    Srinivaspur: 'Mango & Tomato',
    Mulbagal: 'Potato & Tomato',
    Malur: 'Capsicum & Flowers',
    Bangarapet: 'Carrot & Cabbage',
    Chintamani: 'Tomato & Ragi',
  };

  const raw = villages.map((v, idx) => {
    const seasonalWave = 1 + 0.18 * Math.sin(idx * 1.37 + recent.length);
    const predictedQuintals = Math.max(
      12,
      Math.round(v.baseDemandQuintals * momentum * rainDampener * seasonalWave),
    );
    return { v, predictedQuintals };
  });

  const maxQ = Math.max(1, ...raw.map((r) => r.predictedQuintals));
  const sorted = [...raw].sort((a, b) => b.predictedQuintals - a.predictedQuintals);
  const topIds = new Set(sorted.slice(0, 4).map((r) => r.v.id));

  return raw.map(({ v, predictedQuintals }) => {
    const intensity = Math.round((predictedQuintals / maxQ) * 100) / 100;
    const expectedHourlyEarningsInr = Math.round(210 + intensity * 265);
    return {
      nodeId: v.id,
      villageName: v.name,
      taluka: v.taluka,
      lat: v.lat,
      lng: v.lng,
      predictedQuintals,
      intensity,
      expectedHourlyEarningsInr,
      topCrop: cropByTaluka[v.taluka] ?? 'Tomato & Vegetables',
      moveHereRecommended: topIds.has(v.id),
    };
  });
}
