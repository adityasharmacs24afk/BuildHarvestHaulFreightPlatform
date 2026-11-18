import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Download,
  Lock,
  MapPin,
  PhoneCall,
  PhoneOff,
  QrCode,
  RefreshCw,
  Share2,
  ShieldCheck,
  Star,
  XCircle,
} from 'lucide-react';
import { KolarNetworkMap } from '@/components/map/KolarNetworkMap';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { CARGO_CATALOG } from '@/engine/compatibility';
import { pushToast } from '@/services/eventBus';
import { downloadPoolReceiptPdf } from '@/services/pdfExport';
import { useAppStore } from '@/stores/useAppStore';

export function FarmerPayTrackPage() {
  const navigate = useNavigate();
  const nodes = useAppStore((s) => s.nodes);
  const edges = useAppStore((s) => s.edges);
  const vehicles = useAppStore((s) => s.vehicles);
  const pools = useAppStore((s) => s.pools);
  const loads = useAppStore((s) => s.loads);
  const farmers = useAppStore((s) => s.farmers);
  const currentAccountId = useAppStore((s) => s.currentAccountId);
  const selfHealHistory = useAppStore((s) => s.selfHealHistory);

  const payForLoadEscrow = useAppStore((s) => s.payForLoadEscrow);
  const cancelFarmerLoad = useAppStore((s) => s.cancelFarmerLoad);
  const confirmDeliveryAndRate = useAppStore((s) => s.confirmDeliveryAndRate);
  const createLoadAndPool = useAppStore((s) => s.createLoadAndPool);

  const activeFarmer = farmers.find((f) => f.accountId === currentAccountId) ?? farmers[0];
  const myLoads = loads.filter(
    (l) => l.shipperId === activeFarmer.id || l.shipperName === activeFarmer.name,
  );
  const [selectedLoadId, setSelectedLoadId] = useState<string>(
    myLoads[0]?.id ?? loads[0]?.id ?? 'load_1',
  );

  const activeLoad = loads.find((l) => l.id === selectedLoadId) ?? myLoads[0] ?? loads[0];
  const activePool =
    pools.find((p) => p.id === activeLoad.poolId) ?? pools[0];
  const myShare =
    activePool.shares.find((s) => s.loadId === activeLoad.id) ?? activePool.shares[0];

  // UPI Payment Flow State
  const [upiModalOpen, setUpiModalOpen] = useState(false);
  const [upiStep, setUpiStep] = useState<'app' | 'pin' | 'done'>('app');
  const [upiApp, setUpiApp] = useState('BHIM UPI');
  const [upiPin, setUpiPin] = useState('2846');
  const [paying, setPaying] = useState(false);

  // Call Driver Sheet State
  const [callOpen, setCallOpen] = useState(false);

  // Post-delivery confirmation state
  const deliveredLoad =
    myLoads.find((l) => l.status === 'delivered_awaiting_confirm') ??
    loads.find((l) => l.status === 'delivered_awaiting_confirm');
  const [confirmedWeight, setConfirmedWeight] = useState<number>(
    deliveredLoad?.weightQuintals ?? activeLoad.weightQuintals,
  );
  const [rating, setRating] = useState<number>(5);

  const recentHeal = selfHealHistory.find((h) => h.poolId === activePool.id) ?? selfHealHistory[0];

  const handleCompleteUpi = async () => {
    setPaying(true);
    await payForLoadEscrow(activeLoad.id, upiApp);
    setPaying(false);
    setUpiStep('done');
  };

  const handleRebookOneTap = async () => {
    const target = deliveredLoad ?? activeLoad;
    await createLoadAndPool({
      shipperId: activeFarmer.id,
      shipperName: activeFarmer.name,
      shipperPhone: activeFarmer.phone,
      shipperRole: 'farmer',
      crop: target.crop,
      weightQuintals: target.weightQuintals,
      unitLabel: target.unitLabel,
      pickupNodeId: target.pickupNodeId,
      dropNodeId: target.dropNodeId,
      maxWaitHours: 2,
      minDiscountPct: 16,
      freshnessScore: 90,
    });
    navigate('/farmer/pool');
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      {/* Calm Self-Healing Notification Banner if a vehicle switched */}
      {recentHeal && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sky bg-sky-100/80 px-4 py-3 text-xs text-ink"
        >
          <div className="flex items-center gap-2.5">
            <RefreshCw className="h-4 w-4 shrink-0 text-primary-strong" />
            <div>
              <span className="font-extrabold">Automatic Standby Protection Active:</span>{' '}
              Pool switched seamlessly from {recentHeal.previousVehiclePlate} to{' '}
              <strong>{recentHeal.newVehiclePlate}</strong> ({recentHeal.newTransporterName}) in{' '}
              {recentHeal.recoverySeconds}s. Your fare and escrow remain unchanged — nothing to redo.
            </div>
          </div>
        </motion.div>
      )}

      {/* Active Load Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-ink sm:text-3xl">
            Escrow Payment, Live Tracking & Delivery
          </h1>
          <p className="text-xs text-ink-muted">
            Money stays locked in UPI escrow until your harvest weight is confirmed at the mandi gate.
          </p>
        </div>
        <select
          aria-label="Select shipment to track"
          value={activeLoad.id}
          onChange={(e) => setSelectedLoadId(e.target.value)}
          className="min-h-[42px] rounded-xl border border-border bg-surface px-3.5 text-xs font-bold text-ink"
        >
          {(myLoads.length > 0 ? myLoads : loads.slice(0, 5)).map((ld) => (
            <option key={ld.id} value={ld.id}>
              {CARGO_CATALOG[ld.crop].labelEn} ({ld.weightQuintals} qtl) • {ld.status.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>

      {/* Live Tracking Map + Trip Controls */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-8">
          <KolarNetworkMap
            nodes={nodes}
            edges={edges}
            vehicles={vehicles.filter((v) => v.id === activePool.vehicleId || v.status === 'standby')}
            highlightedPool={activePool}
            heightClass="h-[380px]"
          />

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4 shadow-soft">
            <div>
              <div className="text-xs text-ink-muted">Assigned Driver & Vehicle</div>
              <div className="text-sm font-extrabold text-ink">
                {activePool.transporterName} • {activePool.vehiclePlate}
              </div>
              <div className="text-xs text-primary-strong font-semibold">
                Route progress: {activePool.progressPct}% • Destination ETA:{' '}
                {new Date(activePool.etaDestination).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCallOpen(true)}
                className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-white hover:bg-primary-strong"
              >
                <PhoneCall className="h-4 w-4" /> Call Driver
              </button>
              <button
                type="button"
                onClick={() =>
                  pushToast(
                    'Pickup Pin Shared',
                    `Sent field gate GPS pin near ${myShare.villageName} to ${activePool.transporterName}.`,
                    'info',
                  )
                }
                className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-border bg-surface-2 px-3.5 py-2 text-xs font-bold text-ink hover:border-primary"
              >
                <Share2 className="h-4 w-4 text-primary-strong" /> Share Gate Pin
              </button>
              {activeLoad.status !== 'completed' && activeLoad.status !== 'cancelled' && (
                <button
                  type="button"
                  onClick={() => cancelFarmerLoad(activeLoad.id)}
                  className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-coral/50 bg-coral-100/50 px-3 py-2 text-xs font-bold text-ink hover:bg-coral-100"
                >
                  <XCircle className="h-4 w-4 text-coral" /> Cancel Load
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Escrow Payment Status Card */}
        <div className="space-y-5 lg:col-span-4">
          <div className="rounded-3xl border border-border bg-surface p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary-strong">
                <Lock className="h-3.5 w-3.5" /> UPI Transit Escrow
              </span>
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase ${
                  activeLoad.paymentStatus === 'escrow_held'
                    ? 'bg-primary-100 text-primary-strong'
                    : activeLoad.paymentStatus === 'released'
                      ? 'bg-sky-100 text-ink'
                      : activeLoad.paymentStatus === 'refunded'
                        ? 'bg-coral-100 text-ink'
                        : 'bg-accent-100 text-ink'
                }`}
              >
                {activeLoad.paymentStatus.replace('_', ' ')}
              </span>
            </div>

            <div className="mt-4">
              <span className="text-xs text-ink-muted">Audited Shapley Fare</span>
              <div className="font-heading text-3xl font-extrabold text-ink">
                <AnimatedNumber value={activeLoad.quotedPriceInr} prefix="₹" />
              </div>
              <p className="mt-0.5 text-xs text-primary-strong font-semibold">
                You saved ₹{Math.max(60, activeLoad.soloPriceInr - activeLoad.quotedPriceInr)} vs. solo booking
              </p>
            </div>

            <div className="mt-4 space-y-2.5">
              {activeLoad.paymentStatus === 'unpaid' ? (
                <button
                  type="button"
                  onClick={() => {
                    setUpiStep('app');
                    setUpiModalOpen(true);
                  }}
                  className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-extrabold text-white shadow-soft hover:bg-primary-strong"
                >
                  <QrCode className="h-4 w-4" /> Pay ₹{activeLoad.quotedPriceInr} into UPI Escrow
                </button>
              ) : (
                <div className="rounded-2xl bg-primary-100/70 p-3.5 text-xs text-ink">
                  <div className="flex items-center gap-1.5 font-bold text-primary-strong">
                    <ShieldCheck className="h-4 w-4" /> Protected in Escrow Vault
                  </div>
                  <p className="mt-1 text-ink-muted">
                    Funds release to {activePool.transporterName} only after delivery weight confirmation.
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={() => downloadPoolReceiptPdf(activePool, myShare)}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-xs font-bold text-ink hover:border-primary"
              >
                <Download className="h-4 w-4 text-primary-strong" /> Download PDF Receipt
              </button>
            </div>
          </div>

          {/* Post-Delivery Weight Confirm, Rating & 1-Tap Rebook */}
          <div className="rounded-3xl border border-accent/60 bg-gradient-to-b from-accent-100/45 to-surface p-5 shadow-soft">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
              After Mandi Delivery
            </span>
            <h2 className="mt-1 text-base font-extrabold text-ink">
              Confirm Weighbridge Weight & Release Escrow
            </h2>
            <p className="mt-1 text-xs text-ink-muted">
              {deliveredLoad
                ? `Pool HH-KLR-2399 (${CARGO_CATALOG[deliveredLoad.crop].labelEn}, ${deliveredLoad.weightQuintals} qtl) arrived at Kolar APMC.`
                : `Confirm weight once ${activePool.vehiclePlate} unloads at mandi gate.`}
            </p>

            <div className="mt-3 space-y-3">
              <div>
                <label htmlFor="confirm-wt" className="text-[11px] font-bold uppercase text-ink-muted">
                  Verified Mandi Weight (Quintals)
                </label>
                <input
                  id="confirm-wt"
                  type="number"
                  step="0.1"
                  value={confirmedWeight}
                  onChange={(e) => setConfirmedWeight(Number(e.target.value))}
                  className="mt-1 min-h-[42px] w-full rounded-xl border border-border bg-surface px-3 text-sm font-bold text-ink"
                />
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase text-ink-muted">Rate Driver Care</span>
                <div className="mt-1 flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      aria-label={`Rate ${s} stars`}
                      onClick={() => setRating(s)}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface"
                    >
                      <Star
                        className={`h-5 w-5 ${
                          s <= rating ? 'fill-accent text-accent' : 'text-ink-muted/40'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() =>
                    confirmDeliveryAndRate(
                      deliveredLoad?.id ?? activeLoad.id,
                      confirmedWeight,
                      rating,
                    )
                  }
                  className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-extrabold text-white hover:bg-primary-strong"
                >
                  <CheckCircle2 className="h-4 w-4" /> Confirm & Release
                </button>
                <button
                  type="button"
                  onClick={handleRebookOneTap}
                  className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-primary bg-surface px-3 py-2 text-xs font-extrabold text-primary-strong hover:bg-primary-100"
                >
                  <MapPin className="h-4 w-4" /> Rebook in 1 Tap
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* UPI Payment Modal Sheet */}
      {upiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-3xl border border-border bg-surface p-6 shadow-elevated"
          >
            {upiStep === 'app' && (
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-extrabold text-ink">Pay into Transit Escrow</h3>
                  <span className="font-heading text-xl font-extrabold text-primary-strong">
                    ₹{activeLoad.quotedPriceInr}
                  </span>
                </div>
                <p className="mt-1 text-xs text-ink-muted">
                  Scan dynamic escrow QR or select your preferred UPI app:
                </p>

                {/* Crisp SVG UPI QR Box */}
                <div className="my-4 flex flex-col items-center rounded-2xl bg-surface-2 p-4">
                  <svg width="116" height="116" viewBox="0 0 116 116" className="rounded-xl bg-white p-2 shadow-soft">
                    <rect x="8" y="8" width="28" height="28" fill="none" stroke="#1E2B25" strokeWidth="5" />
                    <rect x="16" y="16" width="12" height="12" fill="#3FA374" />
                    <rect x="80" y="8" width="28" height="28" fill="none" stroke="#1E2B25" strokeWidth="5" />
                    <rect x="88" y="16" width="12" height="12" fill="#3FA374" />
                    <rect x="8" y="80" width="28" height="28" fill="none" stroke="#1E2B25" strokeWidth="5" />
                    <rect x="16" y="88" width="12" height="12" fill="#3FA374" />
                    <rect x="46" y="14" width="10" height="10" fill="#1E2B25" />
                    <rect x="62" y="24" width="10" height="10" fill="#1E2B25" />
                    <rect x="44" y="44" width="26" height="26" rx="4" fill="#F6B93B" />
                    <rect x="52" y="52" width="10" height="10" fill="#1E2B25" />
                    <rect x="82" y="52" width="22" height="10" fill="#1E2B25" />
                    <rect x="48" y="82" width="14" height="22" fill="#1E2B25" />
                    <rect x="74" y="78" width="26" height="26" fill="#2A7F58" />
                  </svg>
                  <span className="mt-2 text-[11px] font-semibold text-ink-muted">
                    harvesthaul.escrow@cnrb
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {['BHIM UPI', 'PhonePe', 'Google Pay', 'Paytm UPI'].map((app) => (
                    <button
                      key={app}
                      type="button"
                      onClick={() => setUpiApp(app)}
                      className={`min-h-[44px] rounded-xl border px-3 py-2 text-xs font-bold ${
                        upiApp === app
                          ? 'border-primary bg-primary-100 text-primary-strong'
                          : 'border-border bg-surface text-ink'
                      }`}
                    >
                      {app}
                    </button>
                  ))}
                </div>

                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setUpiModalOpen(false)}
                    className="min-h-[44px] rounded-xl border border-border px-4 text-xs font-bold text-ink-muted"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => setUpiStep('pin')}
                    className="min-h-[44px] flex-1 rounded-xl bg-primary text-xs font-extrabold text-white hover:bg-primary-strong"
                  >
                    Continue with {upiApp}
                  </button>
                </div>
              </div>
            )}

            {upiStep === 'pin' && (
              <div>
                <h3 className="text-lg font-extrabold text-ink">Enter 4-Digit UPI PIN</h3>
                <p className="mt-1 text-xs text-ink-muted">
                  Authorising ₹{activeLoad.quotedPriceInr} to HarvestHaul Delivery Escrow ({activePool.code})
                </p>
                <input
                  type="password"
                  maxLength={6}
                  value={upiPin}
                  onChange={(e) => setUpiPin(e.target.value.replace(/\D/g, ''))}
                  aria-label="UPI PIN"
                  className="mt-4 min-h-[50px] w-full rounded-xl border border-border bg-surface-2 text-center font-heading text-2xl font-extrabold tracking-[0.5em] text-ink"
                />
                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setUpiStep('app')}
                    className="min-h-[44px] rounded-xl border border-border px-4 text-xs font-bold text-ink-muted"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={paying || upiPin.length < 4}
                    onClick={handleCompleteUpi}
                    className="min-h-[44px] flex-1 rounded-xl bg-primary text-xs font-extrabold text-white hover:bg-primary-strong"
                  >
                    {paying ? 'Locking in Escrow...' : `Authorize ₹${activeLoad.quotedPriceInr}`}
                  </button>
                </div>
              </div>
            )}

            {upiStep === 'done' && (
              <div className="text-center py-3">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-100 text-primary-strong">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h3 className="mt-3 text-lg font-extrabold text-ink">Held Safely in Escrow</h3>
                <p className="mt-1 text-xs text-ink-muted">
                  ₹{activeLoad.quotedPriceInr} is locked in escrow for Pool {activePool.code} and releases automatically once your crates are weighed at destination.
                </p>
                <button
                  type="button"
                  onClick={() => setUpiModalOpen(false)}
                  className="mt-5 min-h-[44px] w-full rounded-xl bg-ink text-xs font-extrabold text-white"
                >
                  Return to Live Tracker
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Call Driver Sheet */}
      {callOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-surface p-6 text-center shadow-elevated">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-primary-strong animate-pulse">
              <PhoneCall className="h-7 w-7" />
            </div>
            <h3 className="mt-3 text-lg font-extrabold text-ink">{activePool.transporterName}</h3>
            <p className="text-xs font-semibold text-ink-muted">
              {activePool.vehiclePlate} • {activePool.transporterPhone}
            </p>
            <p className="mt-2 rounded-xl bg-surface-2 px-3 py-2 text-xs text-ink">
              Connected via privacy bridge • Pool {activePool.code}
            </p>
            <button
              type="button"
              onClick={() => setCallOpen(false)}
              className="mt-5 inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl bg-coral px-5 text-xs font-extrabold text-white"
            >
              <PhoneOff className="h-4 w-4" /> End Call
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
