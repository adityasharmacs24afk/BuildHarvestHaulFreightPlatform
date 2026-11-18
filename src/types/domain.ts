import type { LanguageCode } from '@/app/constants';

export type UserRole = 'farmer' | 'transporter' | 'business' | 'fpo' | 'kiosk' | 'ops';

export type NodeKind = 'village' | 'mandi' | 'cold_chain' | 'input_dealer' | 'factory';

export interface GeoNode {
  id: string;
  name: string;
  nameHi: string;
  nameKn: string;
  kind: NodeKind;
  lat: number;
  lng: number;
  taluka: string;
  baseDemandQuintals: number;
}

export interface RoadEdge {
  from: string;
  to: string;
  distanceKm: number;
  travelMinutes: number;
  roadClass: 'highway' | 'state' | 'rural';
}

export type CropOrCargo =
  | 'tomato'
  | 'potato'
  | 'beans'
  | 'carrot'
  | 'cabbage'
  | 'capsicum'
  | 'ragi'
  | 'mango'
  | 'flowers'
  | 'fertiliser'
  | 'poultry_feed'
  | 'crates_packaging';

export type VehicleType = 'tata_ace' | 'bolero_pickup' | 'eicher_14ft' | 'tractor_trolley';

export interface UserAccount {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  villageId: string;
  preferredLanguage: LanguageCode;
  avatarInitials: string;
  organisationName?: string;
  verified: boolean;
  createdAt: string;
}

export interface FarmerProfile {
  id: string;
  accountId: string;
  name: string;
  phone: string;
  villageId: string;
  fpoId: string;
  landAcres: number;
  primaryCrops: CropOrCargo[];
  preferredLanguage: LanguageCode;
  digitalComfort: 'voice_only' | 'assisted' | 'smartphone';
  completedShipments: number;
  totalSavedInr: number;
}

export interface Vehicle {
  id: string;
  transporterId: string;
  plate: string;
  type: VehicleType;
  typeName: string;
  capacityQuintals: number;
  costPerKmInr: number;
  baseVillageId: string;
  homeVillageId: string;
  currentNodeId: string;
  lat: number;
  lng: number;
  headingDeg: number;
  detourBudgetKm: number;
  ageYears: number;
  rcValidUntil: string;
  status: 'idle' | 'en_route' | 'loading' | 'standby' | 'maintenance';
  standbyOptIn: boolean;
  standbyRetainerInr: number;
}

export interface TransporterProfile {
  id: string;
  accountId: string;
  name: string;
  phone: string;
  homeVillageId: string;
  vehicleIds: string[];
  reliabilityScore: number; // 0-100
  completedTours: number;
  cancellationsCount: number;
  walletBalanceInr: number;
  escrowInTransitInr: number;
  verifiedMonthlyEarningsInr: number;
  bankAccountMasked: string;
  ifsc: string;
  standbyActive: boolean;
  preferredLanguage: LanguageCode;
}

export interface FpoProfile {
  id: string;
  accountId: string;
  name: string;
  regNumber: string;
  hqVillageId: string;
  coordinatorName: string;
  phone: string;
  memberCount: number;
  preferredSplitRule: SplitRule;
  totalPooledQuintals: number;
  memberSavingsInr: number;
}

export interface BusinessProfile {
  id: string;
  accountId: string;
  name: string;
  category: 'input_dealer' | 'pulp_factory' | 'feed_unit' | 'mandi_trader' | 'commission_agent';
  nodeId: string;
  contactName: string;
  phone: string;
  gstin: string;
  monthlyVolumeQuintals: number;
}

export interface KioskOperator {
  id: string;
  accountId: string;
  name: string;
  phone: string;
  villageId: string;
  kioskCode: string;
  farmersServed: number;
}

export type LoadStatus =
  | 'requested'
  | 'pooling'
  | 'confirmed'
  | 'en_route'
  | 'delivered_awaiting_confirm'
  | 'completed'
  | 'cancelled';

export type SplitRule = 'shapley' | 'weight' | 'distance' | 'equal';

export interface LoadRequest {
  id: string;
  shipperId: string;
  shipperName: string;
  shipperRole: 'farmer' | 'business' | 'fpo' | 'kiosk';
  shipperPhone: string;
  crop: CropOrCargo;
  weightQuintals: number;
  unitLabel: string;
  pickupNodeId: string;
  dropNodeId: string;
  readyAt: string;
  latestDispatchAt: string;
  maxWaitHours: number;
  minDiscountPct: number;
  freshnessScore: number; // 0-100
  urgencyTag: 'calm' | 'watch' | 'urgent';
  ambientTempC: number;
  status: LoadStatus;
  poolId?: string;
  quotedPriceInr: number;
  soloPriceInr: number;
  paymentStatus: 'unpaid' | 'escrow_held' | 'released' | 'refunded';
  isReturnLoad: boolean;
  createdAt: string;
  confirmedWeightQuintals?: number;
  driverRating?: number;
}

