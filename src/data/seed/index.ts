import { evaluatePolicyOnTaluka } from '@/engine/behaviour';
import { interpolateAlongNodes, roadDistanceKm } from '@/engine/geo';
import {
  calculateTourCost,
  canonicalAuditPayload,
  computePoolCostShares,
  sha256Hex,
} from '@/engine/pricing';
import { createSeededRng, rngInt } from '@/engine/prng';
import { computeCancellationRiskPct } from '@/engine/risk';
import type {
  AppNotification,
  BusinessProfile,
  ChatMessage,
  CreditApplication,
  CropOrCargo,
  DailySeriesPoint,
  DisputeCase,
  FarmerProfile,
  FpoAnnouncement,
  FpoProfile,
  GeoNode,
  HistoricalTrip,
  KioskOfflineBooking,
  KioskOperator,
  LedgerEntry,
  LoadRequest,
  OnboardingApplication,
  PolicySimulationResult,
  Pool,
  PoolStop,
  PriceAuditEntry,
  ReturnLegOffer,
  RoadEdge,
  SelfHealRecord,
  StandingOrder,
  SyntheticPersona,
  TransporterProfile,
  UserAccount,
  Vehicle,
  VoicePhraseSeed,
} from '@/types/domain';
import {
  buildRoadGraph,
  generatePeopleAndOrgs,
  KOLAR_NODES,
  SYNTHETIC_PERSONAS,
  VOICE_PHRASE_LIBRARY,
} from './geographyAndUsers';

export interface PlatformWorldState {
  seededAt: string;
  nodes: GeoNode[];
  edges: RoadEdge[];
  accounts: UserAccount[];
  fpos: FpoProfile[];
  farmers: FarmerProfile[];
  transporters: TransporterProfile[];
  vehicles: Vehicle[];
  businesses: BusinessProfile[];
  kiosks: KioskOperator[];
  loads: LoadRequest[];
  pools: Pool[];
  returnLegOffers: ReturnLegOffer[];
  standingOrders: StandingOrder[];
  historicalTrips: HistoricalTrip[];
  ledger: LedgerEntry[];
  disputes: DisputeCase[];
  auditChain: PriceAuditEntry[];
  selfHealHistory: SelfHealRecord[];
  onboardingQueue: OnboardingApplication[];
  creditApplications: CreditApplication[];
  notifications: AppNotification[];
  chatMessages: ChatMessage[];
  fpoAnnouncements: FpoAnnouncement[];
  kioskOfflineQueue: KioskOfflineBooking[];
  dailySeries: DailySeriesPoint[];
  personas: SyntheticPersona[];
  policyRuns: PolicySimulationResult[];
  voicePhrases: VoicePhraseSeed[];
}

function isoOffsetHours(nowMs: number, hoursDelta: number): string {
  return new Date(nowMs + hoursDelta * 3_600_000).toISOString();
}

function isoOffsetDays(nowMs: number, daysDelta: number, hourOfDay = 8): string {
  const d = new Date(nowMs + daysDelta * 86_400_000);
  d.setHours(hourOfDay, 15, 0, 0);
  return d.toISOString();
}

