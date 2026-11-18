import { useState } from 'react';
import { z } from 'zod';
import {
  ArrowDownToLine,
  Award,
  Building,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { downloadCreditPassportPdf, downloadCsvFile } from '@/services/pdfExport';
import { useAppStore } from '@/stores/useAppStore';
import type { CreditApplication } from '@/types/domain';

const bankSchema = z.object({
  accountDigits: z.string().regex(/^\d{4,16}$/, 'Enter 4 to 16 account digits'),
  ifsc: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/i, 'Enter valid 11-character IFSC (e.g., CNRB0001427)'),
});

const LENDER_OFFERS: {
  lenderName: string;
  productType: CreditApplication['productType'];
  title: string;
  amountInr: number;
  aprPct: number;
  desc: string;
}[] = [
  {
    lenderName: 'Kolar Gramin Pragathi Bank',
    productType: 'fuel_credit',
    title: 'Revolving Diesel & Fastag Credit Line',
    amountInr: 35000,
    aprPct: 11.2,
    desc: 'Zero-collateral 15-day diesel credit backed by verified mandi escrow settlements.',
  },
  {
    lenderName: 'Sahyadri Rural Cooperative Finance',
    productType: 'tyre_working_capital',
    title: 'Tyre, Tarpaulin & Maintenance Working Capital',
    amountInr: 65000,
    aprPct: 12.0,
    desc: 'Repaid in tiny automatic ₹120 deductions per completed pooled tour.',
  },
  {
    lenderName: 'Suvarna Commercial Mobility Credit',
    productType: 'vehicle_upgrade_loan',
    title: 'Insulated / Covered Eicher Upgrade Loan',
    amountInr: 480000,
    aprPct: 12.4,
    desc: 'Preferential green-corridor rate for operators with 90+ reliability score.',
  },
];