export interface PoolStop {
  nodeId: string;
  kind: 'pickup' | 'drop' | 'return_pickup' | 'return_drop';
  loadId: string;
  shipperFirstName: string;
  villageName: string;
  crop: CropOrCargo;
  weightQuintals: number;
  eta: string;
  lifoSequence: number;
  completed: boolean;
}

export interface ShapleyShare {
  loadId: string;
  shipperName: string;
  villageName: string;
  weightQuintals: number;
  directDistanceKm: number;
  soloCostInr: number;
  baseWeightChargeInr: number;
  distanceComponentInr: number;
  detourDeltaInr: number;
  returnLegCreditInr: number;
  shapleyShareInr: number;
  weightRuleShareInr: number;
  distanceRuleShareInr: number;
  equalRuleShareInr: number;
  finalShareInr: number;
  savingsPct: number;
}

export interface SplitVote {
  voterId: string;
  voterName: string;
  choice: SplitRule;
}

export type SolverName = 'Greedy first-come' | 'Local-search router' | 'Annealing (QUBO)';

export interface Pool {
  id: string;
  code: string;
  loadIds: string[];
  returnLoadIds: string[];
  vehicleId: string;
  transporterId: string;
  transporterName: string;
  transporterPhone: string;
  vehiclePlate: string;
  vehicleType: VehicleType;
  capacityQuintals: number;
  totalWeightQuintals: number;
  returnWeightQuintals: number;
  fillPct: number;
  status: 'forming' | 'offered' | 'confirmed' | 'en_route' | 'completed' | 'replanning';
  stops: PoolStop[];
  routeNodeIds: string[];
  returnRouteNodeIds: string[];
  outboundKm: number;
  returnKm: number;
  emptyKmSaved: number;
  tourCostInr: number;
  fuelCostInr: number;
  driverCostInr: number;
  tollCostInr: number;
  marginInr: number;
  returnDiscountInr: number;
  transporterEarningsInr: number;
  splitRule: SplitRule;
  votes: SplitVote[];
  shares: ShapleyShare[];
  solverUsed: SolverName;
  cancellationRiskPct: number;
  spoilageRiskPct: number;
  progressPct: number; // 0-100 along route
  departedAt?: string;
  etaDestination: string;
  checklistStep: number; // 0..6 for trip execution
  healedFromPoolId?: string;
  recoverySeconds?: number;
  createdAt: string;
}

export interface SelfHealRecord {
  id: string;
  poolId: string;
  triggerType: 'transporter_cancel' | 'breakdown' | 'rain_spike' | 'late_load' | 'harvest_surge';
  reason: string;
  previousVehiclePlate: string;
  newVehiclePlate: string;
  newTransporterName: string;
  oldRouteNodeIds: string[];
  newRouteNodeIds: string[];
  affectedLoadIds: string[];
  untouchedPoolCount: number;
  recoverySeconds: number;
  occurredAt: string;
  notificationsSent: { recipient: string; role: UserRole; deliveredMs: number; message: string }[];
}

export interface PriceAuditEntry {
  id: string;
  index: number;
  poolId: string;
  poolCode: string;
  timestamp: string;
  solver: SolverName;
  splitRule: SplitRule;
  totalInr: number;
  sharesSummary: string;
  prevHash: string;
  hash: string;
}

export interface HistoricalTrip {
  id: string;
  date: string;
  transporterId: string;
  vehiclePlate: string;
  originNodeId: string;
  destinationNodeId: string;
  crop: CropOrCargo;
  quintals: number;
  outboundFillPct: number;
  returnFillPct: number;
  distanceKm: number;
  emptyKm: number;
  pricePerQuintalInr: number;
  transporterEarnedInr: number;
  shadowPlannedEarnedInr: number;
  rating: number;
  cancelled: boolean;
  onTime: boolean;
}

export interface ReturnLegOffer {
  id: string;
  businessId: string;
  businessName: string;
  cargo: CropOrCargo;
  weightQuintals: number;
  originNodeId: string;
  destinationNodeId: string;
  date: string;
  ratePerQuintalInr: number;
  totalOfferInr: number;
  tourDiscountPct: number;
  attachedPoolId?: string;
  status: 'open' | 'attached' | 'completed';
}

export interface StandingOrder {
  id: string;
  businessId: string;
  cargo: CropOrCargo;
  originNodeId: string;
  destinationNodeId: string;
  frequency: 'daily' | 'twice_weekly' | 'weekly';
  quintalsPerRun: number;
  active: boolean;
  nextRunDate: string;
}

