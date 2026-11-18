import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Calculator,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Mic,
  RefreshCw,
  ShieldCheck,
  Sprout,
  Store,
  TrendingUp,
  Truck,
  Users,
} from 'lucide-react';
import { APP_NAME } from '@/app/constants';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { calculateTourCost, computePoolCostShares } from '@/engine/pricing';
import { useAppStore } from '@/stores/useAppStore';

const TESTIMONIALS = [
  {
    quote:
      'Earlier my 12 crates of tomato waited till noon or paid full Bolero fare. Now I speak one Kannada voice note at dawn, share the bed with two Vemgal neighbours, and see every rupee on my receipt.',
    author: 'Ramesh Gowda',
    role: 'Tomato & Beans Grower, Vemgal',
    stat: '27% lower freight per quintal',
  },
  {
    quote:
      'Driving home empty from Kolar APMC to Srinivaspur ate half my diesel margin. Attaching 15 quintals of NPK fertiliser on the return leg added ₹14,200 to my monthly net take-home.',
    author: 'Mohan Kumar',
    role: 'Owner-Driver (Bolero Pickup & Eicher), Srinivaspur',
    stat: '+₹14,200/month return-leg income',
  },
  {
    quote:
      'When a pickup had a clutch issue near Kaiwara, our 48-member FPO did not have to make a single frantic call. A standby Eicher took over in three seconds and crates reached Yeshwantpur before 7 AM.',
    author: 'Sunita Gowda',
    role: 'Coordinator, Vemgal Horti Growers FPO',
    stat: '3.2s automatic self-healing',
  },
  {
    quote:
      'Even when broadband drops in the afternoon rain, my Gram Kendra kiosk queues walk-in bookings locally and forwards them into live pools the moment signal returns.',
    author: 'Kavitha',
    role: 'Freight Sakhi Operator, Vemgal Kiosk',
    stat: '145+ walk-in farmers served',
  },
];

const FAQS = [
  {
    q: 'How is each farmer’s share of a pooled truck calculated?',
    a: 'We compute the total tour cost (fuel, driver time, highway toll, and fair operator margin), subtract the credit earned when the return leg carries agro-inputs back, and split the remaining fare using Shapley route-contribution shares — or the pool’s voted rule (weight, distance, or equal). Every rupee is auditable and explained aloud in Kannada, Hindi, or English.',
  },
  {
    q: 'Are transporters ever penalised for rejecting a load offer?',
    a: 'Never. Every tempo, pickup, Eicher, and tractor owner accepts, passes, or counters loads strictly by choice with zero rejection penalty. Reliability rewards and standby retainers are positive incentives.',
  },
  {
    q: 'What happens if a vehicle cancels or breaks down on the way to pickup?',
    a: 'Our minimal-change self-healing engine immediately dispatches the nearest opted-in standby vehicle to only the affected pool while leaving every other route untouched. Shippers keep their original fare and escrow protection without re-booking.',
  },
  {
    q: 'Can fertilizer and fresh vegetables ride on the same trip?',
    a: 'Never at the same time. Our compatibility matrix blocks chemical fertiliser or odorous feed from sharing a bed with fresh produce or flowers. Instead, fresh harvest rides outbound to the mandi in the morning, and packaged inputs ride back on the cleaned return leg.',
  },
  {
    q: 'How do farmers without smartphones book and pay?',
    a: 'Growers can book by voice in Kannada, Hindi, or English, through their FPO coordinator, or at a village Freight Sakhi kiosk with offline store-and-forward support and printed receipts.',
  },
];