export function generateInitialWorld(nowMs = Date.now()): PlatformWorldState {
  const rng = createSeededRng(20260418);
  const nodes = KOLAR_NODES;
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const edges = buildRoadGraph(nodes);
  const { accounts, fpos, farmers, transporters, vehicles, businesses, kiosks, rngPick } =
    generatePeopleAndOrgs();

  const villages = nodes.filter((n) => n.kind === 'village');
  const mandis = nodes.filter((n) => n.kind === 'mandi');
  const crops: CropOrCargo[] = ['tomato', 'potato', 'beans', 'carrot', 'cabbage', 'capsicum', 'ragi', 'mango', 'flowers'];

  // 1. 90 days of weather, crop modal prices, and mandi arrival series
  const dailySeries: DailySeriesPoint[] = [];
  for (let d = 89; d >= 0; d--) {
    const dateStr = new Date(nowMs - d * 86_400_000).toISOString().slice(0, 10);
    const seasonWave = Math.sin((90 - d) / 9.5);
    const rainMm = rng() < 0.24 ? rngInt(rng, 4, 34) : rng() < 0.15 ? rngInt(rng, 1, 4) : 0;
    const tempMaxC = Math.round((28.5 + seasonWave * 3.1 - (rainMm > 10 ? 2.4 : 0)) * 10) / 10;
    const tomatoModalPriceInr = Math.round(1950 + seasonWave * 420 + (rainMm > 15 ? 240 : 0) + rngInt(rng, -90, 90));
    const potatoModalPriceInr = Math.round(1780 + Math.cos(d / 12) * 190 + rngInt(rng, -50, 50));
    const beansModalPriceInr = Math.round(3250 + seasonWave * 360 + rngInt(rng, -110, 110));
    const mandiArrivalQuintals = Math.round(440 + seasonWave * 85 - rainMm * 2.4 + rngInt(rng, -35, 40));
    const progressFactor = (90 - d) / 90; // network improves over 90 days
    const emptyKmPct = Math.round(48 - progressFactor * 21 + rngInt(rng, -2, 2));
    const avgFillPct = Math.round(58 + progressFactor * 26 + rngInt(rng, -3, 3));

    dailySeries.push({
      date: dateStr,
      rainMm,
      tempMaxC,
      tomatoModalPriceInr,
      potatoModalPriceInr,
      beansModalPriceInr,
      mandiArrivalQuintals,
      emptyKmPct,
      avgFillPct,
    });
  }

  // 2. 450 Historical Trips across last 90 days + ~560 historical ledger entries
  const historicalTrips: HistoricalTrip[] = [];
  const ledger: LedgerEntry[] = [];

  for (let i = 0; i < 450; i++) {
    const daysAgo = 90 - Math.floor((i / 450) * 89) - 1;
    const trans = transporters[i % transporters.length];
    const veh = vehicles.find((v) => v.id === trans.vehicleIds[0])!;
    const orig = villages[(i * 3) % villages.length];
    const dest = mandis[i % mandis.length];
    const distKm = roadDistanceKm(orig, dest, 1.32);
    const outboundFillPct = rngInt(rng, 52, 92);
    const returnFillPct = i % 3 === 0 ? rngInt(rng, 45, 82) : rngInt(rng, 0, 18);
    const quintals = Math.max(4, Math.round((veh.capacityQuintals * outboundFillPct) / 100));
    const cancelled = i % 17 === 8; // ~5.8% cancellation rate
    const emptyKm = Math.round(distKm * (1 - returnFillPct / 100));
    const pricePerQuintalInr = rngInt(rng, 78, 128);
    const earned = cancelled ? 0 : Math.round(quintals * pricePerQuintalInr * 0.88 + (returnFillPct > 30 ? 640 : 0));
    const shadowPlannedEarnedInr = Math.round(
      veh.capacityQuintals * 0.86 * pricePerQuintalInr * 0.92 + distKm * 15,
    );
    const tripDate = isoOffsetDays(nowMs, -daysAgo, 6 + (i % 9));

    historicalTrips.push({
      id: `htrip_${i + 1}`,
      date: tripDate,
      transporterId: trans.id,
      vehiclePlate: veh.plate,
      originNodeId: orig.id,
      destinationNodeId: dest.id,
      crop: crops[i % crops.length],
      quintals,
      outboundFillPct,
      returnFillPct,
      distanceKm: distKm,
      emptyKm,
      pricePerQuintalInr,
      transporterEarnedInr: earned,
      shadowPlannedEarnedInr,
      rating: rngInt(rng, 4, 5),
      cancelled,
      onTime: !cancelled && i % 11 !== 4,
    });

    if (i < 285) {
      const poolCode = `HH-KLR-${1100 + i}`;
      const farmer = farmers[i % farmers.length];
      if (cancelled) {
        ledger.push({
          id: `led_hist_ref_${i + 1}`,
          timestamp: tripDate,
          poolCode,
          partyName: farmer.name,
          partyRole: 'farmer',
          kind: 'refunded',
          amountInr: quintals * pricePerQuintalInr,
          upiRef: `UPI${8840100 + i}`,
          status: 'settled',
          notes: 'Automatic instant refund on cancelled leg',
        });
      } else {
        ledger.push({
          id: `led_hist_col_${i + 1}`,
          timestamp: tripDate,
          poolCode,
          partyName: farmer.name,
          partyRole: 'farmer',
          kind: 'released',
          amountInr: quintals * pricePerQuintalInr,
          upiRef: `UPI${7410200 + i}`,
          status: 'settled',
          notes: 'Escrow released on mandi weighbridge confirmation',
        });
        ledger.push({
          id: `led_hist_pay_${i + 1}`,
          timestamp: tripDate,
          poolCode,
          partyName: trans.name,
          partyRole: 'transporter',
          kind: 'payout',
          amountInr: earned,
          upiRef: `IMPS${9120400 + i}`,
          status: 'settled',
          notes: `Tour settlement (${veh.plate})`,
        });
      }
    }
  }

  // 3. Return-Leg Offers (3 attached/pre-sold + 4 open along Srinivaspur, Mulbagal, Malur corridors)
  const returnLegOffers: ReturnLegOffer[] = [
    {
      id: 'ret_1',
      businessId: 'biz_1',
      businessName: 'Chowdeshwari Agro Inputs',
      cargo: 'fertiliser',
      weightQuintals: 14,
      originNodeId: 'd_kolar_agro',
      destinationNodeId: 'v_srinivaspur',
      date: isoOffsetHours(nowMs, 2),
      ratePerQuintalInr: 68,
      totalOfferInr: 952,
      tourDiscountPct: 22,
      attachedPoolId: 'pool_1',
      status: 'attached',
    },
    {
      id: 'ret_2',
      businessId: 'biz_12',
      businessName: 'Narasapura Crate & Pack Supply',
      cargo: 'crates_packaging',
      weightQuintals: 10,
      originNodeId: 'c_narasapura_cold',
      destinationNodeId: 'v_vemgal',
      date: isoOffsetHours(nowMs, 3),
      ratePerQuintalInr: 62,
      totalOfferInr: 620,
      tourDiscountPct: 24,
      attachedPoolId: 'pool_2',
      status: 'attached',
    },
    {
      id: 'ret_3',
      businessId: 'biz_3',
      businessName: 'Malur Poultry Feed Mill',
      cargo: 'poultry_feed',
      weightQuintals: 18,
      originNodeId: 'f_malur_feed',
      destinationNodeId: 'v_bangarapet',
      date: isoOffsetHours(nowMs, 4),
      ratePerQuintalInr: 72,
      totalOfferInr: 1296,
      tourDiscountPct: 20,
      attachedPoolId: 'pool_3',
      status: 'attached',
    },
    {
      id: 'ret_4',
      businessId: 'biz_7',
      businessName: 'Srinivaspur Krishi Kendra',
      cargo: 'fertiliser',
      weightQuintals: 15,
      originNodeId: 'd_kolar_agro',
      destinationNodeId: 'v_srinivaspur',
      date: isoOffsetHours(nowMs, 3.5),
      ratePerQuintalInr: 74,
      totalOfferInr: 1110,
      tourDiscountPct: 19,
      status: 'open',
    },
    {
      id: 'ret_5',
      businessId: 'biz_1',
      businessName: 'Chowdeshwari Agro Inputs',
      cargo: 'crates_packaging',
      weightQuintals: 12,
      originNodeId: 'm_kolar_apmc',
      destinationNodeId: 'v_holur',
      date: isoOffsetHours(nowMs, 2.5),
      ratePerQuintalInr: 66,
      totalOfferInr: 792,
      tourDiscountPct: 23,
      status: 'open',
    },
    {
      id: 'ret_6',
      businessId: 'biz_5',
      businessName: 'Mulbagal Rythu Bhandar',
      cargo: 'fertiliser',
      weightQuintals: 16,
      originNodeId: 'd_kolar_agro',
      destinationNodeId: 'v_mulbagal',
      date: isoOffsetHours(nowMs, 5),
      ratePerQuintalInr: 70,
      totalOfferInr: 1120,
      tourDiscountPct: 21,
      status: 'open',
    },
    {
      id: 'ret_7',
      businessId: 'biz_6',
      businessName: 'Malur Haritha Seeds & NPK',
      cargo: 'crates_packaging',
      weightQuintals: 11,
      originNodeId: 'm_blr_kr',
      destinationNodeId: 'v_malur',
      date: isoOffsetHours(nowMs, 4.5),
      ratePerQuintalInr: 78,
      totalOfferInr: 858,
      tourDiscountPct: 18,
      status: 'open',
    },
  ];

  // 4. 35 Live Shipments (Loads) across stages
  // Stage breakdown:
  // - Loads 1..9: 3 active en_route/confirmed pools (3 loads each) — Load 1 belongs to Ramesh Gowda!
  // - Loads 10..20: 5 forming/offered pools (2-3 loads each)
  // - Loads 21..32: 12 pending requested loads waiting to pool
  // - Loads 33..35: 3 delivered_awaiting_confirm loads (Load 33 belongs to Ramesh Gowda for 1-tap confirm & rate!)
  const loads: LoadRequest[] = [];

  function makeLoad(params: {
    idx: number;
    farmer: FarmerProfile;
    crop: CropOrCargo;
    weight: number;
    pickupId: string;
    dropId: string;
    status: LoadRequest['status'];
    poolId?: string;
    readyHoursDelta: number;
    paymentStatus: LoadRequest['paymentStatus'];
    freshness?: number;
  }): LoadRequest {
    const pNode = nodeMap.get(params.pickupId)!;
    const dNode = nodeMap.get(params.dropId)!;
    const distKm = roadDistanceKm(pNode, dNode, 1.32);
    const soloPriceInr = Math.round(310 + distKm * 22 * (1 + params.weight * 0.006));
    const quotedPriceInr = Math.round(soloPriceInr * 0.72);
    const freshnessScore = params.freshness ?? rngInt(rng, 74, 95);
    const urgencyTag: LoadRequest['urgencyTag'] =
      freshnessScore < 65 ? 'urgent' : freshnessScore < 80 ? 'watch' : 'calm';

    return {
      id: `load_${params.idx}`,
      shipperId: params.farmer.id,
      shipperName: params.farmer.name,
      shipperRole: 'farmer',
      shipperPhone: params.farmer.phone,
      crop: params.crop,
      weightQuintals: params.weight,
      unitLabel: `${params.weight} quintal`,
      pickupNodeId: params.pickupId,
      dropNodeId: params.dropId,
      readyAt: isoOffsetHours(nowMs, params.readyHoursDelta),
      latestDispatchAt: isoOffsetHours(nowMs, params.readyHoursDelta + 9),
      maxWaitHours: 3,
      minDiscountPct: 15,
      freshnessScore,
      urgencyTag,
      ambientTempC: 28.5,
      status: params.status,
      poolId: params.poolId,
      quotedPriceInr,
      soloPriceInr,
      paymentStatus: params.paymentStatus,
      isReturnLoad: false,
      createdAt: isoOffsetHours(nowMs, params.readyHoursDelta - 1.5),
    };
  }

  // Pool 1 (en_route): Vemgal -> Narasapura -> Kolar Town -> Kolar APMC (includes Ramesh Gowda!)
  loads.push(
    makeLoad({ idx: 1, farmer: farmers[0], crop: 'tomato', weight: 8, pickupId: 'v_vemgal', dropId: 'm_kolar_apmc', status: 'en_route', poolId: 'pool_1', readyHoursDelta: -1.5, paymentStatus: 'escrow_held', freshness: 89 }),
    makeLoad({ idx: 2, farmer: farmers[7], crop: 'beans', weight: 6, pickupId: 'v_narasapura', dropId: 'm_kolar_apmc', status: 'en_route', poolId: 'pool_1', readyHoursDelta: -1.3, paymentStatus: 'escrow_held', freshness: 84 }),
    makeLoad({ idx: 3, farmer: farmers[12], crop: 'capsicum', weight: 5, pickupId: 'v_kolar', dropId: 'm_kolar_apmc', status: 'en_route', poolId: 'pool_1', readyHoursDelta: -1.1, paymentStatus: 'unpaid', freshness: 91 }),
  );

  // Pool 2 (en_route - self-healed recently!): Kyalanur -> Vemgal -> Bengaluru Yeshwantpur
  loads.push(
    makeLoad({ idx: 4, farmer: farmers[3], crop: 'tomato', weight: 14, pickupId: 'v_kyalanur', dropId: 'm_blr_yeshwantpur', status: 'en_route', poolId: 'pool_2', readyHoursDelta: -2.2, paymentStatus: 'escrow_held', freshness: 82 }),
    makeLoad({ idx: 5, farmer: farmers[8], crop: 'carrot', weight: 12, pickupId: 'v_vemgal', dropId: 'm_blr_yeshwantpur', status: 'en_route', poolId: 'pool_2', readyHoursDelta: -2.0, paymentStatus: 'escrow_held', freshness: 88 }),
    makeLoad({ idx: 6, farmer: farmers[15], crop: 'cabbage', weight: 11, pickupId: 'v_narasapura', dropId: 'm_blr_yeshwantpur', status: 'en_route', poolId: 'pool_2', readyHoursDelta: -1.8, paymentStatus: 'escrow_held', freshness: 86 }),
  );

  // Pool 3 (confirmed, ready for trip execution checklist by Mohan/Kiran): Malur -> Tekal -> Bangarapet -> Kolar APMC
  loads.push(
    makeLoad({ idx: 7, farmer: farmers[4], crop: 'potato', weight: 9, pickupId: 'v_malur', dropId: 'm_kolar_apmc', status: 'confirmed', poolId: 'pool_3', readyHoursDelta: -0.4, paymentStatus: 'escrow_held', freshness: 93 }),
    makeLoad({ idx: 8, farmer: farmers[10], crop: 'carrot', weight: 6, pickupId: 'v_tekal', dropId: 'm_kolar_apmc', status: 'confirmed', poolId: 'pool_3', readyHoursDelta: -0.3, paymentStatus: 'escrow_held', freshness: 87 }),
    makeLoad({ idx: 9, farmer: farmers[16], crop: 'cabbage', weight: 4, pickupId: 'v_vakkaleri', dropId: 'm_kolar_apmc', status: 'confirmed', poolId: 'pool_3', readyHoursDelta: -0.2, paymentStatus: 'escrow_held', freshness: 85 }),
  );

  // 5 Forming / Offered Pools (pool_4 .. pool_8) -> Loads 10..20 (11 loads)
  const formingSpecs: { poolId: string; items: [number, CropOrCargo, number, string, string][] }[] = [
    {
      poolId: 'pool_4',
      items: [
        [1, 'mango', 10, 'v_srinivaspur', 'm_blr_yeshwantpur'],
        [14, 'mango', 8, 'v_ronur', 'm_blr_yeshwantpur'],
        [19, 'beans', 7, 'v_holur', 'm_blr_yeshwantpur'],
      ],
    },
    {
      poolId: 'pool_5',
      items: [
        [6, 'potato', 11, 'v_mulbagal', 'm_kolar_apmc'],
        [21, 'potato', 8, 'v_devarayasamudra', 'm_kolar_apmc'],
      ],
    },
    {
      poolId: 'pool_6',
      items: [
        [22, 'flowers', 5, 'v_lakkur', 'm_blr_kr'],
        [25, 'flowers', 6, 'v_malur', 'm_blr_kr'],
      ],
    },
    {
      poolId: 'pool_7',
      items: [
        [27, 'tomato', 9, 'v_sugatur', 'm_kolar_apmc'],
        [29, 'capsicum', 7, 'v_holur', 'm_kolar_apmc'],
      ],
    },
    {
      poolId: 'pool_8',
      items: [
        [31, 'ragi', 12, 'v_chintamani', 'm_srinivaspur'],
        [34, 'potato', 9, 'v_kaiwara', 'm_srinivaspur'],
      ],
    },
  ];

  let loadIdx = 10;
  for (const spec of formingSpecs) {
    for (const [fIdx, crop, w, pId, dId] of spec.items) {
      loads.push(
        makeLoad({
          idx: loadIdx++,
          farmer: farmers[fIdx],
          crop,
          weight: w,
          pickupId: pId,
          dropId: dId,
          status: 'pooling',
          poolId: spec.poolId,
          readyHoursDelta: 1.5,
          paymentStatus: 'unpaid',
        }),
      );
    }
  }

  // 12 Pending Requests (Loads 21..32)
  for (let p = 0; p < 12; p++) {
    const f = farmers[(35 + p) % farmers.length];
    const pNode = villages[(p * 2 + 1) % villages.length];
    const dNode = mandis[p % mandis.length];
    loads.push(
      makeLoad({
        idx: loadIdx++,
        farmer: f,
        crop: crops[(p + 2) % crops.length],
        weight: rngInt(rng, 5, 16),
        pickupId: pNode.id,
        dropId: dNode.id,
        status: 'requested',
        readyHoursDelta: 2 + (p % 4),
        paymentStatus: 'unpaid',
        freshness: p === 2 ? 59 : rngInt(rng, 72, 94),
      }),
    );
  }

  // 3 Delivered Awaiting Weight Confirmation & Rating (Loads 33..35, Load 33 = Ramesh Gowda)
  loads.push(
    makeLoad({ idx: 33, farmer: farmers[0], crop: 'tomato', weight: 12, pickupId: 'v_vemgal', dropId: 'm_kolar_apmc', status: 'delivered_awaiting_confirm', poolId: 'pool_9', readyHoursDelta: -6.5, paymentStatus: 'escrow_held', freshness: 87 }),
    makeLoad({ idx: 34, farmer: farmers[2], crop: 'beans', weight: 7, pickupId: 'v_narasapura', dropId: 'm_kolar_apmc', status: 'delivered_awaiting_confirm', poolId: 'pool_9', readyHoursDelta: -6.2, paymentStatus: 'escrow_held', freshness: 84 }),
    makeLoad({ idx: 35, farmer: farmers[5], crop: 'capsicum', weight: 6, pickupId: 'v_kolar', dropId: 'm_kolar_apmc', status: 'delivered_awaiting_confirm', poolId: 'pool_9', readyHoursDelta: -6.0, paymentStatus: 'escrow_held', freshness: 90 }),
  );

  // 5. Build Pools with real Tour Pricing + Exact Shapley Shares + LIFO Stops
  function buildPoolFromLoads(cfg: {
    id: string;
    code: string;
    poolLoads: LoadRequest[];
    vehicle: Vehicle;
    transporter: TransporterProfile;
    status: Pool['status'];
    progressPct: number;
    returnOffer?: ReturnLegOffer;
    splitRule?: Pool['splitRule'];
    solverUsed?: Pool['solverUsed'];
    checklistStep?: number;
    healedFromPoolId?: string;
    recoverySeconds?: number;
  }): Pool {
    const {
      id,
      code,
      poolLoads,
      vehicle,
      transporter,
      status,
      progressPct,
      returnOffer,
      splitRule = 'shapley',
      solverUsed = 'Annealing (QUBO)',
      checklistStep = 0,
    } = cfg;

    const pickupIds = Array.from(new Set(poolLoads.map((l) => l.pickupNodeId)));
    const dropIds = Array.from(new Set(poolLoads.map((l) => l.dropNodeId)));
    const routeNodeIds = Array.from(new Set([vehicle.baseVillageId, ...pickupIds, ...dropIds]));

    let outboundKm = 0;
    for (let i = 1; i < routeNodeIds.length; i++) {
      outboundKm += roadDistanceKm(nodeMap.get(routeNodeIds[i - 1])!, nodeMap.get(routeNodeIds[i])!, 1.31);
    }

    const lastDrop = routeNodeIds[routeNodeIds.length - 1];
    const returnRouteNodeIds = returnOffer
      ? Array.from(new Set([lastDrop, returnOffer.originNodeId, returnOffer.destinationNodeId, vehicle.homeVillageId]))
      : [lastDrop, vehicle.homeVillageId];

    let returnKm = 0;
    for (let i = 1; i < returnRouteNodeIds.length; i++) {
      returnKm += roadDistanceKm(
        nodeMap.get(returnRouteNodeIds[i - 1])!,
        nodeMap.get(returnRouteNodeIds[i])!,
        1.31,
      );
    }

    const totalWeightQuintals = poolLoads.reduce((a, l) => a + l.weightQuintals, 0);
    const returnWeightQuintals = returnOffer ? returnOffer.weightQuintals : 0;
    const returnFillRatio = Math.min(1, returnWeightQuintals / vehicle.capacityQuintals);
    const tour = calculateTourCost({
      outboundKm,
      returnKm,
      vehicleCostPerKmInr: vehicle.costPerKmInr,
      returnFillRatio,
      returnLoadRevenueInr: returnOffer?.totalOfferInr ?? 0,
    });

    const coalitionInputs = poolLoads.map((l, idx) => {
      const pNode = nodeMap.get(l.pickupNodeId)!;
      const dNode = nodeMap.get(l.dropNodeId)!;
      return {
        loadId: l.id,
        shipperName: l.shipperName,
        villageName: pNode.name,
        weightQuintals: l.weightQuintals,
        directDistanceKm: roadDistanceKm(pNode, dNode, 1.3),
        marginalDetourKm: idx === 0 ? 1.8 : 3.4 + idx * 1.1,
      };
    });

    const shares = computePoolCostShares({
      shippers: coalitionInputs,
      netPoolCostInr: tour.netOutboundPoolCostInr,
      returnDiscountInr: tour.returnDiscountInr,
      costPerKmInr: vehicle.costPerKmInr,
      activeSplitRule: splitRule,
    });

    // Sync quotedPriceInr on each load to exact pool share
    shares.forEach((sh) => {
      const targetLoad = poolLoads.find((l) => l.id === sh.loadId);
      if (targetLoad) {
        targetLoad.quotedPriceInr = sh.finalShareInr;
        targetLoad.soloPriceInr = sh.soloCostInr;
      }
    });

    const totalLoadsCount = poolLoads.length;
    const stops: PoolStop[] = [
      ...poolLoads.map((l, idx) => ({
        nodeId: l.pickupNodeId,
        kind: 'pickup' as const,
        loadId: l.id,
        shipperFirstName: l.shipperName.split(' ')[0],
        villageName: nodeMap.get(l.pickupNodeId)!.name,
        crop: l.crop,
        weightQuintals: l.weightQuintals,
        eta: isoOffsetHours(nowMs, -0.8 + idx * 0.35),
        lifoSequence: totalLoadsCount - idx,
        completed: progressPct > (idx + 1) * 20,
      })),
      ...poolLoads.map((l, idx) => ({
        nodeId: l.dropNodeId,
        kind: 'drop' as const,
        loadId: l.id,
        shipperFirstName: l.shipperName.split(' ')[0],
        villageName: nodeMap.get(l.dropNodeId)!.name,
        crop: l.crop,
        weightQuintals: l.weightQuintals,
        eta: isoOffsetHours(nowMs, 1.1 + idx * 0.2),
        lifoSequence: idx + 1,
        completed: progressPct >= 100,
      })),
    ];

    // Update vehicle live interpolated position if en_route
    if (status === 'en_route') {
      const pos = interpolateAlongNodes(routeNodeIds, progressPct, nodeMap);
      vehicle.lat = pos.lat;
      vehicle.lng = pos.lng;
      vehicle.headingDeg = pos.headingDeg;
      vehicle.status = 'en_route';
    }

    const cancelRisk = computeCancellationRiskPct({
      rainMm: dailySeries[dailySeries.length - 1]?.rainMm ?? 2,
      reliabilityScore: transporter.reliabilityScore,
      vehicleAgeYears: vehicle.ageYears,
      detourRatio: 0.14,
      hasStandby: true,
    });

    return {
      id,
      code,
      loadIds: poolLoads.map((l) => l.id),
      returnLoadIds: returnOffer ? [returnOffer.id] : [],
      vehicleId: vehicle.id,
      transporterId: transporter.id,
      transporterName: transporter.name,
      transporterPhone: transporter.phone,
      vehiclePlate: vehicle.plate,
      vehicleType: vehicle.type,
      capacityQuintals: vehicle.capacityQuintals,
      totalWeightQuintals,
      returnWeightQuintals,
      fillPct: Math.min(100, Math.round((totalWeightQuintals / vehicle.capacityQuintals) * 100)),
      status,
      stops,
      routeNodeIds,
      returnRouteNodeIds,
      outboundKm: tour.outboundKm,
      returnKm: tour.returnKm,
      emptyKmSaved: returnOffer ? Math.round(tour.returnKm * 0.82) : Math.round(tour.outboundKm * 0.35),
      tourCostInr: tour.netOutboundPoolCostInr,
      fuelCostInr: tour.fuelCostInr,
      driverCostInr: tour.driverCostInr,
      tollCostInr: tour.tollCostInr,
      marginInr: tour.marginInr,
      returnDiscountInr: tour.returnDiscountInr,
      transporterEarningsInr: tour.transporterEarningsInr,
      splitRule,
      votes: poolLoads.slice(0, 2).map((l) => ({
        voterId: l.shipperId,
        voterName: l.shipperName.split(' ')[0],
        choice: splitRule,
      })),
      shares,
      solverUsed,
      cancellationRiskPct: cancelRisk.riskPct,
      spoilageRiskPct: 7,
      progressPct,
      departedAt: status === 'en_route' || status === 'completed' ? isoOffsetHours(nowMs, -1.2) : undefined,
      etaDestination: isoOffsetHours(nowMs, 1.1),
      checklistStep,
      healedFromPoolId: cfg.healedFromPoolId,
      recoverySeconds: cfg.recoverySeconds,
      createdAt: isoOffsetHours(nowMs, -2.5),
    };
  }

  const pools: Pool[] = [
    buildPoolFromLoads({
      id: 'pool_1',
      code: 'HH-KLR-2401',
      poolLoads: loads.slice(0, 3),
      vehicle: vehicles[1], // Bolero Pickup owned by Mohan Kumar (trans_1)
      transporter: transporters[0],
      status: 'en_route',
      progressPct: 54,
      returnOffer: returnLegOffers[0],
      checklistStep: 4,
    }),
    buildPoolFromLoads({
      id: 'pool_2',
      code: 'HH-KLR-2402',
      poolLoads: loads.slice(3, 6),
      vehicle: vehicles[2], // Eicher 14ft owned by Kiran Byregowda (trans_2)
      transporter: transporters[1],
      status: 'en_route',
      progressPct: 38,
      returnOffer: returnLegOffers[1],
      checklistStep: 4,
      healedFromPoolId: 'pool_2_prev',
      recoverySeconds: 3.2,
    }),
    buildPoolFromLoads({
      id: 'pool_3',
      code: 'HH-KLR-2403',
      poolLoads: loads.slice(6, 9),
      vehicle: vehicles[0], // Tata Ace / Mohan Kumar second vehicle
      transporter: transporters[0],
      status: 'confirmed',
      progressPct: 12,
      returnOffer: returnLegOffers[2],
      checklistStep: 1,
      solverUsed: 'Local-search router',
    }),
    // 5 Forming / Offered Pools (pool_4 .. pool_8)
    buildPoolFromLoads({
      id: 'pool_4',
      code: 'HH-KLR-2404',
      poolLoads: loads.filter((l) => l.poolId === 'pool_4'),
      vehicle: vehicles[6],
      transporter: transporters[3],
      status: 'offered',
      progressPct: 0,
    }),
    buildPoolFromLoads({
      id: 'pool_5',
      code: 'HH-KLR-2405',
      poolLoads: loads.filter((l) => l.poolId === 'pool_5'),
      vehicle: vehicles[5],
      transporter: transporters[2],
      status: 'offered',
      progressPct: 0,
      solverUsed: 'Local-search router',
    }),
    buildPoolFromLoads({
      id: 'pool_6',
      code: 'HH-KLR-2406',
      poolLoads: loads.filter((l) => l.poolId === 'pool_6'),
      vehicle: vehicles[4],
      transporter: transporters[2],
      status: 'forming',
      progressPct: 0,
    }),
    buildPoolFromLoads({
      id: 'pool_7',
      code: 'HH-KLR-2407',
      poolLoads: loads.filter((l) => l.poolId === 'pool_7'),
      vehicle: vehicles[9],
      transporter: transporters[4],
      status: 'offered',
      progressPct: 0,
    }),
    buildPoolFromLoads({
      id: 'pool_8',
      code: 'HH-KLR-2408',
      poolLoads: loads.filter((l) => l.poolId === 'pool_8'),
      vehicle: vehicles[11],
      transporter: transporters[5],
      status: 'forming',
      progressPct: 0,
    }),
    // Completed awaiting delivery confirmation pool_9
    buildPoolFromLoads({
      id: 'pool_9',
      code: 'HH-KLR-2399',
      poolLoads: loads.filter((l) => l.poolId === 'pool_9'),
      vehicle: vehicles[1],
      transporter: transporters[0],
      status: 'completed',
      progressPct: 100,
      checklistStep: 6,
    }),
  ];

  // Reconcile active escrow entries in Ledger
  for (const p of pools) {
    for (const sh of p.shares) {
      const ld = loads.find((x) => x.id === sh.loadId);
      if (ld && ld.paymentStatus === 'escrow_held') {
        ledger.unshift({
          id: `led_live_${ld.id}`,
          timestamp: isoOffsetHours(nowMs, -1.4),
          poolCode: p.code,
          loadId: ld.id,
          partyName: ld.shipperName,
          partyRole: 'farmer',
          kind: 'held',
          amountInr: sh.finalShareInr,
          upiRef: `UPI${9950100 + parseInt(ld.id.replace('load_', ''), 10)}`,
          status: 'escrow_active',
          notes: `Held in escrow until delivery weight check (${p.vehiclePlate})`,
        });
      }
    }
  }

  // 6. Seeded Self-Healed Cancellation Trail (for pool_2)
  const selfHealHistory: SelfHealRecord[] = [
    {
      id: 'heal_seed_1',
      poolId: 'pool_2',
      triggerType: 'transporter_cancel',
      reason: 'Clutch cable snapped outside Kaiwara cross before pickup',
      previousVehiclePlate: vehicles[14].plate,
      newVehiclePlate: vehicles[2].plate,
      newTransporterName: transporters[1].name,
      oldRouteNodeIds: ['v_kaiwara', 'v_kyalanur', 'v_vemgal', 'v_narasapura', 'm_blr_yeshwantpur'],
      newRouteNodeIds: pools[1].routeNodeIds,
      affectedLoadIds: ['load_4', 'load_5', 'load_6'],
      untouchedPoolCount: 7,
      recoverySeconds: 3.2,
      occurredAt: isoOffsetHours(nowMs, -1.9),
      notificationsSent: [
        { recipient: 'Lakshmi & 2 pool neighbours', role: 'farmer', deliveredMs: 420, message: 'Vehicle updated automatically to KA 07 AD 1359 (Kiran Byregowda). Pickup ETA unchanged; no re-booking needed.' },
        { recipient: 'Kiran Byregowda (Standby)', role: 'transporter', deliveredMs: 310, message: 'Standby dispatch activated for Pool HH-KLR-2402 (+₹350 standby bonus + ₹2,410 tour income).' },
        { recipient: 'Aditi Deshpande (Control Desk)', role: 'ops', deliveredMs: 190, message: 'Pool HH-KLR-2402 self-healed in 3.2s; 7 neighbouring pools untouched.' },
      ],
    },
  ];

  // 7. Standing Orders for Business Shippers
  const standingOrders: StandingOrder[] = [
    { id: 'so_1', businessId: 'biz_1', cargo: 'fertiliser', originNodeId: 'd_kolar_agro', destinationNodeId: 'v_srinivaspur', frequency: 'twice_weekly', quintalsPerRun: 16, active: true, nextRunDate: isoOffsetDays(nowMs, 1, 14) },
    { id: 'so_2', businessId: 'biz_2', cargo: 'tomato', originNodeId: 'v_vemgal', destinationNodeId: 'f_vemgal_pulp', frequency: 'daily', quintalsPerRun: 35, active: true, nextRunDate: isoOffsetDays(nowMs, 1, 8) },
    { id: 'so_3', businessId: 'biz_3', cargo: 'poultry_feed', originNodeId: 'f_malur_feed', destinationNodeId: 'v_bangarapet', frequency: 'twice_weekly', quintalsPerRun: 20, active: true, nextRunDate: isoOffsetDays(nowMs, 2, 11) },
    { id: 'so_4', businessId: 'biz_12', cargo: 'crates_packaging', originNodeId: 'c_narasapura_cold', destinationNodeId: 'v_mulbagal', frequency: 'weekly', quintalsPerRun: 14, active: true, nextRunDate: isoOffsetDays(nowMs, 3, 15) },
  ];

  // 8. 6 Disputes with Weighbridge Slips
  const disputes: DisputeCase[] = [
    {
      id: 'disp_1',
      poolCode: 'HH-KLR-2388',
      loadId: 'load_hist_88',
      raisedBy: 'Manjunath Reddy (Farmer)',
      againstParty: 'Anwar & Sons Mandi Commission',
      category: 'weight_mismatch',
      status: 'open',
      bookedWeightQuintals: 18.0,
      weighbridgeQuintals: 19.4,
      slipNumber: 'WB-KLR-09412',
      escrowAmountInr: 1620,
      tolerancePct: 2.0,
      summary: 'APMC electronic bridge recorded 19.4 qtl (+7.7% above booked 18.0 qtl); transporter requests pro-rata adjustment.',
      createdAt: isoOffsetHours(nowMs, -5),
    },
    {
      id: 'disp_2',
      poolCode: 'HH-KLR-2391',
      loadId: 'load_hist_91',
      raisedBy: 'Nagaraj Gowda (Farmer)',
      againstParty: 'Harish Shetty (Transporter)',
      category: 'weight_mismatch',
      status: 'under_review',
      bookedWeightQuintals: 12.0,
      weighbridgeQuintals: 11.85,
      slipNumber: 'WB-KLR-09448',
      escrowAmountInr: 1080,
      tolerancePct: 2.0,
      summary: '1.25% moisture loss between Vemgal loading and Yeshwantpur weighbridge (within ±2.0% tolerance band).',
      createdAt: isoOffsetHours(nowMs, -14),
    },
    {
      id: 'disp_3',
      poolCode: 'HH-KLR-2379',
      loadId: 'load_hist_79',
      raisedBy: 'Mulbagal Rythu Bhandar',
      againstParty: 'Lokesh Kumar (Transporter)',
      category: 'payment_hold',
      status: 'open',
      bookedWeightQuintals: 20.0,
      weighbridgeQuintals: 20.1,
      slipNumber: 'WB-MUL-03119',
      escrowAmountInr: 1540,
      tolerancePct: 2.0,
      summary: 'Unloading clerk forgot to tap delivery PIN at Mulbagal depot; signed gate receipt uploaded.',
      createdAt: isoOffsetHours(nowMs, -19),
    },
    {
      id: 'disp_4',
      poolCode: 'HH-KLR-2364',
      loadId: 'load_hist_64',
      raisedBy: 'Shivakumar Naik (Transporter)',
      againstParty: 'Srinivas Rao (Shipper)',
      category: 'no_show',
      status: 'under_review',
      bookedWeightQuintals: 9.0,
      weighbridgeQuintals: 0,
      slipNumber: 'NA-NOSHOW-14',
      escrowAmountInr: 840,
      tolerancePct: 2.0,
      summary: 'Harvest delayed by morning drizzle; vehicle waited 35 mins at Sugatur cross before departing with 2 other loads.',
      createdAt: isoOffsetHours(nowMs, -28),
    },
    {
      id: 'disp_5',
      poolCode: 'HH-KLR-2350',
      loadId: 'load_hist_50',
      raisedBy: 'Gowramma Shetty (Farmer)',
      againstParty: 'Basavarajappa (Transporter)',
      category: 'weight_mismatch',
      status: 'resolved',
      bookedWeightQuintals: 15.0,
      weighbridgeQuintals: 15.2,
      slipNumber: 'WB-KLR-09102',
      escrowAmountInr: 1350,
      tolerancePct: 2.0,
      summary: '1.3% variance within ±2% tolerance; full escrow released without surcharge.',
      createdAt: isoOffsetDays(nowMs, -3, 11),
      resolutionNote: 'Within ±2.0% tolerance rule; settled at booked fare ₹1,350.',
      adjustedPayoutInr: 1350,
    },
    {
      id: 'disp_6',
      poolCode: 'HH-KLR-2339',
      loadId: 'load_hist_39',
      raisedBy: 'Vemgal Tomato Pulp Unit',
      againstParty: 'Chandrashekar (Transporter)',
      category: 'payment_hold',
      status: 'resolved',
      bookedWeightQuintals: 32.0,
      weighbridgeQuintals: 31.9,
      slipNumber: 'WB-VEM-04421',
      escrowAmountInr: 2680,
      tolerancePct: 2.0,
      summary: 'Factory gate slip verified; payout settled via IMPS.',
      createdAt: isoOffsetDays(nowMs, -5, 16),
      resolutionNote: 'Gate weighment slip verified; ₹2,680 released.',
      adjustedPayoutInr: 2680,
    },
  ];

  // 9. Onboarding Queue (Transporter Applications)
  const onboardingQueue: OnboardingApplication[] = [
    {
      id: 'onb_1',
      applicantName: 'Mahesh Byregowda',
      phone: '+91 90001 88210',
      villageId: 'v_sugatur',
      vehiclePlate: 'KA 07 AN 4418',
      vehicleType: 'bolero_pickup',
      capacityQuintals: 20,
      rcValidUntil: '2031-04-15',
      missedCallVerified: true,
      status: 'pending',
      submittedAt: isoOffsetHours(nowMs, -3.5),
    },
    {
      id: 'onb_2',
      applicantName: 'Somanna Reddy',
      phone: '+91 90001 88247',
      villageId: 'v_bethamangala',
      vehiclePlate: 'KA 07 AP 2095',
      vehicleType: 'tractor_trolley',
      capacityQuintals: 32,
      rcValidUntil: '2028-09-30',
      missedCallVerified: true,
      status: 'pending',
      submittedAt: isoOffsetHours(nowMs, -8),
    },
    {
      id: 'onb_3',
      applicantName: 'Devaraj Naik',
      phone: '+91 90001 88304',
      villageId: 'v_ronur',
      vehiclePlate: 'KA 07 AM 7731',
      vehicleType: 'tata_ace',
      capacityQuintals: 12,
      rcValidUntil: '2030-01-20',
      missedCallVerified: true,
      status: 'approved',
      submittedAt: isoOffsetDays(nowMs, -2, 10),
      reviewerNote: 'RC fitness & Kolar permit verified.',
    },
  ];

  // 10. Credit Applications (for Transporter Credit Passport)
  const creditApplications: CreditApplication[] = [
    {
      id: 'cred_1',
      transporterId: 'trans_1',
      lenderName: 'Kolar Gramin Pragathi Bank',
      productType: 'fuel_credit',
      amountInr: 25000,
      aprPct: 11.5,
      status: 'sanctioned',
      appliedAt: isoOffsetDays(nowMs, -14, 11),
    },
  ];

  // 11. Notifications & Chat Messages & FPO Announcements
  const notifications: AppNotification[] = [
    {
      id: 'notif_1',
      recipientRole: 'farmer',
      title: 'Pool HH-KLR-2401 En Route (54% complete)',
      body: 'Mohan Kumar (KA 07 AC 1286) picked up Vemgal & Narasapura crates. Return-leg fertiliser credit saved you ₹148.',
      severity: 'success',
      createdAt: isoOffsetHours(nowMs, -0.4),
      read: false,
      linkPath: '/farmer/track',
    },
    {
      id: 'notif_2',
      recipientRole: 'all',
      title: 'Self-Healed Pool HH-KLR-2402 in 3.2 Seconds',
      body: 'Standby Eicher KA 07 AD 1359 seamlessly took over Kyalanur–Yeshwantpur pool; 7 neighbouring pools remained untouched.',
      severity: 'info',
      createdAt: isoOffsetHours(nowMs, -1.9),
      read: false,
      linkPath: '/ops/healing',
    },
    {
      id: 'notif_3',
      recipientRole: 'transporter',
      title: '3 Return-Leg Loads Open Towards Srinivaspur & Holur',
      body: 'Attach 15 qtl NPK fertiliser on your homeward run from Kolar Town for +₹1,110 extra tour income.',
      severity: 'info',
      createdAt: isoOffsetHours(nowMs, -0.8),
      read: false,
      linkPath: '/transporter/corridor',
    },
  ];

  const chatMessages: ChatMessage[] = [
    {
      id: 'chat_1',
      threadId: 'pool_1',
      senderName: 'Mohan Kumar (Driver)',
      senderRole: 'transporter',
      text: 'Namaskara Ramesh avare, Vemgal cross inda ಹೊರಟಿದ್ದೇನೆ. Crates stacked safely on top tier (LIFO order).',
      createdAt: isoOffsetHours(nowMs, -1.0),
    },
    {
      id: 'chat_2',
      threadId: 'pool_1',
      senderName: 'Ramesh Gowda',
      senderRole: 'farmer',
      text: 'Dhanyavadagalu Mohan anna. Please unload at Bay 4, Anwar commission stall at Kolar APMC.',
      createdAt: isoOffsetHours(nowMs, -0.85),
    },
    {
      id: 'chat_3',
      threadId: 'pool_1',
      senderName: 'Mohan Kumar (Driver)',
      senderRole: 'transporter',
      text: 'Voice note: Reaching Narasapura highway merge in 8 minutes; tarpaulin secured.',
      isVoiceNote: true,
      voiceDurationSec: 9,
      createdAt: isoOffsetHours(nowMs, -0.5),
    },
  ];

  const fpoAnnouncements: FpoAnnouncement[] = [
    {
      id: 'ann_1',
      fpoId: 'fpo_1',
      title: 'Dawn Tomato & Beans Collective Pool — Tomorrow 6:00 AM',
      bodyEn: 'Vemgal & Kyalanur members harvesting 5+ crates can join tomorrow’s 6:00 AM Eicher pool with pre-booked crate return leg (-22% freight).',
      bodyHi: 'वेमगल और क्यालनूर के सदस्य कल सुबह 6:00 बजे के साझा आइशर पूल में जुड़कर 22% भाड़ा बचा सकते हैं।',
      bodyKn: 'ವೇಮಗಲ್ ಮತ್ತು ಕ್ಯಾಲನೂರು ಸದಸ್ಯರು ನಾಳೆ ಬೆಳಿಗ್ಗೆ 6:00 ಗಂಟೆಯ ಐಷರ್ ಪೂಲ್‌ನಲ್ಲಿ ಸೇರಿ ಶೇ. 22 ರಷ್ಟು ಬಾಡಿಗೆ ಉಳಿಸಬಹುದು.',
      sentAt: isoOffsetHours(nowMs, -4),
      deliveredCount: 48,
      readCount: 41,
    },
  ];

  // 12. Pre-seeded Synthetic Taluka Runs
  const policyRuns: PolicySimulationResult[] = [
    evaluatePolicyOnTaluka('Add a ₹200 fee when a transporter cancels a confirmed trip', SYNTHETIC_PERSONAS),
    evaluatePolicyOnTaluka(
      'Use opt-in Shapley route-plus-weight sharing, cap wait windows by crop spoilage clock, and reward 5-trip completion streaks + standby retainers with no rejection penalty',
      SYNTHETIC_PERSONAS,
    ),
  ];

  // 13. Initial Audit Chain placeholder hashes (synchronously seeded, immediately re-hashed with crypto.subtle SHA-256 on store hydration)
  const auditChain: PriceAuditEntry[] = pools.map((p, idx) => ({
    id: `audit_${p.id}`,
    index: idx + 1,
    poolId: p.id,
    poolCode: p.code,
    timestamp: p.createdAt,
    solver: p.solverUsed,
    splitRule: p.splitRule,
    totalInr: p.tourCostInr,
    sharesSummary: p.shares.map((s) => `${s.loadId}:${s.finalShareInr}`).join(','),
    prevHash: '0'.repeat(64),
    hash: '0'.repeat(64),
  }));

  return {
    seededAt: new Date(nowMs).toISOString(),
    nodes,
    edges,
    accounts,
    fpos,
    farmers,
    transporters,
    vehicles,
    businesses,
    kiosks,
    loads,
    pools,
    returnLegOffers,
    standingOrders,
    historicalTrips,
    ledger,
    disputes,
    auditChain,
    selfHealHistory,
    onboardingQueue,
    creditApplications,
    notifications,
    chatMessages,
    fpoAnnouncements,
    kioskOfflineQueue: [],
    dailySeries,
    personas: SYNTHETIC_PERSONAS,
    policyRuns,
    voicePhrases: VOICE_PHRASE_LIBRARY,
  };
}

export async function rebuildRealSha256AuditChain(entries: PriceAuditEntry[]): Promise<PriceAuditEntry[]> {
  const updated: PriceAuditEntry[] = [];
  let prevHash = '0'.repeat(64);
  for (let i = 0; i < entries.length; i++) {
    const item = {
      ...entries[i],
      index: i + 1,
      prevHash,
    };
    const hash = await sha256Hex(canonicalAuditPayload(item));
    updated.push({ ...item, hash });
    prevHash = hash;
  }
  return updated;
}