export interface LedgerEntry {
  id: string;
  timestamp: string;
  poolCode: string;
  loadId?: string;
  partyName: string;
  partyRole: UserRole;
  kind: 'collected' | 'held' | 'released' | 'refunded' | 'payout';
  amountInr: number;
  upiRef: string;
  status: 'settled' | 'escrow_active' | 'processing';
  notes: string;
}

export interface DisputeCase {
  id: string;
  poolCode: string;
  loadId: string;
  raisedBy: string;
  againstParty: string;
  category: 'weight_mismatch' | 'payment_hold' | 'no_show';
  status: 'open' | 'under_review' | 'resolved';
  bookedWeightQuintals: number;
  weighbridgeQuintals: number;
  slipNumber: string;
  escrowAmountInr: number;
  tolerancePct: number;
  summary: string;
  createdAt: string;
  resolutionNote?: string;
  adjustedPayoutInr?: number;
}

export interface OnboardingApplication {
  id: string;
  applicantName: string;
  phone: string;
  villageId: string;
  vehiclePlate: string;
  vehicleType: VehicleType;
  capacityQuintals: number;
  rcValidUntil: string;
  missedCallVerified: boolean;
  status: 'pending' | 'approved' | 'changes_requested';
  submittedAt: string;
  reviewerNote?: string;
}

export interface CreditApplication {
  id: string;
  transporterId: string;
  lenderName: string;
  productType: 'fuel_credit' | 'tyre_working_capital' | 'vehicle_upgrade_loan';
  amountInr: number;
  aprPct: number;
  status: 'submitted' | 'verified' | 'sanctioned';
  appliedAt: string;
}

export interface AppNotification {
  id: string;
  recipientRole: UserRole | 'all';
  title: string;
  body: string;
  severity: 'info' | 'success' | 'warning' | 'urgent';
  createdAt: string;
  read: boolean;
  linkPath?: string;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  senderName: string;
  senderRole: UserRole | 'system';
  text: string;
  isVoiceNote?: boolean;
  voiceDurationSec?: number;
  createdAt: string;
}

export interface FpoAnnouncement {
  id: string;
  fpoId: string;
  title: string;
  bodyEn: string;
  bodyHi: string;
  bodyKn: string;
  sentAt: string;
  deliveredCount: number;
  readCount: number;
}

export interface KioskOfflineBooking {
  id: string;
  farmerName: string;
  farmerPhone: string;
  villageId: string;
  crop: CropOrCargo;
  weightQuintals: number;
  dropNodeId: string;
  freshnessScore: number;
  queuedAt: string;
  synced: boolean;
  syncedLoadId?: string;
}

export interface DailySeriesPoint {
  date: string;
  rainMm: number;
  tempMaxC: number;
  tomatoModalPriceInr: number;
  potatoModalPriceInr: number;
  beansModalPriceInr: number;
  mandiArrivalQuintals: number;
  emptyKmPct: number;
  avgFillPct: number;
}

export interface VoicePhraseSeed {
  id: string;
  lang: LanguageCode;
  role: 'farmer' | 'business' | 'transporter';
  transcript: string;
  translationEn: string;
}

export interface PersonaTraitSet {
  riskAppetite: number; // 0-100
  trustInStrangers: number;
  priceSensitivity: number;
  patience: number;
  loyalty: number;
  digitalComfort: number;
  literacy: number;
  neighbourInfluence: number;
}

export interface SyntheticPersona {
  id: string;
  name: string;
  archetype: string;
  stakeholderGroup: 'farmer' | 'fpo' | 'transporter' | 'trader' | 'input_dealer';
  villageName: string;
  age: number;
  preferredLanguage: LanguageCode;
  bio: string;
  connectedPersonaIds: string[];
  traits: PersonaTraitSet;
}

export interface PersonaReaction {
  personaId: string;
  personaName: string;
  archetype: string;
  stakeholderGroup: SyntheticPersona['stakeholderGroup'];
  stance: 'accept' | 'counter' | 'reject';
  fairnessScore: number; // 1..5
  churnRiskPct: number;
  rumourSpreadStrength: number; // -100 to +100
  reasonEn: string;
  reasonHi: string;
  reasonKn: string;
  objectionTag?: string;
}

export interface PolicySimulationResult {
  id: string;
  policyText: string;
  ranAt: string;
  acceptancePct: number;
  avgFairness: number;
  predictedChurnPct: number;
  mainObjections: string[];
  unintendedConsequences: string[];
  suggestedFixText: string;
  reactions: PersonaReaction[];
}

export interface SolverBenchmarkResult {
  solver: SolverName;
  scenarioId: 'small' | 'medium' | 'harvest_peak';
  seed: number;
  poolsCreated: number;
  avgFillPct: number;
  emptyKm: number;
  costPerQuintalInr: number;
  spoilageViolations: number;
  solveTimeMs: number;
  assignments: { vehicleId: string; loadIds: string[]; routeNodes: string[]; fillPct: number }[];
}