export function TransporterWalletPassportPage() {
  const transporters = useAppStore((s) => s.transporters);
  const vehicles = useAppStore((s) => s.vehicles);
  const ledger = useAppStore((s) => s.ledger);
  const creditApplications = useAppStore((s) => s.creditApplications);
  const currentAccountId = useAppStore((s) => s.currentAccountId);

  const withdrawTransporterWallet = useAppStore((s) => s.withdrawTransporterWallet);
  const addTransporterBank = useAppStore((s) => s.addTransporterBank);
  const applyForCreditProduct = useAppStore((s) => s.applyForCreditProduct);

  const activeTransporter =
    transporters.find((t) => t.accountId === currentAccountId) ?? transporters[0];
  const ownedVehicles = vehicles.filter((v) => activeTransporter.vehicleIds.includes(v.id));
  const myLedger = ledger
    .filter((l) => l.partyRole === 'transporter')
    .slice(0, 12);
  const myApplications = creditApplications.filter(
    (c) => c.transporterId === activeTransporter.id,
  );

  const [withdrawAmount, setWithdrawAmount] = useState(2500);
  const [bankOpen, setBankOpen] = useState(false);
  const [accountDigits, setAccountDigits] = useState('7742');
  const [ifsc, setIfsc] = useState('CNRB0001427');
  const [bankError, setBankError] = useState<string | null>(null);

  const handleSaveBank = (e: React.FormEvent) => {
    e.preventDefault();
    const res = bankSchema.safeParse({ accountDigits, ifsc });
    if (!res.success) {
      setBankError(res.error.issues[0]?.message ?? 'Invalid bank details');
      return;
    }
    setBankError(null);
    addTransporterBank(activeTransporter.id, `•••• ${accountDigits.slice(-4)}`, ifsc.toUpperCase());
    setBankOpen(false);
  };

  const handleDownloadStatement = () => {
    downloadCsvFile(
      `HarvestHaul-Statement-${activeTransporter.name.replace(/\s+/g, '-')}.csv`,
      ['Timestamp', 'Pool', 'Type', 'Amount INR', 'Reference', 'Status'],
      myLedger.map((l) => [l.timestamp, l.poolCode, l.kind, l.amountInr, l.upiRef, l.status]),
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      {/* Wallet & Instant Payouts */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="rounded-3xl border border-border bg-surface p-6 shadow-soft lg:col-span-6">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary-strong">
              <Wallet className="h-4 w-4" /> Earnings Wallet & Instant IMPS
            </span>
            <button
              type="button"
              onClick={() => setBankOpen((v) => !v)}
              className="inline-flex items-center gap-1 rounded-xl border border-border bg-surface-2 px-3 py-1.5 text-xs font-bold text-ink hover:border-primary"
            >
              <Building className="h-3.5 w-3.5" /> {activeTransporter.bankAccountMasked}
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 rounded-2xl bg-surface-2 p-4">
            <div>
              <span className="text-xs text-ink-muted">Withdrawable Balance</span>
              <div className="font-heading text-3xl font-extrabold text-primary-strong">
                <AnimatedNumber value={activeTransporter.walletBalanceInr} prefix="₹" />
              </div>
            </div>
            <div>
              <span className="text-xs text-ink-muted">Escrow In Transit</span>
              <div className="font-heading text-2xl font-bold text-ink">
                <AnimatedNumber value={activeTransporter.escrowInTransitInr} prefix="₹" />
              </div>
            </div>
          </div>

          {bankOpen && (
            <form onSubmit={handleSaveBank} className="mt-4 space-y-3 rounded-2xl border border-border bg-bg p-4">
              <div className="text-xs font-extrabold text-ink">Link Settlement Bank Account</div>
              {bankError && <div className="text-xs font-semibold text-coral">{bankError}</div>}
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={accountDigits}
                  onChange={(e) => setAccountDigits(e.target.value)}
                  aria-label="Account number digits"
                  className="min-h-[40px] rounded-xl border border-border bg-surface px-3 text-xs font-bold"
                />
                <input
                  type="text"
                  value={ifsc}
                  onChange={(e) => setIfsc(e.target.value)}
                  aria-label="Bank IFSC"
                  className="min-h-[40px] rounded-xl border border-border bg-surface px-3 text-xs font-bold uppercase"
                />
              </div>
              <button
                type="submit"
                className="min-h-[38px] rounded-xl bg-ink px-4 text-xs font-bold text-white"
              >
                Verify & Save Account
              </button>
            </form>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <input
              type="number"
              min={500}
              max={activeTransporter.walletBalanceInr}
              step={500}
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(Number(e.target.value))}
              aria-label="Withdraw amount in rupees"
              className="min-h-[46px] w-36 rounded-xl border border-border bg-surface-2 px-3.5 text-sm font-extrabold text-ink"
            />
            <button
              type="button"
              disabled={withdrawAmount <= 0 || withdrawAmount > activeTransporter.walletBalanceInr}
              onClick={() => withdrawTransporterWallet(activeTransporter.id, withdrawAmount)}
              className="inline-flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-extrabold text-white hover:bg-primary-strong disabled:opacity-45"
            >
              <ArrowDownToLine className="h-4 w-4" /> Instant Withdraw to Bank
            </button>
            <button
              type="button"
              onClick={handleDownloadStatement}
              className="inline-flex min-h-[46px] items-center gap-1.5 rounded-xl border border-border bg-surface px-3.5 text-xs font-bold text-ink hover:border-primary"
            >
              <FileSpreadsheet className="h-4 w-4 text-primary-strong" /> Statement CSV
            </button>
          </div>
        </div>

        {/* Reliability Gauge & Verified Credit Passport */}
        <div className="rounded-3xl border border-primary/35 bg-gradient-to-br from-primary-100/60 via-surface to-accent-100/40 p-6 shadow-soft lg:col-span-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary-strong">
              <Award className="h-4 w-4" /> Verified Transporter Credit Passport
            </span>
            <button
              type="button"
              onClick={() => downloadCreditPassportPdf(activeTransporter, ownedVehicles)}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-ink px-3.5 py-2 text-xs font-extrabold text-white hover:bg-primary-strong"
            >
              <Download className="h-3.5 w-3.5" /> Download Passport PDF
            </button>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-6">
            {/* Circular Reliability Gauge */}
            <div className="relative flex h-28 w-28 items-center justify-center">
              <svg width="112" height="112" className="-rotate-90">
                <circle cx="56" cy="56" r="46" fill="none" stroke="#FFFFFF" strokeWidth="10" />
                <circle
                  cx="56"
                  cy="56"
                  r="46"
                  fill="none"
                  stroke="#2A7F58"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 46}
                  strokeDashoffset={2 * Math.PI * 46 * (1 - activeTransporter.reliabilityScore / 100)}
                />
              </svg>
              <div className="absolute text-center">
                <div className="font-heading text-2xl font-extrabold text-ink">
                  {activeTransporter.reliabilityScore}
                </div>
                <div className="text-[10px] font-bold uppercase text-primary-strong">Gold Tier</div>
              </div>
            </div>

            <div className="flex-1 space-y-1.5 text-xs">
              <div className="text-base font-extrabold text-ink">{activeTransporter.name}</div>
              <div className="text-ink-muted">
                Verified Monthly Net Freight:{' '}
                <strong className="text-ink">
                  ₹{activeTransporter.verifiedMonthlyEarningsInr.toLocaleString('en-IN')}
                </strong>
              </div>
              <div className="text-ink-muted">
                Completed Verified Tours: <strong className="text-ink">{activeTransporter.completedTours}</strong>
              </div>
              <div className="inline-flex items-center gap-1 rounded-lg bg-surface px-2.5 py-1 text-[11px] font-bold text-primary-strong border border-border">
                <ShieldCheck className="h-3.5 w-3.5" /> Backed by UPI Escrow & Weighbridge Slips
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Partner Lender Offers + Status Tracker */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-3 lg:col-span-8">
          <h2 className="text-base font-extrabold text-ink">
            Pre-Qualified Partner Credit Lines (1-Tap Passport Share)
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {LENDER_OFFERS.map((offer) => {
              const alreadyApplied = myApplications.some(
                (a) => a.productType === offer.productType,
              );
              return (
                <div
                  key={offer.productType}
                  className="flex flex-col justify-between rounded-3xl border border-border bg-surface p-5 shadow-soft"
                >
                  <div>
                    <span className="text-[11px] font-bold text-primary-strong">
                      {offer.lenderName}
                    </span>
                    <h3 className="mt-1 text-sm font-extrabold text-ink">{offer.title}</h3>
                    <div className="mt-2 font-heading text-xl font-extrabold text-ink">
                      ₹{offer.amountInr.toLocaleString('en-IN')}
                    </div>
                    <span className="text-[11px] font-semibold text-ink-muted">
                      @ {offer.aprPct}% p.a. reducing
                    </span>
                    <p className="mt-2 text-xs text-ink-muted leading-relaxed">{offer.desc}</p>
                  </div>
                  <button
                    type="button"
                    disabled={alreadyApplied}
                    onClick={() =>
                      applyForCreditProduct({
                        transporterId: activeTransporter.id,
                        lenderName: offer.lenderName,
                        productType: offer.productType,
                        amountInr: offer.amountInr,
                        aprPct: offer.aprPct,
                      })
                    }
                    className={`mt-4 min-h-[42px] w-full rounded-xl px-3 py-2 text-xs font-extrabold ${
                      alreadyApplied
                        ? 'bg-primary-100 text-primary-strong'
                        : 'bg-primary text-white hover:bg-primary-strong'
                    }`}
                  >
                    {alreadyApplied ? 'Application Active' : 'Apply with Passport'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Application Status Tracker */}
        <div className="rounded-3xl border border-border bg-surface p-5 shadow-soft lg:col-span-4">
          <h2 className="text-base font-extrabold text-ink">Application Status Tracker</h2>
          <div className="mt-3 space-y-3">
            {myApplications.map((app) => (
              <div key={app.id} className="rounded-2xl border border-border bg-surface-2 p-3.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-ink">{app.lenderName}</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary-100 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-primary-strong">
                    <CheckCircle2 className="h-3 w-3" /> {app.status}
                  </span>
                </div>
                <div className="mt-1 font-bold text-ink">
                  ₹{app.amountInr.toLocaleString('en-IN')} • {app.productType.replace(/_/g, ' ')}
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-primary-strong">
                  <span>1. Submitted</span> → <span>2. Passport Verified</span> →{' '}
                  <span className={app.status === 'sanctioned' ? 'underline' : 'opacity-60'}>
                    3. Sanctioned
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