function HeroRoundTripScene() {
  const reduceMotion = useAppStore((s) => s.reduceMotion);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-b from-[#E7F5EC] via-[#F4FAF6] to-[#FFFFFF] p-4 shadow-elevated sm:p-6">
      <svg
        viewBox="0 0 680 340"
        className="h-auto w-full"
        role="img"
        aria-label="Animated illustration of a rural freight truck pooling village harvest crates to the mandi and returning home loaded with farm inputs"
      >
        <defs>
          <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#F6B93B" stopOpacity="0.65" />
            <stop offset="65%" stopColor="#FFF1CF" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#FFF1CF" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="hillBack" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#CBE8D8" />
            <stop offset="100%" stopColor="#E4F3EA" />
          </linearGradient>
          <linearGradient id="hillFront" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#B4DEC6" />
            <stop offset="100%" stopColor="#DDF1E6" />
          </linearGradient>
        </defs>

        {/* Morning Sun Glow */}
        <circle cx="560" cy="68" r="68" fill="url(#sunGlow)" />
        <circle cx="560" cy="68" r="24" fill="#F6B93B" />

        {/* Drifting Clouds */}
        <motion.g
          animate={reduceMotion ? {} : { x: [0, 28, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
        >
          <rect x="82" y="42" width="76" height="20" rx="10" fill="#FFFFFF" opacity="0.9" />
          <circle cx="106" cy="42" r="14" fill="#FFFFFF" opacity="0.9" />
          <circle cx="132" cy="39" r="17" fill="#FFFFFF" opacity="0.9" />
        </motion.g>
        <motion.g
          animate={reduceMotion ? {} : { x: [0, -24, 0] }}
          transition={{ duration: 19, repeat: Infinity, ease: 'easeInOut' }}
        >
          <rect x="330" y="56" width="68" height="18" rx="9" fill="#FFFFFF" opacity="0.85" />
          <circle cx="352" cy="55" r="12" fill="#FFFFFF" opacity="0.85" />
          <circle cx="374" cy="53" r="14" fill="#FFFFFF" opacity="0.85" />
        </motion.g>

        {/* Parallax Kolar Hills & Fields */}
        <path d="M0 175 Q 150 120, 330 165 T 680 150 L 680 340 L 0 340 Z" fill="url(#hillBack)" />
        <path d="M0 212 Q 210 172, 420 205 T 680 192 L 680 340 L 0 340 Z" fill="url(#hillFront)" />

        {/* Village Pickup Stop 1: Vemgal */}
        <g transform="translate(64, 166)">
          <rect x="0" y="14" width="38" height="26" rx="4" fill="#FFFFFF" stroke="#2A7F58" strokeWidth="1.5" />
          <polygon points="-4,15 19,0 42,15" fill="#3FA374" />
          <rect x="44" y="24" width="14" height="10" rx="2" fill="#EF8A6B" />
          <rect x="44" y="12" width="14" height="10" rx="2" fill="#F6B93B" />
          <text x="24" y="54" textAnchor="middle" fontSize="10" fontWeight="700" fill="#1E2B25">
            Vemgal (8 qtl)
          </text>
        </g>

        {/* Village Pickup Stop 2: Narasapura */}
        <g transform="translate(248, 156)">
          <rect x="0" y="14" width="36" height="24" rx="4" fill="#FFFFFF" stroke="#2A7F58" strokeWidth="1.5" />
          <polygon points="-3,15 18,1 39,15" fill="#2A7F58" />
          <rect x="41" y="22" width="14" height="10" rx="2" fill="#3FA374" />
          <text x="22" y="52" textAnchor="middle" fontSize="10" fontWeight="700" fill="#1E2B25">
            Narasapura (+11 qtl)
          </text>
        </g>

        {/* Destination Mandi & Return Input Hub */}
        <g transform="translate(534, 152)">
          <rect x="0" y="10" width="92" height="38" rx="6" fill="#FFF1CF" stroke="#F6B93B" strokeWidth="2" />
          <rect x="8" y="2" width="76" height="12" rx="4" fill="#F6B93B" />
          <text x="46" y="33" textAnchor="middle" fontSize="10.5" fontWeight="800" fill="#1E2B25">
            KOLAR APMC
          </text>
          <text x="46" y="62" textAnchor="middle" fontSize="9.5" fontWeight="600" fill="#2A7F58">
            + Return Inputs Loaded
          </text>
        </g>

        {/* Outbound Road Band */}
        <path
          d="M 40 250 C 190 232, 410 232, 620 250"
          fill="none"
          stroke="#2A7F58"
          strokeWidth="16"
          strokeLinecap="round"
          opacity="0.18"
        />
        <path
          d="M 40 250 C 190 232, 410 232, 620 250"
          fill="none"
          stroke="#3FA374"
          strokeWidth="3"
          strokeDasharray="10 8"
        />

        {/* Return Leg Road Band */}
        <path
          d="M 620 294 C 410 310, 190 310, 40 294"
          fill="none"
          stroke="#7CC6E8"
          strokeWidth="14"
          strokeLinecap="round"
          opacity="0.25"
        />
        <path
          d="M 620 294 C 410 310, 190 310, 40 294"
          fill="none"
          stroke="#2A7F58"
          strokeWidth="2.5"
          strokeDasharray="8 8"
        />

        {/* Outbound Animated Truck (Harvest Crates) */}
        <motion.g
          animate={reduceMotion ? { x: 260, y: 224 } : { x: [55, 255, 520], y: [226, 216, 226] }}
          transition={{ duration: 7.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <rect x="0" y="6" width="52" height="22" rx="5" fill="#3FA374" />
          <rect x="52" y="11" width="20" height="17" rx="4" fill="#1E2B25" />
          <rect x="57" y="14" width="11" height="7" rx="1.5" fill="#E3F4FB" />
          {/* Harvest Crates */}
          <rect x="5" y="-3" width="13" height="9" rx="2" fill="#EF8A6B" />
          <rect x="20" y="-3" width="13" height="9" rx="2" fill="#F6B93B" />
          <rect x="35" y="-3" width="13" height="9" rx="2" fill="#2A7F58" />
          <circle cx="15" cy="30" r="6" fill="#1E2B25" />
          <circle cx="56" cy="30" r="6" fill="#1E2B25" />
        </motion.g>

        {/* Return-Leg Animated Truck (Blue Crates & Agro Inputs Heading Back Full) */}
        <motion.g
          animate={reduceMotion ? { x: 340, y: 274 } : { x: [535, 295, 70], y: [272, 282, 272] }}
          transition={{ duration: 8.2, repeat: Infinity, ease: 'easeInOut', delay: 1.1 }}
        >
          <rect x="0" y="11" width="20" height="17" rx="4" fill="#1E2B25" />
          <rect x="4" y="14" width="11" height="7" rx="1.5" fill="#E3F4FB" />
          <rect x="20" y="6" width="52" height="22" rx="5" fill="#7CC6E8" />
          {/* Return Cargo Bags */}
          <rect x="24" y="-3" width="14" height="9" rx="2" fill="#9B8AE6" />
          <rect x="40" y="-3" width="14" height="9" rx="2" fill="#F6B93B" />
          <rect x="56" y="-3" width="12" height="9" rx="2" fill="#2A7F58" />
          <circle cx="16" cy="30" r="6" fill="#1E2B25" />
          <circle cx="57" cy="30" r="6" fill="#1E2B25" />
        </motion.g>
      </svg>

      <div className="mt-3 grid grid-cols-3 gap-2 rounded-2xl bg-surface/90 p-3 text-center text-xs border border-border">
        <div>
          <span className="font-bold text-primary-strong">Outbound Leg</span>
          <p className="text-[11px] text-ink-muted">3 village part-loads pooled (92% bed fill)</p>
        </div>
        <div>
          <span className="font-bold text-ink">Return Leg</span>
          <p className="text-[11px] text-ink-muted">15 qtl agro-inputs pre-sold homeward</p>
        </div>
        <div>
          <span className="font-bold text-primary-strong">Shared Benefit</span>
          <p className="text-[11px] text-ink-muted">-26% shipper fare • +38% tour income</p>
        </div>
      </div>
    </div>
  );
}

export function LandingPage() {
  const { t } = useTranslation();
  const historicalTrips = useAppStore((s) => s.historicalTrips);
  const farmers = useAppStore((s) => s.farmers);
  const transporters = useAppStore((s) => s.transporters);
  const vehicles = useAppStore((s) => s.vehicles);

  // Interactive "Why this price?" calculator state
  const [calcWeight, setCalcWeight] = useState(12);
  const [calcDistKm, setCalcDistKm] = useState(28);
  const [calcNeighbours, setCalcNeighbours] = useState(2);
  const [calcReturnFilled, setCalcReturnFilled] = useState(true);

  // Interactive Transporter Earnings Calculator state
  const [tripsPerWeek, setTripsPerWeek] = useState(9);
  const [selectedVehCap, setSelectedVehCap] = useState<'bolero' | 'eicher' | 'tractor'>('bolero');

  // Testimonials & FAQ state
  const [testimonialIdx, setTestimonialIdx] = useState(0);
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  const miniCalcResult = useMemo(() => {
    const shippers = [
      {
        loadId: 'you',
        shipperName: 'Your Harvest',
        villageName: 'Vemgal',
        weightQuintals: calcWeight,
        directDistanceKm: calcDistKm,
        marginalDetourKm: 2.2,
      },
      ...Array.from({ length: calcNeighbours }, (_, i) => ({
        loadId: `n_${i}`,
        shipperName: `Neighbour ${i + 1}`,
        villageName: 'Narasapura',
        weightQuintals: 9 + i * 2,
        directDistanceKm: Math.max(10, calcDistKm - 3),
        marginalDetourKm: 3.1,
      })),
    ];
    const tour = calculateTourCost({
      outboundKm: calcDistKm + calcNeighbours * 3.4,
      returnKm: calcDistKm,
      vehicleCostPerKmInr: 22,
      returnFillRatio: calcReturnFilled ? 0.7 : 0,
      returnLoadRevenueInr: calcReturnFilled ? 980 : 0,
    });
    const shares = computePoolCostShares({
      shippers,
      netPoolCostInr: tour.netOutboundPoolCostInr,
      returnDiscountInr: tour.returnDiscountInr,
      costPerKmInr: 22,
      activeSplitRule: 'shapley',
    });
    return shares[0];
  }, [calcWeight, calcDistKm, calcNeighbours, calcReturnFilled]);

  const driverCalc = useMemo(() => {
    const basePerTrip = selectedVehCap === 'eicher' ? 2350 : selectedVehCap === 'tractor' ? 1650 : 1480;
    const upliftPerTrip = selectedVehCap === 'eicher' ? 980 : selectedVehCap === 'tractor' ? 640 : 690;
    const monthlyBefore = Math.round(tripsPerWeek * 4.3 * basePerTrip);
    const monthlyAfter = Math.round(tripsPerWeek * 4.3 * (basePerTrip + upliftPerTrip));
    return {
      monthlyBefore,
      monthlyAfter,
      monthlyExtra: monthlyAfter - monthlyBefore,
    };
  }, [tripsPerWeek, selectedVehCap]);

  const emptyKmSavedTotal = useMemo(
    () => historicalTrips.reduce((acc, tr) => acc + Math.round(tr.distanceKm * 0.62), 0) + 1840,
    [historicalTrips],
  );

  return (
    <div className="space-y-20 pb-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-8 sm:pt-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid items-center gap-10 lg:grid-cols-12">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="lg:col-span-6 space-y-6"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary-100 px-3.5 py-1.5 text-xs font-bold text-primary-strong">
                <Sprout className="h-3.5 w-3.5" />
                <span>{t('hero.eyebrow')}</span>
              </div>

              <h1 className="font-heading text-3xl font-extrabold leading-[1.12] tracking-tight text-ink sm:text-5xl">
                {t('hero.title')}
              </h1>

              <p className="max-w-xl text-base leading-relaxed text-ink-muted sm:text-lg">
                {t('hero.subtitle')}
              </p>

              {/* Three Primary CTAs */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link
                  to="/farmer/book"
                  className="inline-flex min-h-[50px] items-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-soft transition-all hover:-translate-y-0.5 hover:bg-primary-strong"
                >
                  <Mic className="h-4 w-4" />
                  <span>{t('hero.ctaFarmer')}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/transporter/onboard"
                  className="inline-flex min-h-[50px] items-center gap-2 rounded-2xl border border-border bg-surface px-5 py-3 text-sm font-bold text-ink shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary"
                >
                  <Truck className="h-4 w-4 text-primary-strong" />
                  <span>{t('hero.ctaDriver')}</span>
                </Link>
                <Link
                  to="/kiosk/desk"
                  className="inline-flex min-h-[50px] items-center gap-2 rounded-2xl bg-accent-100 px-5 py-3 text-sm font-bold text-ink transition-all hover:-translate-y-0.5 hover:bg-accent/40"
                >
                  <Store className="h-4 w-4 text-ink" />
                  <span>{t('hero.ctaSakhi')}</span>
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.55, delay: 0.1 }}
              className="lg:col-span-6"
            >
              <HeroRoundTripScene />
            </motion.div>
          </div>

          {/* Live Network Counters */}
          <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: 'Loads Moved (90 Days)', val: historicalTrips.length + 35, suffix: '+' },
              { label: 'Empty Kilometres Avoided', val: emptyKmSavedTotal, suffix: ' km' },
              { label: 'Active Growers & FPOs', val: farmers.length + 215, suffix: '' },
              { label: 'Verified Tempos & Tractors', val: vehicles.length, suffix: ` (${transporters.length} owners)` },
            ].map((stat, idx) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.08 }}
                className="rounded-2xl border border-border bg-surface p-5 shadow-soft"
              >
                <div className="font-heading text-2xl font-extrabold text-ink sm:text-3xl">
                  <AnimatedNumber value={stat.val} />
                  <span className="text-base font-bold text-primary-strong">{stat.suffix}</span>
                </div>
                <p className="mt-1 text-xs font-semibold text-ink-muted">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works in 4 Animated Steps */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <span className="text-xs font-bold uppercase tracking-wider text-primary-strong">
            How {APP_NAME} Works
          </span>
          <h2 className="mt-1 text-2xl font-extrabold text-ink sm:text-3xl">
            Four steps from harvest-ready field to settled mandi payout
          </h2>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              step: '01',
              icon: Mic,
              title: 'Voice Harvest-Ready Ping',
              desc: 'Speak in Kannada, Hindi, or English — or visit a village Freight Sakhi. Crop, crates, village, and shelf-life urgency are captured in seconds.',
              accent: 'bg-primary-100 text-primary-strong',
            },
            {
              step: '02',
              icon: Users,
              title: 'Compatible Neighbour Pool',
              desc: 'Nearby compatible loads snap onto one vehicle bed in Last-In-First-Out mandi drop order — never mixing fertiliser with fresh produce.',
              accent: 'bg-accent-100 text-ink',
            },
            {
              step: '03',
              icon: RefreshCw,
              title: 'Filled Return Leg & Self-Heal',
              desc: 'Input dealers pre-book the homeward run so drivers earn both ways. If a vehicle cancels, a standby takes over in under 4 seconds.',
              accent: 'bg-sky-100 text-ink',
            },
            {
              step: '04',
              icon: ShieldCheck,
              title: 'Audited Shapley Fare & Escrow',
              desc: 'Every shipper sees and hears how their price was split, votes on pool rules, and pays into UPI escrow released on delivery.',
              accent: 'bg-violet-100 text-ink',
            },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="group rounded-3xl border border-border bg-surface p-6 shadow-soft transition-all hover:-translate-y-1 hover:shadow-elevated"
              >
                <div className="flex items-center justify-between">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${item.accent}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="font-heading text-sm font-extrabold text-ink-muted/60">{item.step}</span>
                </div>
                <h3 className="mt-4 text-base font-bold text-ink">{item.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-ink-muted">{item.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Interactive Calculators: "Why This Price?" + Transporter Earnings Uplift */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Shipper Shapley Mini-Calculator */}
          <div className="rounded-3xl border border-border bg-surface p-6 shadow-soft sm:p-8">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary-strong">
              <Calculator className="h-4 w-4" />
              <span>Interactive “Why This Price?” Calculator</span>
            </div>
            <h3 className="mt-2 text-xl font-extrabold text-ink">
              See every rupee before you book
            </h3>

            <div className="mt-5 space-y-4">
              <div>
                <div className="flex justify-between text-xs font-semibold">
                  <span>Your Harvest Weight</span>
                  <span className="font-bold text-primary-strong">{calcWeight} quintals</span>
                </div>
                <input
                  type="range"
                  min={4}
                  max={28}
                  value={calcWeight}
                  onChange={(e) => setCalcWeight(Number(e.target.value))}
                  aria-label="Your harvest weight in quintals"
                  className="mt-1.5 w-full accent-primary"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold">
                  <span>Corridor Distance to Mandi</span>
                  <span className="font-bold text-primary-strong">{calcDistKm} km</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={68}
                  value={calcDistKm}
                  onChange={(e) => setCalcDistKm(Number(e.target.value))}
                  aria-label="Corridor distance in kilometres"
                  className="mt-1.5 w-full accent-primary"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-ink-muted">Neighbours in pool:</span>
                  {[0, 1, 2, 3].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setCalcNeighbours(n)}
                      className={`min-h-[36px] min-w-[36px] rounded-xl text-xs font-bold ${
                        calcNeighbours === n
                          ? 'bg-primary text-white'
                          : 'bg-surface-2 text-ink hover:bg-primary-100'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setCalcReturnFilled((v) => !v)}
                  aria-pressed={calcReturnFilled}
                  className={`min-h-[38px] rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors ${
                    calcReturnFilled
                      ? 'border-sky bg-sky-100 text-ink'
                      : 'border-border bg-surface-2 text-ink-muted'
                  }`}
                >
                  {calcReturnFilled ? 'Return Leg Filled (-Credit)' : 'Empty Return Leg'}
                </button>
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-surface-2 p-4">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-xs font-semibold text-ink-muted">Your Fair Shapley Fare</span>
                  <div className="font-heading text-3xl font-extrabold text-primary-strong">
                    <AnimatedNumber value={miniCalcResult.finalShareInr} prefix="₹" />
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-ink-muted line-through">
                    Solo Truck: ₹{miniCalcResult.soloCostInr}
                  </span>
                  <div className="mt-0.5 inline-block rounded-lg bg-accent-100 px-2.5 py-1 text-xs font-extrabold text-ink">
                    Save {miniCalcResult.savingsPct}%
                  </div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2 border-t border-border pt-3 text-[11px]">
                <div>
                  <span className="text-ink-muted">Weight</span>
                  <div className="font-bold text-ink">₹{miniCalcResult.baseWeightChargeInr}</div>
                </div>
                <div>
                  <span className="text-ink-muted">Trunk km</span>
                  <div className="font-bold text-ink">₹{miniCalcResult.distanceComponentInr}</div>
                </div>
                <div>
                  <span className="text-ink-muted">Detour</span>
                  <div className="font-bold text-ink">₹{miniCalcResult.detourDeltaInr}</div>
                </div>
                <div>
                  <span className="text-ink-muted">Return Credit</span>
                  <div className="font-bold text-primary-strong">-₹{miniCalcResult.returnLegCreditInr}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Transporter Earnings Calculator */}
          <div className="rounded-3xl border border-border bg-surface p-6 shadow-soft sm:p-8">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary-strong">
              <TrendingUp className="h-4 w-4" />
              <span>Transporter Tour Uplift Calculator</span>
            </div>
            <h3 className="mt-2 text-xl font-extrabold text-ink">
              Turn empty homeward kilometres into paid tours
            </h3>

            <div className="mt-5 space-y-4">
              <div>
                <span className="text-xs font-semibold text-ink-muted">Select Your Vehicle</span>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  {[
                    { id: 'bolero', label: 'Bolero Pickup (2T)' },
                    { id: 'tractor', label: 'Tractor + Trolley' },
                    { id: 'eicher', label: 'Eicher 14 ft (4.5T)' },
                  ].map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVehCap(v.id as 'bolero' | 'eicher' | 'tractor')}
                      className={`min-h-[42px] rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${
                        selectedVehCap === v.id
                          ? 'border-primary bg-primary-100 text-primary-strong'
                          : 'border-border bg-surface-2 text-ink hover:bg-bg'
                      }`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold">
                  <span>Mandi Trips Per Week</span>
                  <span className="font-bold text-primary-strong">{tripsPerWeek} trips / week</span>
                </div>
                <input
                  type="range"
                  min={3}
                  max={16}
                  value={tripsPerWeek}
                  onChange={(e) => setTripsPerWeek(Number(e.target.value))}
                  aria-label="Mandi trips per week"
                  className="mt-1.5 w-full accent-primary"
                />
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-primary/25 bg-gradient-to-br from-primary-100/70 to-accent-100/50 p-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs font-semibold text-ink-muted">Typical Part-Empty Earnings</span>
                  <div className="mt-0.5 font-heading text-xl font-bold text-ink">
                    <AnimatedNumber value={driverCalc.monthlyBefore} prefix="₹" suffix="/mo" />
                  </div>
                </div>
                <div>
                  <span className="text-xs font-semibold text-primary-strong">Pooled + Return-Leg Tour</span>
                  <div className="mt-0.5 font-heading text-2xl font-extrabold text-primary-strong">
                    <AnimatedNumber value={driverCalc.monthlyAfter} prefix="₹" suffix="/mo" />
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border/80 pt-3">
                <span className="text-xs font-bold text-ink">
                  Projected Monthly Uplift:{' '}
                  <span className="text-primary-strong">
                    +<AnimatedNumber value={driverCalc.monthlyExtra} prefix="₹" />
                  </span>
                </span>
                <Link
                  to="/transporter/shadow"
                  className="inline-flex items-center gap-1 text-xs font-bold text-primary-strong hover:underline"
                >
                  Replay last month <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Carousel */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="rounded-3xl border border-border bg-surface p-6 shadow-soft sm:p-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-primary-strong">
                Voices Across Kolar Talukas
              </span>
              <h2 className="mt-1 text-2xl font-extrabold text-ink">
                Built with growers, tempo owners, and Freight Sakhis
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Previous testimonial"
                onClick={() =>
                  setTestimonialIdx((i) => (i - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)
                }
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface-2 hover:bg-primary-100"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="Next testimonial"
                onClick={() => setTestimonialIdx((i) => (i + 1) % TESTIMONIALS.length)}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface-2 hover:bg-primary-100"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          <motion.div
            key={testimonialIdx}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-6 rounded-2xl bg-surface-2 p-6 sm:p-8"
          >
            <p className="font-heading text-lg font-semibold leading-relaxed text-ink sm:text-xl">
              “{TESTIMONIALS[testimonialIdx].quote}”
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-extrabold text-ink">
                  {TESTIMONIALS[testimonialIdx].author}
                </div>
                <div className="text-xs text-ink-muted">{TESTIMONIALS[testimonialIdx].role}</div>
              </div>
              <span className="rounded-full bg-accent-100 px-3.5 py-1.5 text-xs font-extrabold text-ink">
                {TESTIMONIALS[testimonialIdx].stat}
              </span>
            </div>
          </motion.div>

          <div className="mt-4 flex justify-center gap-2">
            {TESTIMONIALS.map((item, idx) => (
              <button
                key={item.author}
                type="button"
                aria-label={`Show testimonial ${idx + 1}`}
                onClick={() => setTestimonialIdx(idx)}
                className={`h-2.5 rounded-full transition-all ${
                  idx === testimonialIdx ? 'w-8 bg-primary' : 'w-2.5 bg-border'
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="text-center">
          <span className="text-xs font-bold uppercase tracking-wider text-primary-strong">
            Common Questions
          </span>
          <h2 className="mt-1 text-2xl font-extrabold text-ink sm:text-3xl">
            Transparent rules for every shared trip
          </h2>
        </div>

        <div className="mt-8 space-y-3">
          {FAQS.map((item, idx) => {
            const isOpen = openFaqIdx === idx;
            return (
              <div
                key={item.q}
                className="overflow-hidden rounded-2xl border border-border bg-surface shadow-soft"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  className="flex min-h-[54px] w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-bold text-ink hover:bg-surface-2/60"
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-ink-muted transition-transform ${
                      isOpen ? 'rotate-180 text-primary-strong' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="border-t border-border bg-bg/60 px-5 py-4 text-xs leading-relaxed text-ink-muted sm:text-sm">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
