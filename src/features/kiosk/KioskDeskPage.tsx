import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Camera,
  CheckCircle2,
  CloudOff,
  Printer,
  RefreshCw,
  Store,
  Wifi,
} from 'lucide-react';
import { VoiceWaveformWidget } from '@/components/ui/VoiceWaveformModal';
import { CARGO_CATALOG } from '@/engine/compatibility';
import { parseVoiceBookingInput } from '@/engine/voiceParser';
import { useAppStore } from '@/stores/useAppStore';
import type { CropOrCargo } from '@/types/domain';

export function KioskDeskPage() {
  const nodes = useAppStore((s) => s.nodes);
  const kiosks = useAppStore((s) => s.kiosks);
  const language = useAppStore((s) => s.language);
  const voicePhrases = useAppStore((s) => s.voicePhrases);
  const kioskOfflineMode = useAppStore((s) => s.kioskOfflineMode);
  const kioskOfflineQueue = useAppStore((s) => s.kioskOfflineQueue);
  const setKioskOfflineMode = useAppStore((s) => s.setKioskOfflineMode);
  const submitKioskWalkInBooking = useAppStore((s) => s.submitKioskWalkInBooking);

  const activeKiosk = kiosks[0];
  const [farmerName, setFarmerName] = useState('Baldevappa Naik');
  const [farmerPhone, setFarmerPhone] = useState('+91 90001 10322');
  const [villageId, setVillageId] = useState('v_vemgal');
  const [crop, setCrop] = useState<CropOrCargo>('tomato');
  const [weightQuintals, setWeightQuintals] = useState(14);
  const [dropNodeId, setDropNodeId] = useState('m_kolar_apmc');
  const [freshnessScore, setFreshnessScore] = useState(88);
  const [voiceNote, setVoiceNote] = useState('14 quintal tomato tomorrow morning Kolar APMC');
  const [syncing, setSyncing] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<{
    farmerName: string;
    crop: CropOrCargo;
    weightQuintals: number;
    villageName: string;
    dropName: string;
    queuedOffline: boolean;
    receiptNo: string;
  } | null>(null);

  const handleVoiceChange = (text: string) => {
    setVoiceNote(text);
    const p = parseVoiceBookingInput(text, nodes, villageId, dropNodeId);
    setCrop(p.crop);
    setWeightQuintals(p.weightQuintals);
    setDropNodeId(p.dropNodeId);
  };

  const handleToggleConnection = async () => {
    setSyncing(true);
    await setKioskOfflineMode(!kioskOfflineMode);
    setSyncing(false);
  };

  const handleBookWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await submitKioskWalkInBooking({
      farmerName,
      farmerPhone,
      villageId,
      crop,
      weightQuintals,
      dropNodeId,
      freshnessScore,
    });
    setLastReceipt({
      farmerName,
      crop,
      weightQuintals,
      villageName: nodes.find((n) => n.id === villageId)?.name ?? 'Vemgal',
      dropName: nodes.find((n) => n.id === dropNodeId)?.name ?? 'Kolar APMC',
      queuedOffline: res.queuedOffline,
      receiptNo: `SAKHI-${Date.now().toString().slice(-5)}`,
    });
  };

  const unsyncedCount = kioskOfflineQueue.filter((q) => !q.synced).length;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      {/* Large-Text Kiosk Connectivity Banner */}
      <div
        className={`flex flex-wrap items-center justify-between gap-4 rounded-3xl border-2 p-5 shadow-soft ${
          kioskOfflineMode
            ? 'border-coral bg-coral-100/75'
            : 'border-primary bg-primary-100/60'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface shadow-xs">
            {kioskOfflineMode ? (
              <CloudOff className="h-6 w-6 text-coral" />
            ) : (
              <Wifi className="h-6 w-6 text-primary-strong" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-ink" />
              <span className="text-xs font-extrabold uppercase tracking-wider text-ink">
                {activeKiosk.name} • {activeKiosk.kioskCode} • {activeKiosk.farmersServed} Farmers Served
              </span>
            </div>
            <h1 className="text-xl font-extrabold text-ink sm:text-2xl">
              {kioskOfflineMode
                ? `Connection Lost — Store-and-Forward Active (${unsyncedCount} Queued Locally)`
                : 'Village Terminal Online — Instant Pool Matching'}
            </h1>
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggleConnection}
          className={`inline-flex min-h-[50px] items-center gap-2 rounded-2xl px-5 py-3 text-sm font-extrabold text-white shadow-soft ${
            kioskOfflineMode ? 'bg-primary hover:bg-primary-strong' : 'bg-ink hover:bg-ink/90'
          }`}
        >
          <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
          <span>
            {kioskOfflineMode
              ? `Reconnect & Sync (${unsyncedCount})`
              : 'Simulate Village Signal Drop'}
          </span>
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Large-Target Walk-in Farmer Form */}
        <form
          onSubmit={handleBookWalkIn}
          className="space-y-5 rounded-3xl border border-border bg-surface p-6 shadow-soft lg:col-span-7"
        >
          <h2 className="text-xl font-extrabold text-ink">Walk-In Farmer Desk Booking</h2>

          <VoiceWaveformWidget
            language={language}
            phrases={voicePhrases.filter((p) => p.role === 'farmer')}
            value={voiceNote}
            onChange={handleVoiceChange}
            label="Speak farmer’s harvest lot into kiosk microphone"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="kiosk-fname" className="text-xs font-bold uppercase text-ink-muted">
                Walk-In Farmer Name
              </label>
              <input
                id="kiosk-fname"
                type="text"
                value={farmerName}
                onChange={(e) => setFarmerName(e.target.value)}
                className="mt-1 min-h-[50px] w-full rounded-xl border border-border bg-surface-2 px-4 text-base font-bold text-ink"
              />
            </div>
            <div>
              <label htmlFor="kiosk-phone" className="text-xs font-bold uppercase text-ink-muted">
                Mobile / Family Contact
              </label>
              <input
                id="kiosk-phone"
                type="tel"
                value={farmerPhone}
                onChange={(e) => setFarmerPhone(e.target.value)}
                className="mt-1 min-h-[50px] w-full rounded-xl border border-border bg-surface-2 px-4 text-base font-bold text-ink"
              />
            </div>
            <div>
              <label htmlFor="kiosk-crop" className="text-xs font-bold uppercase text-ink-muted">
                Produce
              </label>
              <select
                id="kiosk-crop"
                value={crop}
                onChange={(e) => setCrop(e.target.value as CropOrCargo)}
                className="mt-1 min-h-[50px] w-full rounded-xl border border-border bg-surface-2 px-3 text-base font-bold text-ink"
              >
                {(['tomato', 'potato', 'beans', 'carrot', 'cabbage', 'capsicum', 'ragi', 'mango', 'flowers'] as CropOrCargo[]).map(
                  (c) => (
                    <option key={c} value={c}>
                      {CARGO_CATALOG[c].labelEn} ({CARGO_CATALOG[c].labelKn})
                    </option>
                  ),
                )}
              </select>
            </div>
            <div>
              <label htmlFor="kiosk-wt" className="text-xs font-bold uppercase text-ink-muted">
                Quantity (Quintals)
              </label>
              <input
                id="kiosk-wt"
                type="number"
                min={1}
                max={80}
                value={weightQuintals}
                onChange={(e) => setWeightQuintals(Number(e.target.value))}
                className="mt-1 min-h-[50px] w-full rounded-xl border border-border bg-surface-2 px-4 text-base font-bold text-ink"
              />
            </div>
            <div>
              <label htmlFor="kiosk-v" className="text-xs font-bold uppercase text-ink-muted">
                Pickup Village
              </label>
              <select
                id="kiosk-v"
                value={villageId}
                onChange={(e) => setVillageId(e.target.value)}
                className="mt-1 min-h-[50px] w-full rounded-xl border border-border bg-surface-2 px-3 text-base font-bold text-ink"
              >
                {nodes.filter((n) => n.kind === 'village').map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-ink-muted">
                Desk Crate Freshness Capture
              </label>
              <label className="mt-1 flex min-h-[50px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-primary bg-primary-100 px-3 text-sm font-extrabold text-primary-strong">
                <Camera className="h-4 w-4" />
                <span>Crate Score: {freshnessScore}%</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={() => setFreshnessScore(92)}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="inline-flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-base font-extrabold text-white shadow-soft hover:bg-primary-strong"
          >
            <CheckCircle2 className="h-5 w-5" />
            <span>
              {kioskOfflineMode
                ? 'Save Booking to Offline Queue & Issue Slip'
                : 'Book Shared Pool & Print Slip'}
            </span>
          </button>
        </form>

        {/* Store-and-Forward Queue + Print-Style Slip Receipt */}
        <div className="space-y-5 lg:col-span-5">
          <div className="rounded-3xl border border-border bg-surface p-5 shadow-soft">
            <h2 className="text-base font-extrabold text-ink">
              Store-and-Forward Queue ({kioskOfflineQueue.length} Total)
            </h2>
            <p className="mt-0.5 text-xs text-ink-muted">
              Queued walk-in slips persist in browser storage and sync automatically when reconnected.
            </p>

            <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
              {kioskOfflineQueue.length === 0 ? (
                <div className="rounded-2xl bg-surface-2 p-4 text-xs text-ink-muted">
                  No offline items waiting. Toggle “Simulate Village Signal Drop” above and submit 3 bookings to test offline store-and-forward!
                </div>
              ) : (
                kioskOfflineQueue.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    className="flex items-center justify-between rounded-2xl border border-border bg-bg p-3 text-xs"
                  >
                    <div>
                      <div className="font-extrabold text-ink">
                        {item.farmerName} • {item.weightQuintals} qtl {CARGO_CATALOG[item.crop].labelEn}
                      </div>
                      <div className="text-[11px] text-ink-muted">
                        {new Date(item.queuedAt).toLocaleTimeString()}
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase ${
                        item.synced
                          ? 'bg-primary-100 text-primary-strong'
                          : 'bg-accent-100 text-ink'
                      }`}
                    >
                      {item.synced ? 'Synced to Pool' : 'Queued Offline'}
                    </span>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          {/* Print-Style Thermal Receipt */}
          {lastReceipt && (
            <div className="rounded-2xl border-2 border-dashed border-ink/40 bg-[#FFFDF8] p-5 font-mono text-xs text-ink shadow-soft">
              <div className="flex items-center justify-between border-b border-dashed border-ink/30 pb-2">
                <span className="font-bold">GRAM KENDRA SLIP #{lastReceipt.receiptNo}</span>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1 rounded-lg bg-ink px-2.5 py-1 font-sans text-[11px] font-bold text-white"
                >
                  <Printer className="h-3 w-3" /> Print
                </button>
              </div>
              <div className="mt-3 space-y-1">
                <div>FARMER: {lastReceipt.farmerName}</div>
                <div>LOT: {lastReceipt.weightQuintals} QTL {CARGO_CATALOG[lastReceipt.crop].labelEn.toUpperCase()}</div>
                <div>ROUTE: {lastReceipt.villageName} -&gt; {lastReceipt.dropName}</div>
                <div>
                  STATUS: {lastReceipt.queuedOffline ? 'STORED OFFLINE (AUTO-SYNC)' : 'CONFIRMED IN LIVE POOL'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
