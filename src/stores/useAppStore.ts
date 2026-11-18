import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_KEY, type LanguageCode } from '@/app/constants';
import {
  generateInitialWorld,
  rebuildRealSha256AuditChain,
  type PlatformWorldState,
} from '@/data/seed';
import { evaluatePolicyOnTaluka } from '@/engine/behaviour';
import { areCargosCompatible } from '@/engine/compatibility';
import { interpolateAlongNodes, roadDistanceKm } from '@/engine/geo';
import {
  calculateTourCost,
  canonicalAuditPayload,
  computePoolCostShares,
  sha256Hex,
} from '@/engine/pricing';
import { minimalChangeReplan } from '@/engine/solvers';
import i18n from '@/i18n';
import { eventBus, pushToast } from '@/services/eventBus';
import type {
  CreditApplication,
  CropOrCargo,
  LoadRequest,
  PersonaTraitSet,
  Pool,
  SelfHealRecord,
  SplitRule,
  UserAccount,
  UserRole,
  VehicleType,
} from '@/types/domain';

const delay = (ms = 240) => new Promise((resolve) => setTimeout(resolve, ms));

export interface AppStoreState extends PlatformWorldState {
  currentAccountId: string | null;
  language: LanguageCode;
  reduceMotion: boolean;
  kioskOfflineMode: boolean;
  simulationPaused: boolean;
  auditChainVerified: boolean;

  // Session & Preferences
  hydrateAuditHashes: () => Promise<void>;
  setLanguage: (lang: LanguageCode) => void;
  setReduceMotion: (val: boolean) => void;
  loginWithPhone: (phone: string) => Promise<{ found: boolean; account?: UserAccount }>;
  registerNewAccount: (params: {
    name: string;
    phone: string;
    role: UserRole;
    villageId: string;
    organisationName?: string;
  }) => Promise<UserAccount>;
  switchAccount: (accountId: string) => void;
  logout: () => void;
  restoreInitialState: () => Promise<void>;

  // Live Simulation Tick
  simulationTick: () => void;
  setSimulationPaused: (paused: boolean) => void;

  // Farmer / Shipper Actions
  createLoadAndPool: (params: {
    shipperId: string;
    shipperName: string;
    shipperPhone: string;
    shipperRole: LoadRequest['shipperRole'];
    crop: CropOrCargo;
    weightQuintals: number;
    unitLabel: string;
    pickupNodeId: string;
    dropNodeId: string;
    maxWaitHours: number;
    minDiscountPct: number;
    freshnessScore: number;
  }) => Promise<{ load: LoadRequest; pool: Pool }>;
  voteOnSplitRule: (poolId: string, voterId: string, voterName: string, rule: SplitRule) => Promise<void>;
  payForLoadEscrow: (loadId: string, upiApp: string) => Promise<void>;
  cancelFarmerLoad: (loadId: string) => Promise<void>;
  confirmDeliveryAndRate: (loadId: string, confirmedWeight: number, rating: number) => Promise<void>;
  sendChatMessage: (threadId: string, senderName: string, senderRole: UserRole, text: string, isVoice?: boolean) => void;
  markAllNotificationsRead: () => void;

  // Transporter Actions
  respondToPoolOffer: (
    poolId: string,
    action: 'accept' | 'reject' | 'counter',
    counterInr?: number,
    reason?: string,
  ) => Promise<{ accepted: boolean; finalInr?: number }>;
  advanceTripChecklist: (poolId: string) => Promise<void>;
  reorderPoolStops: (poolId: string, fromIdx: number, toIdx: number) => void;
  attachReturnLegToPool: (returnOfferId: string, poolId: string) => Promise<void>;
  toggleStandbyRetainer: (transporterId: string) => void;
  withdrawTransporterWallet: (transporterId: string, amountInr: number) => Promise<void>;
  addTransporterBank: (transporterId: string, maskedAccount: string, ifsc: string) => void;
  applyForCreditProduct: (params: {
    transporterId: string;
    lenderName: string;
    productType: CreditApplication['productType'];
    amountInr: number;
    aprPct: number;
  }) => Promise<void>;
  completeTransporterOnboarding: (params: {
    ownerName: string;
    phone: string;
    villageId: string;
    plate: string;
    vehicleType: VehicleType;
    capacityQuintals: number;
    rcValidUntil: string;
  }) => Promise<UserAccount>;

  // Business & FPO & Kiosk Actions
  prebookReturnLegCapacity: (params: {
    businessId: string;
    businessName: string;
    cargo: CropOrCargo;
    weightQuintals: number;
    originNodeId: string;
    destinationNodeId: string;
    ratePerQuintalInr: number;
  }) => Promise<void>;
  toggleStandingOrder: (orderId: string) => void;
  createStandingOrder: (params: {
    businessId: string;
    cargo: CropOrCargo;
    originNodeId: string;
    destinationNodeId: string;
    frequency: 'daily' | 'twice_weekly' | 'weekly';
    quintalsPerRun: number;
  }) => void;
  bulkImportBusinessLoads: (
    rows: { crop: CropOrCargo; weightQuintals: number; originNodeId: string; destinationNodeId: string }[],
    businessName: string,
    businessPhone: string,
  ) => Promise<number>;
  sendFpoAnnouncement: (params: { fpoId: string; title: string; bodyEn: string; bodyHi: string; bodyKn: string }) => void;
  setFpoPreferredSplitRule: (fpoId: string, rule: SplitRule) => void;
  setKioskOfflineMode: (offline: boolean) => Promise<void>;
  submitKioskWalkInBooking: (params: {
    farmerName: string;
    farmerPhone: string;
    villageId: string;
    crop: CropOrCargo;
    weightQuintals: number;
    dropNodeId: string;
    freshnessScore: number;
  }) => Promise<{ queuedOffline: boolean; loadId?: string }>;

  // Operations Control Tower Actions
  triggerNetworkEvent: (
    triggerType: SelfHealRecord['triggerType'],
    targetPoolId?: string,
    reasonOverride?: string,
  ) => Promise<SelfHealRecord>;
  resolveDisputeCase: (disputeId: string, adjustedPayoutInr: number, resolutionNote: string) => Promise<void>;
  reviewOnboardingApplication: (appId: string, decision: 'approved' | 'changes_requested', note: string) => void;
  updatePersonaTrait: (personaId: string, traitKey: keyof PersonaTraitSet, value: number) => void;
  runSyntheticTalukaPolicy: (policyText: string) => Promise<void>;
}

const initialWorld = generateInitialWorld();

