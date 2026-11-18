import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  Clock,
  Percent,
  Sparkles,
  Sprout,
  ThermometerSun,
} from 'lucide-react';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { SpoilageRing } from '@/components/ui/SpoilageRing';
import { VoiceWaveformWidget } from '@/components/ui/VoiceWaveformModal';
import { CARGO_CATALOG } from '@/engine/compatibility';
import { roadDistanceKm } from '@/engine/geo';
import {
  adjustedShelfLifeHours,
  analyseProduceFreshnessFromStats,
  evaluateWaitOrGo,
} from '@/engine/spoilage';
import { parseVoiceBookingInput } from '@/engine/voiceParser';
import { useAppStore } from '@/stores/useAppStore';
import type { CropOrCargo } from '@/types/domain';

export function FarmerBookingPage() {
  const navigate = useNavigate();
  const language = useAppStore((s) => s.language);
  const nodes = useAppStore((s) => s.nodes);
  const voicePhrases = useAppStore((s) => s.voicePhrases);
  const accounts = useAppStore((s) => s.accounts);
  const currentAccountId = useAppStore((s) => s.currentAccountId);
  const farmers = useAppStore((s) => s.farmers);
  const createLoadAndPool = useAppStore((s) => s.createLoadAndPool);

  const activeFarmer =
    farmers.find((f) => f.accountId === currentAccountId) ?? farmers[0];
  const activeAccount =
    accounts.find((a) => a.id === currentAccountId) ?? accounts[0];

  const [transcript, setTranscript] = useState(
    '20 quintal tomato, tomorrow morning, Kolar APMC from Vemgal',
  );
  const parsed = useMemo(
    () => parseVoiceBookingInput(transcript, nodes, activeFarmer.villageId, 'm_kolar_apmc'),
    [transcript, nodes, activeFarmer.villageId],
  );

  // Editable overrides synced when transcript changes
  const [cropOverride, setCropOverride] = useState<CropOrCargo | null>(null);
  const [weightOverride, setWeightOverride] = useState<number | null>(null);
  const [pickupOverride, setPickupOverride] = useState<string | null>(null);
  const [dropOverride, setDropOverride] = useState<string | null>(null);

  const crop = cropOverride ?? parsed.crop;
  const weightQuintals = weightOverride ?? parsed.weightQuintals;
  const pickupNodeId = pickupOverride ?? parsed.pickupNodeId;
  const dropNodeId = dropOverride ?? parsed.dropNodeId;

  // Freshness photo state
  const [freshnessScore, setFreshnessScore] = useState(89);
  const [colourNote, setColourNote] = useState(
    'Firm skin sheen and vibrant red-orange tone; safe for a 2 to 3 hour pooling window.',
  );
  const [photoLabel, setPhotoLabel] = useState('Morning crate inspection (Vemgal field lot)');
  const [ambientTempC, setAmbientTempC] = useState(28);

  // Flex-for-discount sliders
  const [maxWaitHours, setMaxWaitHours] = useState(2);
  const [minDiscountPct, setMinDiscountPct] = useState(16);
  const [submitting, setSubmitting] = useState(false);

  const handleTranscriptUpdate = (next: string) => {
    setTranscript(next);
    setCropOverride(null);
    setWeightOverride(null);
    setPickupOverride(null);
    setDropOverride(null);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoLabel(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, 32, 32);
        const data = ctx.getImageData(0, 0, 32, 32).data;
        let rSum = 0;
        let gSum = 0;
        let bSum = 0;
        let hash = file.size;
        const count = data.length / 4;
        for (let i = 0; i < data.length; i += 4) {
          rSum += data[i];
          gSum += data[i + 1];
          bSum += data[i + 2];
          hash = (hash * 31 + data[i]) >>> 0;
        }
        const avgR = rSum / count;
        const avgG = gSum / count;
        const avgB = bSum / count;
        const brightness = (avgR + avgG + avgB) / 3;
        const res = analyseProduceFreshnessFromStats({
          avgR,
          avgG,
          avgB,
          brightness,
          fileHashSeed: hash,
          crop,
        });
        setFreshnessScore(res.freshnessScore);
        setColourNote(res.colourNote);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const applyHarvestCratePreset = (preset: 'crisp_dawn' | 'mid_ripe' | 'late_sun') => {
    if (preset === 'crisp_dawn') {
      const res = analyseProduceFreshnessFromStats({ avgR: 215, avgG: 98, avgB: 54, brightness: 135, fileHashSeed: 18, crop });
      setFreshnessScore(93);
      setColourNote(res.colourNote);
      setPhotoLabel('Dawn Breaker-Stage Crate Scan');
    } else if (preset === 'mid_ripe') {
      const res = analyseProduceFreshnessFromStats({ avgR: 224, avgG: 72, avgB: 62, brightness: 128, fileHashSeed: 12, crop });
      setFreshnessScore(76);
      setColourNote(res.colourNote);
      setPhotoLabel('Full-Red Mandi Ready Crate Scan');
    } else {
      const res = analyseProduceFreshnessFromStats({ avgR: 168, avgG: 64, avgB: 58, brightness: 52, fileHashSeed: 7, crop });
      setFreshnessScore(57);
      setColourNote(res.colourNote);
      setPhotoLabel('Afternoon Warm Harvest Crate Scan');
    }
  };

  const villages = nodes.filter((n) => n.kind === 'village' || n.kind === 'input_dealer');
  const destinations = nodes.filter((n) => n.kind === 'mandi' || n.kind === 'cold_chain' || n.kind === 'factory');

  const pNode = nodes.find((n) => n.id === pickupNodeId) ?? villages[0];
  const dNode = nodes.find((n) => n.id === dropNodeId) ?? destinations[0];
  const directDistKm = roadDistanceKm(pNode, dNode, 1.32);
  const soloPriceInr = Math.round(310 + directDistKm * 22 * (1 + weightQuintals * 0.006));

  const remainingShelfHours = adjustedShelfLifeHours(crop, ambientTempC, freshnessScore);
  const waitAdvice = useMemo(
    () =>
      evaluateWaitOrGo({
        crop,
        weightQuintals,
        soloPriceInr,
        remainingShelfHours,
      }),
    [crop, weightQuintals, soloPriceInr, remainingShelfHours],
  );

  const flexPoolChancePct = useMemo(() => {
    const waitBoost = maxWaitHours * 19;
    const askDrag = Math.max(0, minDiscountPct - 12) * 1.6;
    return Math.max(24, Math.min(97, Math.round(44 + waitBoost - askDrag)));
  }, [maxWaitHours, minDiscountPct]);

  const flexEstimatedPriceInr = useMemo(() => {
    const discountRatio = Math.min(0.34, 0.12 + maxWaitHours * 0.038);
    return Math.round(soloPriceInr * (1 - discountRatio));
  }, [soloPriceInr, maxWaitHours]);

  const handleConfirmBooking = async () => {
    setSubmitting(true);
    await createLoadAndPool({
      shipperId: activeFarmer.id,
      shipperName: activeAccount.name,
      shipperPhone: activeAccount.phone,
      shipperRole: 'farmer',
      crop,
      weightQuintals,
      unitLabel: `${weightQuintals} quintal`,
      pickupNodeId,
      dropNodeId,
      maxWaitHours,
      minDiscountPct,
      freshnessScore,
    });
    setSubmitting(false);
    navigate('/farmer/pool');
  };

  const farmerPhrases = voicePhrases.filter((p) => p.role === 'farmer');

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-100 px-3 py-1 text-xs font-bold text-primary-strong">
            <Sprout className="h-3.5 w-3.5" /> Harvest-Ready Voice Ping
          </span>
          <h1 className="mt-2 text-2xl font-extrabold text-ink sm:text-3xl">
            Speak your harvest, check freshness, and pool with neighbours
          </h1>
        </div>
        <SpoilageRing
          crop={crop}
          readyAt={new Date().toISOString()}
          ambientTempC={ambientTempC}
          freshnessScore={freshnessScore}
        />
      </div>

      {/* Step 1: Multilingual Voice Input */}
      <VoiceWaveformWidget
        language={language}
        phrases={farmerPhrases}
        value={transcript}
        onChange={handleTranscriptUpdate}
      />

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Step 2: Parsed Editable Chips + Confidence Meter + Photo Freshness Check */}
        <div className="space-y-6 lg:col-span-7">
          <div className="rounded-3xl border border-border bg-surface p-5 shadow-soft sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-extrabold text-ink">
                1. Extracted Booking Details (Tap any field to adjust)
              </h2>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-100 px-3 py-1 text-xs font-bold text-primary-strong">
                <Sparkles className="h-3.5 w-3.5" /> Parser Confidence: {parsed.confidencePct}%
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="farmer-crop" className="text-[11px] font-bold uppercase text-ink-muted">
                  Crop / Produce
                </label>
                <select
                  id="farmer-crop"
                  value={crop}
                  onChange={(e) => setCropOverride(e.target.value as CropOrCargo)}
                  className="mt-1 min-h-[46px] w-full rounded-xl border border-border bg-surface-2 px-3 text-sm font-bold text-ink"
                >
                  {(['tomato', 'potato', 'beans', 'carrot', 'cabbage', 'capsicum', 'ragi', 'mango', 'flowers'] as CropOrCargo[]).map(
                    (c) => (
                      <option key={c} value={c}>
                        {CARGO_CATALOG[c].labelEn} ({CARGO_CATALOG[c].labelKn} / {CARGO_CATALOG[c].labelHi})
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div>
                <label htmlFor="farmer-weight" className="text-[11px] font-bold uppercase text-ink-muted">
                  Quantity (Quintals)
                </label>
                <input
                  id="farmer-weight"
                  type="number"
                  min={1}
                  max={90}
                  value={weightQuintals}
                  onChange={(e) => setWeightOverride(Math.max(1, Number(e.target.value)))}
                  className="mt-1 min-h-[46px] w-full rounded-xl border border-border bg-surface-2 px-3.5 text-sm font-bold text-ink"
                />
              </div>

              <div>
                <label htmlFor="farmer-pickup" className="text-[11px] font-bold uppercase text-ink-muted">
                  Pickup Village
                </label>
                <select
                  id="farmer-pickup"
                  value={pickupNodeId}
                  onChange={(e) => setPickupOverride(e.target.value)}
                  className="mt-1 min-h-[46px] w-full rounded-xl border border-border bg-surface-2 px-3 text-sm font-bold text-ink"
                >
                  {villages.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.taluka})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="farmer-drop" className="text-[11px] font-bold uppercase text-ink-muted">
                  Destination Mandi / Hub
                </label>
                <select
                  id="farmer-drop"
                  value={dropNodeId}
                  onChange={(e) => setDropOverride(e.target.value)}
                  className="mt-1 min-h-[46px] w-full rounded-xl border border-border bg-surface-2 px-3 text-sm font-bold text-ink"
                >
                  {destinations.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
              <span className="rounded-lg bg-surface-2 px-2.5 py-1 font-semibold text-ink">
                Ready window: {parsed.readyLabel}
              </span>
              <span className="rounded-lg bg-surface-2 px-2.5 py-1 font-semibold text-ink">
                Corridor distance: {directDistKm} km
              </span>
            </div>
          </div>

          {/* Freshness Photo Check */}
          <div className="rounded-3xl border border-border bg-surface p-5 shadow-soft sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-extrabold text-ink">
                  2. Produce Freshness Check & Field Temperature
                </h2>
                <p className="text-xs text-ink-muted">
                  Upload a crate photo or test harvest maturity stages to calibrate your spoilage clock.
                </p>
              </div>
              <label className="inline-flex min-h-[42px] cursor-pointer items-center gap-2 rounded-xl border border-primary bg-primary-100 px-3.5 py-2 text-xs font-bold text-primary-strong hover:bg-primary hover:text-white transition-colors">
                <Camera className="h-4 w-4" />
                <span>Upload / Capture Crate Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applyHarvestCratePreset('crisp_dawn')}
                className="min-h-[38px] rounded-xl border border-border bg-surface-2 px-3 py-1.5 text-xs font-semibold hover:border-primary"
              >
                Breaker-Stage Firm Crate (93%)
              </button>
              <button
                type="button"
                onClick={() => applyHarvestCratePreset('mid_ripe')}
                className="min-h-[38px] rounded-xl border border-border bg-surface-2 px-3 py-1.5 text-xs font-semibold hover:border-primary"
              >
                Full-Red Mandi Lot (76%)
              </button>
              <button
                type="button"
                onClick={() => applyHarvestCratePreset('late_sun')}
                className="min-h-[38px] rounded-xl border border-border bg-surface-2 px-3 py-1.5 text-xs font-semibold hover:border-coral"
              >
                Ripe Urgent Harvest (57%)
              </button>
            </div>

            <div className="mt-4 grid gap-4 rounded-2xl bg-surface-2 p-4 sm:grid-cols-12 sm:items-center">
              <div className="sm:col-span-8">
                <div className="text-xs font-bold text-ink">
                  {photoLabel} — Freshness Score: <span className="text-primary-strong">{freshnessScore}/100</span>
                </div>
                <p className="mt-1 text-xs text-ink-muted leading-relaxed">{colourNote}</p>
              </div>
              <div className="sm:col-span-4">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="inline-flex items-center gap-1">
                    <ThermometerSun className="h-3.5 w-3.5 text-accent" /> Field Temp
                  </span>
                  <span className="font-bold text-ink">{ambientTempC}°C</span>
                </div>
                <input
                  type="range"
                  min={18}
                  max={38}
                  value={ambientTempC}
                  onChange={(e) => setAmbientTempC(Number(e.target.value))}
                  aria-label="Ambient field temperature in Celsius"
                  className="mt-1.5 w-full accent-primary"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: Wait-or-Go Advisor + Flex-for-Discount + Book CTA */}
        <div className="space-y-6 lg:col-span-5">
          {/* Wait-or-Go Optimal Stopping Advisor */}
          <div className="rounded-3xl border border-border bg-surface p-5 shadow-soft sm:p-6">
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary-strong">
              Spoilage vs. Savings Advisor
            </span>
            <h2 className="mt-1 text-base font-extrabold text-ink">{waitAdvice.headline}</h2>

            <div className="mt-4 h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={waitAdvice.points} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E1EBE4" />
                  <XAxis
                    dataKey="waitHours"
                    tickFormatter={(v) => `${v}h`}
                    tick={{ fontSize: 11, fill: '#5C6F65' }}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#5C6F65' }} />
                  <Tooltip
                    formatter={(val: any, name: any) => [`₹${val}`, name]}
                    labelFormatter={(l) => `Wait ${l} hours`}
                  />
                  <Bar dataKey="expectedFreightSavingsInr" name="Pool Savings" fill="#3FA374" radius={[6, 6, 0, 0]} />
                  <Line
                    type="monotone"
                    dataKey="expectedSpoilageLossInr"
                    name="Spoilage Risk"
                    stroke="#EF8A6B"
                    strokeWidth={2.5}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Flex-for-Discount Sliders */}
          <div className="rounded-3xl border border-primary/30 bg-gradient-to-b from-surface to-primary-100/40 p-5 shadow-soft sm:p-6">
            <h2 className="text-base font-extrabold text-ink">3. Flex-for-Discount Window</h2>
            <div className="mt-4 space-y-4">
              <div>
                <div className="flex justify-between text-xs font-semibold">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-primary" /> I can wait up to
                  </span>
                  <span className="font-bold text-primary-strong">{maxWaitHours} hours</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={6}
                  value={maxWaitHours}
                  onChange={(e) => setMaxWaitHours(Number(e.target.value))}
                  aria-label="Maximum wait hours"
                  className="mt-1.5 w-full accent-primary"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold">
                  <span className="inline-flex items-center gap-1">
                    <Percent className="h-3.5 w-3.5 text-primary" /> Target discount ask
                  </span>
                  <span className="font-bold text-primary-strong">At least {minDiscountPct}% off</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={30}
                  value={minDiscountPct}
                  onChange={(e) => setMinDiscountPct(Number(e.target.value))}
                  aria-label="Minimum target discount percentage"
                  className="mt-1.5 w-full accent-primary"
                />
              </div>
            </div>

            <div className="mt-5 rounded-2xl bg-surface p-4 border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-ink-muted">Estimated Pooled Fare</span>
                  <div className="font-heading text-3xl font-extrabold text-primary-strong">
                    <AnimatedNumber value={flexEstimatedPriceInr} prefix="₹" />
                  </div>
                  <span className="text-[11px] text-ink-muted line-through">
                    Solo vehicle: ₹{soloPriceInr}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold text-ink-muted">Pool Match Chance</span>
                  <div className="font-heading text-2xl font-extrabold text-ink">
                    <AnimatedNumber value={flexPoolChancePct} suffix="%" />
                  </div>
                  <span className="text-[11px] font-semibold text-primary-strong">
                    2 neighbours nearby
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={submitting}
              onClick={handleConfirmBooking}
              className="mt-5 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3.5 text-sm font-extrabold text-white shadow-soft transition-all hover:bg-primary-strong active:scale-[0.99]"
            >
              <CheckCircle2 className="h-5 w-5" />
              <span>{submitting ? 'Matching Neighbour Pool...' : 'Confirm & Join Shared Pool'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
