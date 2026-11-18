import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  MessageSquare,
  PhoneIncoming,
  Sparkles,
  Truck,
} from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import type { VehicleType } from '@/types/domain';

export function TransporterOnboardingPage() {
  const nodes = useAppStore((s) => s.nodes);
  const completeTransporterOnboarding = useAppStore((s) => s.completeTransporterOnboarding);

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [ringing, setRinging] = useState(false);
  const [phone, setPhone] = useState('+91 90001 77420');
  const [villageId, setVillageId] = useState('v_srinivaspur');
  const [scanning, setScanning] = useState(false);
  const [ownerName, setOwnerName] = useState('Raghavendra Gowda');
  const [plate, setPlate] = useState('KA 07 AQ 3319');
  const [vehicleType, setVehicleType] = useState<VehicleType>('bolero_pickup');
  const [capacityQuintals, setCapacityQuintals] = useState(20);
  const [rcValidUntil, setRcValidUntil] = useState('2031-08-31');

  const villages = nodes.filter((n) => n.kind === 'village');

  const triggerMissedCall = () => {
    setRinging(true);
    setTimeout(() => {
      setRinging(false);
      setStep(2);
    }, 1100);
  };

  const triggerRcScan = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
    }, 1050);
  };

  const handleFinish = async (e: React.FormEvent) => {
    e.preventDefault();
    await completeTransporterOnboarding({
      ownerName,
      phone,
      villageId,
      plate,
      vehicleType,
      capacityQuintals,
      rcValidUntil,
    });
    setStep(4);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      {/* Step Progress */}
      <div className="grid grid-cols-4 gap-2">
        {['1. Missed Call', '2. Chat Corridor', '3. Plate & RC Scan', '4. Ready in 60s'].map(
          (lbl, idx) => (
            <div
              key={lbl}
              className={`rounded-xl px-3 py-2 text-center text-xs font-bold ${
                step >= idx + 1 ? 'bg-primary text-white' : 'bg-surface-2 text-ink-muted'
              }`}
            >
              {lbl}
            </div>
          ),
        )}
      </div>

      {step === 1 && (
        <div className="rounded-3xl border border-border bg-surface p-6 text-center shadow-soft sm:p-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-primary-strong">
            <PhoneIncoming className={`h-8 w-8 ${ringing ? 'animate-bounce' : ''}`} />
          </div>
          <h1 className="mt-4 text-2xl font-extrabold text-ink">
            Zero-Typing Missed Call Verification
          </h1>
          <p className="mx-auto mt-1 max-w-md text-xs text-ink-muted">
            Give a free missed call from your driver phone — no OTP typing or app store password required.
          </p>

          <div className="mx-auto mt-5 max-w-xs">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              aria-label="Driver mobile number"
              className="min-h-[46px] w-full rounded-xl border border-border bg-surface-2 px-4 text-center text-sm font-bold text-ink"
            />
          </div>

          <button
            type="button"
            onClick={triggerMissedCall}
            className="mt-5 inline-flex min-h-[50px] items-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-extrabold text-white shadow-soft hover:bg-primary-strong"
          >
            <PhoneIncoming className="h-4 w-4" />
            <span>{ringing ? 'Matching Caller ID...' : 'Place Free Missed Call'}</span>
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="rounded-3xl border border-border bg-surface p-6 shadow-soft sm:p-8">
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-primary-strong">
            <MessageSquare className="h-4 w-4" /> Chat-Style Corridor Setup
          </div>
          <div className="mt-4 space-y-3 rounded-2xl bg-[#EEF5F0] p-4 text-xs">
            <div className="max-w-sm rounded-2xl bg-surface p-3 shadow-xs">
              <strong>HarvestHaul Desk:</strong> Namaskara! Your number <strong>{phone}</strong> is matched. Which village do you park your vehicle at every night?
            </div>
            <div className="ml-auto max-w-xs rounded-2xl bg-primary p-3 text-white">
              <label htmlFor="onb-home-v" className="block text-[10px] uppercase opacity-85">
                Tap Home Village
              </label>
              <select
                id="onb-home-v"
                value={villageId}
                onChange={(e) => setVillageId(e.target.value)}
                className="mt-1 w-full rounded-lg bg-white px-2.5 py-1.5 text-xs font-bold text-ink"
              >
                {villages.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.taluka})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setStep(3)}
            className="mt-5 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-extrabold text-white hover:bg-primary-strong"
          >
            <span>Next: Scan Number Plate & RC Card</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {step === 3 && (
        <form onSubmit={handleFinish} className="rounded-3xl border border-border bg-surface p-6 shadow-soft sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-extrabold text-ink">Plate & RC Optical Scan</h2>
              <p className="text-xs text-ink-muted">
                Upload RC photo or run optical scan; all extracted fields remain editable.
              </p>
            </div>
            <label className="inline-flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-xl bg-primary-100 px-3.5 py-2 text-xs font-bold text-primary-strong">
              <Camera className="h-4 w-4" />
              <span>Scan RC / Plate Photo</span>
              <input
                type="file"
                accept="image/*"
                onChange={triggerRcScan}
                className="hidden"
              />
            </label>
          </div>

          {/* Animated RC Scan Box */}
          <div
            onClick={triggerRcScan}
            className="relative mt-4 cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed border-primary/50 bg-surface-2 p-5 text-center"
          >
            {scanning && (
              <motion.div
                initial={{ top: '0%' }}
                animate={{ top: ['5%', '90%', '5%'] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="absolute left-0 right-0 h-1 bg-primary shadow-md"
              />
            )}
            <div className="inline-block rounded-lg border-2 border-ink bg-accent-100 px-4 py-1.5 font-heading text-lg font-extrabold tracking-wider text-ink">
              {plate}
            </div>
            <p className="mt-1.5 text-[11px] font-semibold text-primary-strong">
              <Sparkles className="mr-1 inline h-3.5 w-3.5" />
              {scanning ? 'Extracting Karnataka RTO fields...' : 'Tap card to re-run optical scan'}
            </p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="rc-owner" className="text-[11px] font-bold uppercase text-ink-muted">
                Registered Owner Name
              </label>
              <input
                id="rc-owner"
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="mt-1 min-h-[44px] w-full rounded-xl border border-border bg-surface-2 px-3 text-xs font-bold text-ink"
              />
            </div>
            <div>
              <label htmlFor="rc-plate" className="text-[11px] font-bold uppercase text-ink-muted">
                Number Plate
              </label>
              <input
                id="rc-plate"
                type="text"
                value={plate}
                onChange={(e) => setPlate(e.target.value.toUpperCase())}
                className="mt-1 min-h-[44px] w-full rounded-xl border border-border bg-surface-2 px-3 text-xs font-bold text-ink"
              />
            </div>
            <div>
              <label htmlFor="rc-type" className="text-[11px] font-bold uppercase text-ink-muted">
                Vehicle Type
              </label>
              <select
                id="rc-type"
                value={vehicleType}
                onChange={(e) => {
                  const t = e.target.value as VehicleType;
                  setVehicleType(t);
                  setCapacityQuintals(
                    t === 'eicher_14ft' ? 45 : t === 'tractor_trolley' ? 32 : t === 'bolero_pickup' ? 20 : 12,
                  );
                }}
                className="mt-1 min-h-[44px] w-full rounded-xl border border-border bg-surface-2 px-3 text-xs font-bold text-ink"
              >
                <option value="tata_ace">Tata Ace Gold (12 qtl)</option>
                <option value="bolero_pickup">Mahindra Bolero Pickup (20 qtl)</option>
                <option value="tractor_trolley">Tractor + Trolley (32 qtl)</option>
                <option value="eicher_14ft">Eicher Pro 14 ft (45 qtl)</option>
              </select>
            </div>
            <div>
              <label htmlFor="rc-valid" className="text-[11px] font-bold uppercase text-ink-muted">
                RC Fitness Valid Until
              </label>
              <input
                id="rc-valid"
                type="date"
                value={rcValidUntil}
                onChange={(e) => setRcValidUntil(e.target.value)}
                className="mt-1 min-h-[44px] w-full rounded-xl border border-border bg-surface-2 px-3 text-xs font-bold text-ink"
              />
            </div>
          </div>

          <button
            type="submit"
            className="mt-5 inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-extrabold text-white shadow-soft hover:bg-primary-strong"
          >
            <CheckCircle2 className="h-4 w-4" /> Complete 1-Minute Onboarding
          </button>
        </form>
      )}

      {step === 4 && (
        <div className="rounded-3xl border border-primary bg-surface p-8 text-center shadow-elevated">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-primary-strong">
            <Truck className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-2xl font-extrabold text-ink">
            You Are Live on {plate}!
          </h2>
          <p className="mx-auto mt-1.5 max-w-md text-xs text-ink-muted">
            {ownerName}, your vehicle is active with zero rejection fees, ₹350 standby eligibility, and return-leg matching towards your home village.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              to="/transporter/shadow"
              className="inline-flex min-h-[46px] items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-xs font-extrabold text-white hover:bg-primary-strong"
            >
              <span>See Last Month’s Shadow Earnings Replay</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/transporter/offers"
              className="inline-flex min-h-[46px] items-center gap-2 rounded-2xl border border-border bg-surface-2 px-5 py-2.5 text-xs font-extrabold text-ink"
            >
              Browse Live Load Offers
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