export const useAppStore = create<AppStoreState>()(
  persist(
    (set, get) => ({
      ...initialWorld,
      currentAccountId: 'acc_farmer_1',
      language: 'en',
      reduceMotion: false,
      kioskOfflineMode: false,
      simulationPaused: false,
      auditChainVerified: false,

      hydrateAuditHashes: async () => {
        const currentChain = get().auditChain;
        const hashed = await rebuildRealSha256AuditChain(currentChain);
        set({ auditChain: hashed, auditChainVerified: true });
      },

      setLanguage: (lang) => {
        i18n.changeLanguage(lang);
        set({ language: lang });
      },

      setReduceMotion: (val) => {
        if (typeof document !== 'undefined') {
          document.documentElement.classList.toggle('reduce-motion', val);
        }
        set({ reduceMotion: val });
      },

      loginWithPhone: async (phone) => {
        await delay(260);
        const normalized = phone.replace(/\s+/g, '');
        const account = get().accounts.find((a) => a.phone.replace(/\s+/g, '').endsWith(normalized.slice(-10)));
        if (account) {
          set({ currentAccountId: account.id, language: account.preferredLanguage });
          i18n.changeLanguage(account.preferredLanguage);
          return { found: true, account };
        }
        return { found: false };
      },

      registerNewAccount: async ({ name, phone, role, villageId, organisationName }) => {
        await delay(320);
        const id = `acc_custom_${Date.now()}`;
        const initials = name
          .split(' ')
          .map((w) => w[0])
          .join('')
          .slice(0, 2)
          .toUpperCase();
        const newAcc: UserAccount = {
          id,
          name,
          phone,
          role,
          villageId,
          preferredLanguage: get().language,
          avatarInitials: initials || 'HH',
          organisationName,
          verified: true,
          createdAt: new Date().toISOString(),
        };

        set((st) => {
          const nextFarmers = [...st.farmers];
          const nextTransporters = [...st.transporters];
          if (role === 'farmer') {
            nextFarmers.unshift({
              id: `farmer_custom_${Date.now()}`,
              accountId: id,
              name,
              phone,
              villageId,
              fpoId: st.fpos[0].id,
              landAcres: 2.5,
              primaryCrops: ['tomato', 'beans'],
              preferredLanguage: st.language,
              digitalComfort: 'smartphone',
              completedShipments: 0,
              totalSavedInr: 0,
            });
          } else if (role === 'transporter') {
            nextTransporters.unshift({
              id: `trans_custom_${Date.now()}`,
              accountId: id,
              name,
              phone,
              homeVillageId: villageId,
              vehicleIds: [st.vehicles[0].id],
              reliabilityScore: 92,
              completedTours: 12,
              cancellationsCount: 0,
              walletBalanceInr: 4500,
              escrowInTransitInr: 1200,
              verifiedMonthlyEarningsInr: 42000,
              bankAccountMasked: '•••• 8821',
              ifsc: 'CNRB0001427',
              standbyActive: true,
              preferredLanguage: st.language,
            });
          }
          return {
            accounts: [newAcc, ...st.accounts],
            farmers: nextFarmers,
            transporters: nextTransporters,
            currentAccountId: id,
          };
        });
        pushToast('Account Ready', `Welcome to HarvestHaul, ${name}.`, 'success');
        return newAcc;
      },

      switchAccount: (accountId) => {
        const acc = get().accounts.find((a) => a.id === accountId);
        if (!acc) return;
        set({ currentAccountId: acc.id, language: acc.preferredLanguage });
        i18n.changeLanguage(acc.preferredLanguage);
        pushToast('Switched Account', `Signed in as ${acc.name} (${acc.role.toUpperCase()})`, 'info');
      },

      logout: () => {
        set({ currentAccountId: null });
      },

      restoreInitialState: async () => {
        const fresh = generateInitialWorld(Date.now());
        const hashed = await rebuildRealSha256AuditChain(fresh.auditChain);
        set({
          ...fresh,
          auditChain: hashed,
          auditChainVerified: true,
          currentAccountId: 'acc_farmer_1',
          kioskOfflineMode: false,
        });
        pushToast('Network Reset', 'Seeded Kolar network restored to initial state.', 'info');
      },

      setSimulationPaused: (paused) => set({ simulationPaused: paused }),

      simulationTick: () => {
        const st = get();
        if (st.simulationPaused) return;
        const nodeMap = new Map(st.nodes.map((n) => [n.id, n]));

        const nextVehicles = [...st.vehicles];
        const nextPools = st.pools.map((pool) => {
          if (pool.status !== 'en_route') return pool;
          const nextPct = pool.progressPct >= 96 ? 18 : pool.progressPct + 2.4;
          const vIdx = nextVehicles.findIndex((v) => v.id === pool.vehicleId);
          if (vIdx >= 0) {
            const pos = interpolateAlongNodes(pool.routeNodeIds, nextPct, nodeMap);
            nextVehicles[vIdx] = {
              ...nextVehicles[vIdx],
              lat: pos.lat,
              lng: pos.lng,
              headingDeg: pos.headingDeg,
            };
          }
          return {
            ...pool,
            progressPct: Math.round(nextPct * 10) / 10,
          };
        });

        set({ pools: nextPools, vehicles: nextVehicles });
      },

      createLoadAndPool: async (params) => {
        await delay(380);
        const st = get();
        const nodeMap = new Map(st.nodes.map((n) => [n.id, n]));
        const pNode = nodeMap.get(params.pickupNodeId) ?? st.nodes[0];
        const dNode = nodeMap.get(params.dropNodeId) ?? st.nodes[24];
        const distKm = roadDistanceKm(pNode, dNode, 1.32);
        const soloPriceInr = Math.round(310 + distKm * 22 * (1 + params.weightQuintals * 0.006));
        const loadId = `load_${Date.now()}`;

        const newLoad: LoadRequest = {
          id: loadId,
          shipperId: params.shipperId,
          shipperName: params.shipperName,
          shipperRole: params.shipperRole,
          shipperPhone: params.shipperPhone,
          crop: params.crop,
          weightQuintals: params.weightQuintals,
          unitLabel: params.unitLabel,
          pickupNodeId: params.pickupNodeId,
          dropNodeId: params.dropNodeId,
          readyAt: new Date().toISOString(),
          latestDispatchAt: new Date(Date.now() + 9 * 3_600_000).toISOString(),
          maxWaitHours: params.maxWaitHours,
          minDiscountPct: params.minDiscountPct,
          freshnessScore: params.freshnessScore,
          urgencyTag: params.freshnessScore < 65 ? 'urgent' : params.freshnessScore < 80 ? 'watch' : 'calm',
          ambientTempC: 28.5,
          status: 'pooling',
          quotedPriceInr: Math.round(soloPriceInr * 0.72),
          soloPriceInr,
          paymentStatus: 'unpaid',
          isReturnLoad: false,
          createdAt: new Date().toISOString(),
        };

        // Find compatible neighbour requested loads heading to same or nearby mandi, or form new pool
        const compatibleNeighbours = st.loads
          .filter(
            (l) =>
              l.status === 'requested' &&
              l.dropNodeId === params.dropNodeId &&
              areCargosCompatible(l.crop, params.crop).compatible,
          )
          .slice(0, 2);

        const poolMembers = [newLoad, ...compatibleNeighbours];
        const totalWeight = poolMembers.reduce((a, l) => a + l.weightQuintals, 0);
        const candidateVehicle =
          st.vehicles.find((v) => v.capacityQuintals >= totalWeight && v.status !== 'en_route') ??
          st.vehicles.find((v) => v.capacityQuintals >= totalWeight) ??
          st.vehicles[2];
        const transporter =
          st.transporters.find((t) => t.id === candidateVehicle.transporterId) ?? st.transporters[0];

        const routeNodeIds = Array.from(
          new Set([
            candidateVehicle.baseVillageId,
            ...poolMembers.map((l) => l.pickupNodeId),
            params.dropNodeId,
          ]),
        );
        let outboundKm = 0;
        for (let i = 1; i < routeNodeIds.length; i++) {
          outboundKm += roadDistanceKm(nodeMap.get(routeNodeIds[i - 1])!, nodeMap.get(routeNodeIds[i])!, 1.31);
        }
        const returnKm = roadDistanceKm(dNode, nodeMap.get(candidateVehicle.homeVillageId)!, 1.31);
        const openRet = st.returnLegOffers.find((r) => r.status === 'open');
        const tour = calculateTourCost({
          outboundKm,
          returnKm,
          vehicleCostPerKmInr: candidateVehicle.costPerKmInr,
          returnFillRatio: openRet ? 0.55 : 0.25,
          returnLoadRevenueInr: openRet ? openRet.totalOfferInr : 0,
        });

        const shares = computePoolCostShares({
          shippers: poolMembers.map((l, idx) => ({
            loadId: l.id,
            shipperName: l.shipperName,
            villageName: nodeMap.get(l.pickupNodeId)!.name,
            weightQuintals: l.weightQuintals,
            directDistanceKm: roadDistanceKm(nodeMap.get(l.pickupNodeId)!, dNode, 1.3),
            marginalDetourKm: idx === 0 ? 1.5 : 3.2 * idx,
          })),
          netPoolCostInr: tour.netOutboundPoolCostInr,
          returnDiscountInr: tour.returnDiscountInr,
          costPerKmInr: candidateVehicle.costPerKmInr,
          activeSplitRule: 'shapley',
        });

        const poolId = `pool_${Date.now()}`;
        const poolCode = `HH-KLR-${2410 + st.pools.length}`;
        const myShare = shares.find((s) => s.loadId === loadId)!;
        newLoad.poolId = poolId;
        newLoad.quotedPriceInr = myShare.finalShareInr;
        newLoad.soloPriceInr = myShare.soloCostInr;
        newLoad.status = 'confirmed';

        const newPool: Pool = {
          id: poolId,
          code: poolCode,
          loadIds: poolMembers.map((l) => l.id),
          returnLoadIds: openRet ? [openRet.id] : [],
          vehicleId: candidateVehicle.id,
          transporterId: transporter.id,
          transporterName: transporter.name,
          transporterPhone: transporter.phone,
          vehiclePlate: candidateVehicle.plate,
          vehicleType: candidateVehicle.type,
          capacityQuintals: candidateVehicle.capacityQuintals,
          totalWeightQuintals: totalWeight,
          returnWeightQuintals: openRet ? openRet.weightQuintals : 0,
          fillPct: Math.min(100, Math.round((totalWeight / candidateVehicle.capacityQuintals) * 100)),
          status: 'confirmed',
          stops: [
            ...poolMembers.map((l, idx) => ({
              nodeId: l.pickupNodeId,
              kind: 'pickup' as const,
              loadId: l.id,
              shipperFirstName: l.shipperName.split(' ')[0],
              villageName: nodeMap.get(l.pickupNodeId)!.name,
              crop: l.crop,
              weightQuintals: l.weightQuintals,
              eta: new Date(Date.now() + (idx + 1) * 25 * 60_000).toISOString(),
              lifoSequence: poolMembers.length - idx,
              completed: false,
            })),
            ...poolMembers.map((l, idx) => ({
              nodeId: l.dropNodeId,
              kind: 'drop' as const,
              loadId: l.id,
              shipperFirstName: l.shipperName.split(' ')[0],
              villageName: dNode.name,
              crop: l.crop,
              weightQuintals: l.weightQuintals,
              eta: new Date(Date.now() + 95 * 60_000).toISOString(),
              lifoSequence: idx + 1,
              completed: false,
            })),
          ],
          routeNodeIds,
          returnRouteNodeIds: [params.dropNodeId, candidateVehicle.homeVillageId],
          outboundKm: tour.outboundKm,
          returnKm: tour.returnKm,
          emptyKmSaved: Math.round(returnKm * 0.72),
          tourCostInr: tour.netOutboundPoolCostInr,
          fuelCostInr: tour.fuelCostInr,
          driverCostInr: tour.driverCostInr,
          tollCostInr: tour.tollCostInr,
          marginInr: tour.marginInr,
          returnDiscountInr: tour.returnDiscountInr,
          transporterEarningsInr: tour.transporterEarningsInr,
          splitRule: 'shapley',
          votes: [{ voterId: params.shipperId, voterName: params.shipperName.split(' ')[0], choice: 'shapley' }],
          shares,
          solverUsed: 'Annealing (QUBO)',
          cancellationRiskPct: 6,
          spoilageRiskPct: 5,
          progressPct: 14,
          etaDestination: new Date(Date.now() + 95 * 60_000).toISOString(),
          checklistStep: 1,
          createdAt: new Date().toISOString(),
        };

        // Append SHA-256 audit entry
        const prevHash = st.auditChain[st.auditChain.length - 1]?.hash ?? '0'.repeat(64);
        const nextAuditBase = {
          id: `audit_${poolId}`,
          index: st.auditChain.length + 1,
          poolId,
          poolCode,
          timestamp: newPool.createdAt,
          solver: newPool.solverUsed,
          splitRule: newPool.splitRule,
          totalInr: newPool.tourCostInr,
          sharesSummary: shares.map((s) => `${s.loadId}:${s.finalShareInr}`).join(','),
          prevHash,
        };
        const hash = await sha256Hex(canonicalAuditPayload(nextAuditBase));

        const neighbourIds = new Set(compatibleNeighbours.map((n) => n.id));
        set((cur) => ({
          loads: [
            newLoad,
            ...cur.loads.map((l) => {
              if (!neighbourIds.has(l.id)) return l;
              const sh = shares.find((s) => s.loadId === l.id);
              return {
                ...l,
                poolId,
                status: 'confirmed' as const,
                quotedPriceInr: sh ? sh.finalShareInr : l.quotedPriceInr,
              };
            }),
          ],
          pools: [newPool, ...cur.pools],
          auditChain: [...cur.auditChain, { ...nextAuditBase, hash }],
          notifications: [
            {
              id: `notif_pool_${Date.now()}`,
              recipientRole: 'all',
              title: `Pool ${poolCode} Formed (${newPool.fillPct}% Bed Fill)`,
              body: `${poolMembers.length} loads combined onto ${candidateVehicle.plate}. Your fare is ₹${myShare.finalShareInr} (${myShare.savingsPct}% saved).`,
              severity: 'success',
              createdAt: new Date().toISOString(),
              read: false,
              linkPath: '/farmer/pool',
            },
            ...cur.notifications,
          ],
        }));

        eventBus.emit('pool_ready', { poolId, poolCode });
        pushToast(
          `Pool ${poolCode} Ready`,
          `Matched with ${compatibleNeighbours.length} nearby loads on ${candidateVehicle.plate} (${newPool.fillPct}% full).`,
          'success',
        );
        return { load: newLoad, pool: newPool };
      },

      voteOnSplitRule: async (poolId, voterId, voterName, rule) => {
        await delay(180);
        const st = get();
        const target = st.pools.find((p) => p.id === poolId);
        if (!target) return;

        const filteredVotes = target.votes.filter((v) => v.voterId !== voterId);
        const nextVotes = [...filteredVotes, { voterId, voterName, choice: rule }];
        // Tally winning rule (ties broken by latest voter choice)
        const counts: Record<SplitRule, number> = { shapley: 0, weight: 0, distance: 0, equal: 0 };
        nextVotes.forEach((v) => {
          counts[v.choice] += 1;
        });
        let winningRule: SplitRule = rule;
        let maxCount = counts[rule];
        (Object.keys(counts) as SplitRule[]).forEach((r) => {
          if (counts[r] > maxCount) {
            maxCount = counts[r];
            winningRule = r;
          }
        });

        const updatedShares = target.shares.map((sh) => {
          const finalShareInr =
            winningRule === 'weight'
              ? sh.weightRuleShareInr
              : winningRule === 'distance'
                ? sh.distanceRuleShareInr
                : winningRule === 'equal'
                  ? sh.equalRuleShareInr
                  : sh.shapleyShareInr;
          const savingsPct =
            sh.soloCostInr > finalShareInr
              ? Math.round(((sh.soloCostInr - finalShareInr) / sh.soloCostInr) * 100)
              : 6;
          return { ...sh, finalShareInr, savingsPct };
        });

        set((cur) => ({
          pools: cur.pools.map((p) =>
            p.id === poolId
              ? { ...p, splitRule: winningRule, votes: nextVotes, shares: updatedShares }
              : p,
          ),
          loads: cur.loads.map((ld) => {
            const sh = updatedShares.find((s) => s.loadId === ld.id);
            return sh ? { ...ld, quotedPriceInr: sh.finalShareInr } : ld;
          }),
        }));

        // Record rule update in SHA-256 chain
        const freshChain = await rebuildRealSha256AuditChain(
          get().auditChain.map((entry) =>
            entry.poolId === poolId
              ? {
                  ...entry,
                  splitRule: winningRule,
                  sharesSummary: updatedShares.map((s) => `${s.loadId}:${s.finalShareInr}`).join(','),
                }
              : entry,
          ),
        );
        set({ auditChain: freshChain });
        pushToast('Split Vote Recorded', `Pool ${target.code} active rule: ${winningRule.toUpperCase()}`, 'info');
      },

      payForLoadEscrow: async (loadId, upiApp) => {
        await delay(420);
        const st = get();
        const load = st.loads.find((l) => l.id === loadId);
        if (!load) return;
        const pool = st.pools.find((p) => p.id === load.poolId);
        const upiRef = `UPI${Math.floor(1000000 + Math.random() * 8999999)}`;

        set((cur) => ({
          loads: cur.loads.map((l) =>
            l.id === loadId ? { ...l, paymentStatus: 'escrow_held' } : l,
          ),
          ledger: [
            {
              id: `led_esc_${Date.now()}`,
              timestamp: new Date().toISOString(),
              poolCode: pool?.code ?? 'HH-KLR-DIRECT',
              loadId,
              partyName: load.shipperName,
              partyRole: 'farmer',
              kind: 'held',
              amountInr: load.quotedPriceInr,
              upiRef,
              status: 'escrow_active',
              notes: `Paid via ${upiApp}; held in delivery escrow`,
            },
            ...cur.ledger,
          ],
        }));
        eventBus.emit('confetti', { reason: 'escrow_payment' });
        pushToast(
          'Escrow Secured',
          `₹${load.quotedPriceInr} held safely in transit escrow (${upiRef}). Releases on delivery.`,
          'success',
        );
      },

      cancelFarmerLoad: async (loadId) => {
        await delay(260);
        const st = get();
        const load = st.loads.find((l) => l.id === loadId);
        if (!load) return;
        const wasEscrow = load.paymentStatus === 'escrow_held';
        set((cur) => ({
          loads: cur.loads.map((l) =>
            l.id === loadId
              ? { ...l, status: 'cancelled', paymentStatus: wasEscrow ? 'refunded' : 'unpaid' }
              : l,
          ),
          ledger: wasEscrow
            ? [
                {
                  id: `led_ref_${Date.now()}`,
                  timestamp: new Date().toISOString(),
                  poolCode: cur.pools.find((p) => p.id === load.poolId)?.code ?? 'HH-KLR-POOL',
                  loadId,
                  partyName: load.shipperName,
                  partyRole: 'farmer',
                  kind: 'refunded',
                  amountInr: load.quotedPriceInr,
                  upiRef: `REF${Date.now().toString().slice(-7)}`,
                  status: 'settled',
                  notes: 'Full instant UPI refund on shipper cancellation before loading',
                },
                ...cur.ledger,
              ]
            : cur.ledger,
        }));
        pushToast(
          'Booking Cancelled',
          wasEscrow
            ? `₹${load.quotedPriceInr} refunded immediately to your UPI account.`
            : 'Request cancelled with zero fee.',
          'info',
        );
      },

      confirmDeliveryAndRate: async (loadId, confirmedWeight, rating) => {
        await delay(320);
        const st = get();
        const load = st.loads.find((l) => l.id === loadId);
        if (!load) return;
        const pool = st.pools.find((p) => p.id === load.poolId);

        set((cur) => ({
          loads: cur.loads.map((l) =>
            l.id === loadId
              ? {
                  ...l,
                  status: 'completed',
                  paymentStatus: 'released',
                  confirmedWeightQuintals: confirmedWeight,
                  driverRating: rating,
                }
              : l,
          ),
          transporters: cur.transporters.map((t) =>
            t.id === pool?.transporterId
              ? {
                  ...t,
                  walletBalanceInr: t.walletBalanceInr + load.quotedPriceInr,
                  escrowInTransitInr: Math.max(0, t.escrowInTransitInr - load.quotedPriceInr),
                  completedTours: t.completedTours + 1,
                }
              : t,
          ),
          ledger: [
            {
              id: `led_rel_${Date.now()}`,
              timestamp: new Date().toISOString(),
              poolCode: pool?.code ?? 'HH-KLR-POOL',
              loadId,
              partyName: pool?.transporterName ?? 'Transporter',
              partyRole: 'transporter',
              kind: 'released',
              amountInr: load.quotedPriceInr,
              upiRef: `REL${Date.now().toString().slice(-7)}`,
              status: 'settled',
              notes: `Weight confirmed (${confirmedWeight} qtl); rated ${rating}/5 stars`,
            },
            ...cur.ledger,
          ],
        }));
        eventBus.emit('confetti', { reason: 'delivery_confirmed' });
        pushToast(
          'Delivery Confirmed & Escrow Released',
          `Confirmed ${confirmedWeight} qtl and released ₹${load.quotedPriceInr} to ${pool?.transporterName ?? 'driver'}.`,
          'success',
        );
      },

      sendChatMessage: (threadId, senderName, senderRole, text, isVoice = false) => {
        if (!text.trim()) return;
        set((cur) => ({
          chatMessages: [
            ...cur.chatMessages,
            {
              id: `chat_${Date.now()}`,
              threadId,
              senderName,
              senderRole,
              text,
              isVoiceNote: isVoice,
              voiceDurationSec: isVoice ? 7 : undefined,
              createdAt: new Date().toISOString(),
            },
          ],
        }));
      },

      markAllNotificationsRead: () => {
        set((cur) => ({
          notifications: cur.notifications.map((n) => ({ ...n, read: true })),
        }));
      },

      respondToPoolOffer: async (poolId, action, counterInr, reason) => {
        await delay(340);
        const st = get();
        const pool = st.pools.find((p) => p.id === poolId);
        if (!pool) return { accepted: false };

        if (action === 'reject') {
          // Re-offer cleanly to another transporter with zero penalty
          const altTrans = st.transporters.find((t) => t.id !== pool.transporterId) ?? st.transporters[1];
          const altVeh = st.vehicles.find((v) => v.id === altTrans.vehicleIds[0]) ?? st.vehicles[3];
          set((cur) => ({
            pools: cur.pools.map((p) =>
              p.id === poolId
                ? {
                    ...p,
                    transporterId: altTrans.id,
                    transporterName: altTrans.name,
                    vehicleId: altVeh.id,
                    vehiclePlate: altVeh.plate,
                  }
                : p,
            ),
          }));
          pushToast(
            'Offer Passed — Zero Penalty',
            'Your reliability score is unchanged. Offer routed to next nearby vehicle.',
            'info',
          );
          return { accepted: false };
        }

        if (action === 'counter' && counterInr) {
          const maxAcceptable = Math.round(pool.transporterEarningsInr * 1.12);
          const settledInr = Math.min(counterInr, maxAcceptable);
          set((cur) => ({
            pools: cur.pools.map((p) =>
              p.id === poolId
                ? { ...p, status: 'confirmed', transporterEarningsInr: settledInr }
                : p,
            ),
          }));
          pushToast(
            counterInr <= maxAcceptable ? 'Counter-Offer Accepted' : 'Matched at Corridor Cap',
            `Tour confirmed at ₹${settledInr} (${reason ?? 'diesel & rural road adjustment'}).`,
            'success',
          );
          return { accepted: true, finalInr: settledInr };
        }

        set((cur) => ({
          pools: cur.pools.map((p) => (p.id === poolId ? { ...p, status: 'confirmed' } : p)),
        }));
        pushToast(
          'Pool Confirmed',
          `Pool ${pool.code} added to your active tour (₹${pool.transporterEarningsInr}).`,
          'success',
        );
        return { accepted: true, finalInr: pool.transporterEarningsInr };
      },

      advanceTripChecklist: async (poolId) => {
        await delay(200);
        const st = get();
        const pool = st.pools.find((p) => p.id === poolId);
        if (!pool) return;
        const nextStep = Math.min(6, pool.checklistStep + 1);
        const nextStatus: Pool['status'] =
          nextStep >= 6 ? 'completed' : nextStep >= 4 ? 'en_route' : 'confirmed';
        const nextProgress = nextStep >= 6 ? 100 : Math.max(pool.progressPct, nextStep * 16);

        set((cur) => ({
          pools: cur.pools.map((p) =>
            p.id === poolId
              ? { ...p, checklistStep: nextStep, status: nextStatus, progressPct: nextProgress }
              : p,
          ),
        }));
        if (nextStep === 6) {
          eventBus.emit('confetti', { reason: 'trip_completed' });
          pushToast('Tour Completed', `Proof of delivery recorded for ${pool.code}.`, 'success');
        }
      },

      reorderPoolStops: (poolId, fromIdx, toIdx) => {
        const st = get();
        const pool = st.pools.find((p) => p.id === poolId);
        if (!pool) return;
        const pickups = pool.stops.filter((s) => s.kind === 'pickup');
        const drops = pool.stops.filter((s) => s.kind !== 'pickup');
        if (fromIdx < 0 || toIdx < 0 || fromIdx >= pickups.length || toIdx >= pickups.length) return;

        const reordered = [...pickups];
        const [moved] = reordered.splice(fromIdx, 1);
        reordered.splice(toIdx, 0, moved);

        const nodeMap = new Map(st.nodes.map((n) => [n.id, n]));
        const veh = st.vehicles.find((v) => v.id === pool.vehicleId) ?? st.vehicles[0];
        const routeNodeIds = Array.from(
          new Set([veh.baseVillageId, ...reordered.map((s) => s.nodeId), ...drops.map((s) => s.nodeId)]),
        );
        let outboundKm = 0;
        for (let i = 1; i < routeNodeIds.length; i++) {
          outboundKm += roadDistanceKm(nodeMap.get(routeNodeIds[i - 1])!, nodeMap.get(routeNodeIds[i])!, 1.31);
        }
        const tour = calculateTourCost({
          outboundKm,
          returnKm: pool.returnKm,
          vehicleCostPerKmInr: veh.costPerKmInr,
          returnFillRatio: pool.returnWeightQuintals / veh.capacityQuintals,
        });

        set((cur) => ({
          pools: cur.pools.map((p) =>
            p.id === poolId
              ? {
                  ...p,
                  stops: [
                    ...reordered.map((s, idx) => ({ ...s, lifoSequence: reordered.length - idx })),
                    ...drops,
                  ],
                  routeNodeIds,
                  outboundKm: tour.outboundKm,
                  tourCostInr: tour.netOutboundPoolCostInr,
                  transporterEarningsInr: tour.transporterEarningsInr,
                }
              : p,
          ),
        }));
      },

      attachReturnLegToPool: async (returnOfferId, poolId) => {
        await delay(280);
        const st = get();
        const offer = st.returnLegOffers.find((r) => r.id === returnOfferId);
        const pool = st.pools.find((p) => p.id === poolId);
        if (!offer || !pool) return;

        const addedEarnings = Math.round(offer.totalOfferInr * 0.78);
        const addedReturnCredit = Math.round(offer.totalOfferInr * 0.22);

        set((cur) => ({
          returnLegOffers: cur.returnLegOffers.map((r) =>
            r.id === returnOfferId ? { ...r, status: 'attached', attachedPoolId: poolId } : r,
          ),
          pools: cur.pools.map((p) =>
            p.id === poolId
              ? {
                  ...p,
                  returnLoadIds: Array.from(new Set([...p.returnLoadIds, returnOfferId])),
                  returnWeightQuintals: p.returnWeightQuintals + offer.weightQuintals,
                  returnRouteNodeIds: Array.from(
                    new Set([...p.returnRouteNodeIds.slice(0, 1), offer.originNodeId, offer.destinationNodeId]),
                  ),
                  emptyKmSaved: p.emptyKmSaved + 18,
                  returnDiscountInr: p.returnDiscountInr + addedReturnCredit,
                  transporterEarningsInr: p.transporterEarningsInr + addedEarnings,
                }
              : p,
          ),
        }));
        eventBus.emit('confetti', { reason: 'return_attached' });
        pushToast(
          'Return Load Attached!',
          `Added ${offer.weightQuintals} qtl from ${offer.businessName} (+₹${addedEarnings} tour income).`,
          'success',
        );
      },

      toggleStandbyRetainer: (transporterId) => {
        set((cur) => {
          const target = cur.transporters.find((t) => t.id === transporterId);
          const nextActive = !target?.standbyActive;
          return {
            transporters: cur.transporters.map((t) =>
              t.id === transporterId ? { ...t, standbyActive: nextActive } : t,
            ),
            vehicles: cur.vehicles.map((v) =>
              v.transporterId === transporterId
                ? { ...v, standbyOptIn: nextActive, standbyRetainerInr: nextActive ? 350 : 0 }
                : v,
            ),
          };
        });
        pushToast('Standby Preference Saved', 'Standby retainer status updated for high-priority pools.', 'info');
      },

      withdrawTransporterWallet: async (transporterId, amountInr) => {
        await delay(350);
        const st = get();
        const trans = st.transporters.find((t) => t.id === transporterId);
        if (!trans || amountInr <= 0 || amountInr > trans.walletBalanceInr) return;

        set((cur) => ({
          transporters: cur.transporters.map((t) =>
            t.id === transporterId
              ? { ...t, walletBalanceInr: t.walletBalanceInr - amountInr }
              : t,
          ),
          ledger: [
            {
              id: `led_wd_${Date.now()}`,
              timestamp: new Date().toISOString(),
              poolCode: 'WALLET-PAYOUT',
              partyName: trans.name,
              partyRole: 'transporter',
              kind: 'payout',
              amountInr,
              upiRef: `IMPS${Date.now().toString().slice(-7)}`,
              status: 'settled',
              notes: `Instant bank payout to ${trans.bankAccountMasked}`,
            },
            ...cur.ledger,
          ],
        }));
        eventBus.emit('confetti', { reason: 'wallet_withdraw' });
        pushToast('Instant Payout Sent', `₹${amountInr.toLocaleString()} credited to ${trans.bankAccountMasked}.`, 'success');
      },

      addTransporterBank: (transporterId, maskedAccount, ifsc) => {
        set((cur) => ({
          transporters: cur.transporters.map((t) =>
            t.id === transporterId ? { ...t, bankAccountMasked: maskedAccount, ifsc } : t,
          ),
        }));
        pushToast('Bank Account Linked', `Settlement account ${maskedAccount} (${ifsc}) verified.`, 'success');
      },

      applyForCreditProduct: async ({ transporterId, lenderName, productType, amountInr, aprPct }) => {
        await delay(340);
        set((cur) => ({
          creditApplications: [
            {
              id: `cred_${Date.now()}`,
              transporterId,
              lenderName,
              productType,
              amountInr,
              aprPct,
              status: 'verified',
              appliedAt: new Date().toISOString(),
            },
            ...cur.creditApplications,
          ],
        }));
        pushToast(
          'Credit Passport Shared',
          `Application for ₹${amountInr.toLocaleString()} submitted to ${lenderName}.`,
          'success',
        );
      },

      completeTransporterOnboarding: async ({
        ownerName,
        phone,
        villageId,
        plate,
        vehicleType,
        capacityQuintals,
        rcValidUntil,
      }) => {
        await delay(400);
        const st = get();
        const homeNode = st.nodes.find((n) => n.id === villageId) ?? st.nodes[0];
        const accId = `acc_trans_${Date.now()}`;
        const tId = `trans_${Date.now()}`;
        const vId = `veh_${Date.now()}`;
        const typeNames: Record<VehicleType, string> = {
          tata_ace: 'Tata Ace Gold',
          bolero_pickup: 'Mahindra Bolero Pickup 1.7T',
          eicher_14ft: 'Eicher Pro 14 ft',
          tractor_trolley: 'Swaraj Tractor + Trolley',
        };

        const newAcc: UserAccount = {
          id: accId,
          name: ownerName,
          phone,
          role: 'transporter',
          villageId,
          preferredLanguage: st.language,
          avatarInitials: ownerName.slice(0, 2).toUpperCase(),
          verified: true,
          createdAt: new Date().toISOString(),
        };

        set((cur) => ({
          accounts: [newAcc, ...cur.accounts],
          vehicles: [
            {
              id: vId,
              transporterId: tId,
              plate,
              type: vehicleType,
              typeName: typeNames[vehicleType],
              capacityQuintals,
              costPerKmInr: vehicleType === 'eicher_14ft' ? 30 : 21,
              baseVillageId: villageId,
              homeVillageId: villageId,
              currentNodeId: villageId,
              lat: homeNode.lat,
              lng: homeNode.lng,
              headingDeg: 45,
              detourBudgetKm: 14,
              ageYears: 2,
              rcValidUntil,
              status: 'standby',
              standbyOptIn: true,
              standbyRetainerInr: 350,
            },
            ...cur.vehicles,
          ],
          transporters: [
            {
              id: tId,
              accountId: accId,
              name: ownerName,
              phone,
              homeVillageId: villageId,
              vehicleIds: [vId],
              reliabilityScore: 95,
              completedTours: 19,
              cancellationsCount: 0,
              walletBalanceInr: 6800,
              escrowInTransitInr: 1450,
              verifiedMonthlyEarningsInr: 48500,
              bankAccountMasked: '•••• 6104',
              ifsc: 'CNRB0001427',
              standbyActive: true,
              preferredLanguage: cur.language,
            },
            ...cur.transporters,
          ],
          onboardingQueue: [
            {
              id: `onb_${Date.now()}`,
              applicantName: ownerName,
              phone,
              villageId,
              vehiclePlate: plate,
              vehicleType,
              capacityQuintals,
              rcValidUntil,
              missedCallVerified: true,
              status: 'approved',
              submittedAt: new Date().toISOString(),
              reviewerNote: 'Auto-verified via RC scan & missed call',
            },
            ...cur.onboardingQueue,
          ],
          currentAccountId: accId,
        }));
        eventBus.emit('confetti', { reason: 'onboarding_done' });
        pushToast('Vehicle Onboarded', `${plate} is active on ${homeNode.name} corridor.`, 'success');
        return newAcc;
      },

      prebookReturnLegCapacity: async ({
        businessId,
        businessName,
        cargo,
        weightQuintals,
        originNodeId,
        destinationNodeId,
        ratePerQuintalInr,
      }) => {
        await delay(280);
        const totalOfferInr = Math.round(weightQuintals * ratePerQuintalInr);
        set((cur) => ({
          returnLegOffers: [
            {
              id: `ret_${Date.now()}`,
              businessId,
              businessName,
              cargo,
              weightQuintals,
              originNodeId,
              destinationNodeId,
              date: new Date(Date.now() + 3 * 3_600_000).toISOString(),
              ratePerQuintalInr,
              totalOfferInr,
              tourDiscountPct: 22,
              status: 'open',
            },
            ...cur.returnLegOffers,
          ],
        }));
        pushToast(
          'Return Capacity Pre-Booked',
          `${weightQuintals} qtl listed on return marketplace at ₹${ratePerQuintalInr}/qtl (22% tour discount).`,
          'success',
        );
      },

      toggleStandingOrder: (orderId) => {
        set((cur) => ({
          standingOrders: cur.standingOrders.map((o) =>
            o.id === orderId ? { ...o, active: !o.active } : o,
          ),
        }));
      },

      createStandingOrder: ({ businessId, cargo, originNodeId, destinationNodeId, frequency, quintalsPerRun }) => {
        set((cur) => ({
          standingOrders: [
            {
              id: `so_${Date.now()}`,
              businessId,
              cargo,
              originNodeId,
              destinationNodeId,
              frequency,
              quintalsPerRun,
              active: true,
              nextRunDate: new Date(Date.now() + 86_400_000).toISOString(),
            },
            ...cur.standingOrders,
          ],
        }));
        pushToast('Standing Order Created', `Recurring ${frequency.replace('_', ' ')} dispatch scheduled.`, 'success');
      },

      bulkImportBusinessLoads: async (rows, businessName, businessPhone) => {
        await delay(340);
        const st = get();
        const nodeMap = new Map(st.nodes.map((n) => [n.id, n]));
        const created: LoadRequest[] = rows.map((r, idx) => {
          const pNode = nodeMap.get(r.originNodeId) ?? st.nodes[0];
          const dNode = nodeMap.get(r.destinationNodeId) ?? st.nodes[1];
          const distKm = roadDistanceKm(pNode, dNode, 1.3);
          const solo = Math.round(300 + distKm * 21);
          return {
            id: `load_csv_${Date.now()}_${idx}`,
            shipperId: 'biz_1',
            shipperName: businessName,
            shipperRole: 'business',
            shipperPhone: businessPhone,
            crop: r.crop,
            weightQuintals: r.weightQuintals,
            unitLabel: `${r.weightQuintals} quintal`,
            pickupNodeId: pNode.id,
            dropNodeId: dNode.id,
            readyAt: new Date(Date.now() + 2 * 3_600_000).toISOString(),
            latestDispatchAt: new Date(Date.now() + 18 * 3_600_000).toISOString(),
            maxWaitHours: 4,
            minDiscountPct: 18,
            freshnessScore: 95,
            urgencyTag: 'calm',
            ambientTempC: 28,
            status: 'requested',
            quotedPriceInr: Math.round(solo * 0.76),
            soloPriceInr: solo,
            paymentStatus: 'unpaid',
            isReturnLoad: true,
            createdAt: new Date().toISOString(),
          };
        });
        set((cur) => ({ loads: [...created, ...cur.loads] }));
        pushToast('CSV Manifest Imported', `${created.length} shipments queued into corridor pooling.`, 'success');
        return created.length;
      },

      sendFpoAnnouncement: ({ fpoId, title, bodyEn, bodyHi, bodyKn }) => {
        const fpo = get().fpos.find((f) => f.id === fpoId) ?? get().fpos[0];
        set((cur) => ({
          fpoAnnouncements: [
            {
              id: `ann_${Date.now()}`,
              fpoId,
              title,
              bodyEn,
              bodyHi,
              bodyKn,
              sentAt: new Date().toISOString(),
              deliveredCount: fpo.memberCount,
              readCount: Math.max(1, Math.round(fpo.memberCount * 0.25)),
            },
            ...cur.fpoAnnouncements,
          ],
        }));
        pushToast('Broadcast Sent', `Delivered to ${fpo.memberCount} FPO members in 3 languages.`, 'success');
      },

      setFpoPreferredSplitRule: (fpoId, rule) => {
        set((cur) => ({
          fpos: cur.fpos.map((f) => (f.id === fpoId ? { ...f, preferredSplitRule: rule } : f)),
        }));
        pushToast('FPO Split Rule Updated', `Collective default rule set to ${rule.toUpperCase()}.`, 'info');
      },

      setKioskOfflineMode: async (offline) => {
        set({ kioskOfflineMode: offline });
        if (!offline) {
          // Store-and-forward sync all unsynced offline bookings!
          const pending = get().kioskOfflineQueue.filter((q) => !q.synced);
          if (pending.length > 0) {
            await delay(550);
            for (const item of pending) {
              const created = await get().createLoadAndPool({
                shipperId: `kiosk_walkin_${item.id}`,
                shipperName: item.farmerName,
                shipperPhone: item.farmerPhone,
                shipperRole: 'kiosk',
                crop: item.crop,
                weightQuintals: item.weightQuintals,
                unitLabel: `${item.weightQuintals} quintal`,
                pickupNodeId: item.villageId,
                dropNodeId: item.dropNodeId,
                maxWaitHours: 3,
                minDiscountPct: 15,
                freshnessScore: item.freshnessScore,
              });
              set((cur) => ({
                kioskOfflineQueue: cur.kioskOfflineQueue.map((q) =>
                  q.id === item.id ? { ...q, synced: true, syncedLoadId: created.load.id } : q,
                ),
              }));
            }
            eventBus.emit('confetti', { reason: 'kiosk_synced' });
            pushToast(
              'Offline Queue Synced',
              `Forwarded ${pending.length} queued walk-in bookings into live pools.`,
              'success',
            );
          } else {
            pushToast('Connection Restored', 'Freight Sakhi terminal is online.', 'info');
          }
        } else {
          pushToast(
            'Store-and-Forward Active',
            'Connection paused. Walk-in bookings will save locally and sync automatically when online.',
            'warning',
          );
        }
      },

      submitKioskWalkInBooking: async (params) => {
        const st = get();
        if (st.kioskOfflineMode) {
          await delay(140);
          const qItem = {
            id: `kq_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
            ...params,
            queuedAt: new Date().toISOString(),
            synced: false,
          };
          set((cur) => ({
            kioskOfflineQueue: [qItem, ...cur.kioskOfflineQueue],
            kiosks: cur.kiosks.map((k, idx) =>
              idx === 0 ? { ...k, farmersServed: k.farmersServed + 1 } : k,
            ),
          }));
          pushToast(
            'Saved to Offline Queue',
            `${params.farmerName} (${params.weightQuintals} qtl) stored locally for auto-sync.`,
            'warning',
          );
          return { queuedOffline: true };
        }

        const res = await get().createLoadAndPool({
          shipperId: `kiosk_farmer_${Date.now()}`,
          shipperName: params.farmerName,
          shipperPhone: params.farmerPhone,
          shipperRole: 'kiosk',
          crop: params.crop,
          weightQuintals: params.weightQuintals,
          unitLabel: `${params.weightQuintals} quintal`,
          pickupNodeId: params.villageId,
          dropNodeId: params.dropNodeId,
          maxWaitHours: 3,
          minDiscountPct: 15,
          freshnessScore: params.freshnessScore,
        });
        set((cur) => ({
          kiosks: cur.kiosks.map((k, idx) =>
            idx === 0 ? { ...k, farmersServed: k.farmersServed + 1 } : k,
          ),
        }));
        return { queuedOffline: false, loadId: res.load.id };
      },

      triggerNetworkEvent: async (triggerType, targetPoolId, reasonOverride) => {
        await delay(460);
        const st = get();
        const targetPool =
          st.pools.find((p) => p.id === targetPoolId) ??
          st.pools.find((p) => p.status === 'en_route' || p.status === 'confirmed') ??
          st.pools[0];

        const poolLoads = st.loads.filter((l) => targetPool.loadIds.includes(l.id));
        const solverInputs = poolLoads.map((l) => ({
          id: l.id,
          crop: l.crop,
          weightQuintals: l.weightQuintals,
          pickupNodeId: l.pickupNodeId,
          dropNodeId: l.dropNodeId,
          readyMinutesFromNow: 0,
          spoilageDeadlineMinutes: 240,
        }));

        const replanned = minimalChangeReplan({
          affectedLoads: solverInputs,
          candidateVehicles: st.vehicles,
          excludedVehicleId: targetPool.vehicleId,
          nodes: st.nodes,
          edges: st.edges,
        });

        const newTransporter =
          st.transporters.find((t) => t.id === replanned.selectedVehicle.transporterId) ??
          st.transporters[1];

        const reasonsByType: Record<SelfHealRecord['triggerType'], string> = {
          transporter_cancel: reasonOverride ?? 'Operator cancelled before village pickup due to family emergency',
          breakdown: reasonOverride ?? 'Radiator hose leak detected near Narasapura junction; standby dispatched',
          rain_spike: reasonOverride ?? '28 mm sudden cloudburst in Srinivaspur; switched open trolley to covered Eicher',
          late_load: reasonOverride ?? 'Late-arriving 11 qtl tomato harvest absorbed via local-search stop insertion',
          harvest_surge: reasonOverride ?? 'Morning mandi surge (+34% arrivals); activated 2 standby vehicles in Vemgal',
        };

        const untouchedCount = Math.max(1, st.pools.length - 1);
        const record: SelfHealRecord = {
          id: `heal_${Date.now()}`,
          poolId: targetPool.id,
          triggerType,
          reason: reasonsByType[triggerType],
          previousVehiclePlate: targetPool.vehiclePlate,
          newVehiclePlate: replanned.selectedVehicle.plate,
          newTransporterName: newTransporter.name,
          oldRouteNodeIds: targetPool.routeNodeIds,
          newRouteNodeIds: replanned.newRouteNodeIds,
          affectedLoadIds: targetPool.loadIds,
          untouchedPoolCount: untouchedCount,
          recoverySeconds: replanned.recoverySeconds,
          occurredAt: new Date().toISOString(),
          notificationsSent: [
            {
              recipient: `${poolLoads[0]?.shipperName ?? 'Ramesh'} & ${Math.max(0, poolLoads.length - 1)} pool shippers`,
              role: 'farmer',
              deliveredMs: 380,
              message: `Pool ${targetPool.code} seamlessly switched to ${replanned.selectedVehicle.plate} (${newTransporter.name}). Fare & escrow unchanged.`,
            },
            {
              recipient: `${newTransporter.name} (Standby)`,
              role: 'transporter',
              deliveredMs: 290,
              message: `Standby takeover activated for ${targetPool.code} (+₹350 standby retainer + ₹${targetPool.transporterEarningsInr} tour fare).`,
            },
            {
              recipient: 'Control Tower Desk',
              role: 'ops',
              deliveredMs: 160,
              message: `Minimal-change re-solve finished in ${replanned.recoverySeconds}s; ${untouchedCount} other pools untouched.`,
            },
          ],
        };

        set((cur) => ({
          pools: cur.pools.map((p) =>
            p.id === targetPool.id
              ? {
                  ...p,
                  vehicleId: replanned.selectedVehicle.id,
                  vehiclePlate: replanned.selectedVehicle.plate,
                  vehicleType: replanned.selectedVehicle.type,
                  transporterId: newTransporter.id,
                  transporterName: newTransporter.name,
                  transporterPhone: newTransporter.phone,
                  routeNodeIds: replanned.newRouteNodeIds,
                  outboundKm: replanned.outboundKm || p.outboundKm,
                  healedFromPoolId: p.id,
                  recoverySeconds: replanned.recoverySeconds,
                }
              : p,
          ),
          selfHealHistory: [record, ...cur.selfHealHistory],
          notifications: [
            {
              id: `notif_heal_${Date.now()}`,
              recipientRole: 'all',
              title: `Self-Healed ${targetPool.code} in ${replanned.recoverySeconds}s`,
              body: `${replanned.selectedVehicle.plate} (${newTransporter.name}) took over automatically. ${untouchedCount} other pools untouched; zero re-booking needed.`,
              severity: 'warning',
              createdAt: new Date().toISOString(),
              read: false,
              linkPath: '/ops/healing',
            },
            ...cur.notifications,
          ],
        }));

        eventBus.emit('self_heal', {
          poolId: targetPool.id,
          poolCode: targetPool.code,
          newPlate: replanned.selectedVehicle.plate,
          recoverySeconds: replanned.recoverySeconds,
        });
        pushToast(
          `Self-Healed in ${replanned.recoverySeconds}s`,
          `Pool ${targetPool.code} reassigned to ${replanned.selectedVehicle.plate}. ${untouchedCount} pools untouched.`,
          'coral',
        );
        return record;
      },

      resolveDisputeCase: async (disputeId, adjustedPayoutInr, resolutionNote) => {
        await delay(260);
        const st = get();
        const disp = st.disputes.find((d) => d.id === disputeId);
        if (!disp) return;

        set((cur) => ({
          disputes: cur.disputes.map((d) =>
            d.id === disputeId
              ? { ...d, status: 'resolved', adjustedPayoutInr, resolutionNote }
              : d,
          ),
          ledger: [
            {
              id: `led_disp_${Date.now()}`,
              timestamp: new Date().toISOString(),
              poolCode: disp.poolCode,
              partyName: disp.againstParty,
              partyRole: 'transporter',
              kind: 'released',
              amountInr: adjustedPayoutInr,
              upiRef: `ADJ${Date.now().toString().slice(-7)}`,
              status: 'settled',
              notes: `Dispute ${disp.id} settled: ${resolutionNote}`,
            },
            ...cur.ledger,
          ],
        }));
        pushToast('Dispute Resolved', `Escrow settled at ₹${adjustedPayoutInr} (${disp.poolCode}).`, 'success');
      },

      reviewOnboardingApplication: (appId, decision, note) => {
        set((cur) => ({
          onboardingQueue: cur.onboardingQueue.map((a) =>
            a.id === appId ? { ...a, status: decision, reviewerNote: note } : a,
          ),
        }));
        pushToast(
          decision === 'approved' ? 'Transporter Approved' : 'Revision Requested',
          `Application updated: ${note}`,
          decision === 'approved' ? 'success' : 'info',
        );
      },

      updatePersonaTrait: (personaId, traitKey, value) => {
        set((cur) => ({
          personas: cur.personas.map((p) =>
            p.id === personaId
              ? { ...p, traits: { ...p.traits, [traitKey]: value } }
              : p,
          ),
        }));
      },

      runSyntheticTalukaPolicy: async (policyText) => {
        await delay(300);
        const result = evaluatePolicyOnTaluka(policyText, get().personas);
        set((cur) => ({
          policyRuns: [result, ...cur.policyRuns],
        }));
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => {
        // Persist data state across refreshes
        const {
          hydrateAuditHashes: _1,
          setLanguage: _2,
          setReduceMotion: _3,
          loginWithPhone: _4,
          registerNewAccount: _5,
          switchAccount: _6,
          logout: _7,
          restoreInitialState: _8,
          simulationTick: _9,
          setSimulationPaused: _10,
          createLoadAndPool: _11,
          voteOnSplitRule: _12,
          payForLoadEscrow: _13,
          cancelFarmerLoad: _14,
          confirmDeliveryAndRate: _15,
          sendChatMessage: _16,
          markAllNotificationsRead: _17,
          respondToPoolOffer: _18,
          advanceTripChecklist: _19,
          reorderPoolStops: _20,
          attachReturnLegToPool: _21,
          toggleStandbyRetainer: _22,
          withdrawTransporterWallet: _23,
          addTransporterBank: _24,
          applyForCreditProduct: _25,
          completeTransporterOnboarding: _26,
          prebookReturnLegCapacity: _27,
          toggleStandingOrder: _28,
          createStandingOrder: _29,
          bulkImportBusinessLoads: _30,
          sendFpoAnnouncement: _31,
          setFpoPreferredSplitRule: _32,
          setKioskOfflineMode: _33,
          submitKioskWalkInBooking: _34,
          triggerNetworkEvent: _35,
          resolveDisputeCase: _36,
          reviewOnboardingApplication: _37,
          updatePersonaTrait: _38,
          runSyntheticTalukaPolicy: _39,
          ...persistedData
        } = state;
        return persistedData;
      },
    },
  ),
);
