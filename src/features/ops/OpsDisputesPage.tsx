import { useState } from 'react';
import { CheckCircle2, FileText, Scale } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';

export function OpsDisputesPage() {
  const disputes = useAppStore((s) => s.disputes);
  const resolveDisputeCase = useAppStore((s) => s.resolveDisputeCase);

  const [selectedId, setSelectedId] = useState(disputes[0]?.id ?? 'disp_1');
  const active = disputes.find((d) => d.id === selectedId) ?? disputes[0];

  const variancePct =
    active.bookedWeightQuintals > 0
      ? Math.round(
          ((active.weighbridgeQuintals - active.bookedWeightQuintals) / active.bookedWeightQuintals) *
            1000,
        ) / 10
      : 0;
  const withinTolerance = Math.abs(variancePct) <= active.tolerancePct;
  const recommendedPayout = withinTolerance
    ? active.escrowAmountInr
    : active.weighbridgeQuintals === 0
      ? Math.round(active.escrowAmountInr * 0.35)
      : Math.round(
          active.escrowAmountInr * (active.weighbridgeQuintals / active.bookedWeightQuintals),
        );

  const [customPayout, setCustomPayout] = useState<number | null>(null);
  const [note, setNote] = useState('Verified electronic APMC weighbridge slip & ±2.0% tolerance policy.');

  const payoutToApply = customPayout ?? recommendedPayout;

  const handleResolve = async () => {
    await resolveDisputeCase(active.id, payoutToApply, note);
    setCustomPayout(null);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-100 px-3 py-1 text-xs font-bold text-ink">
          <Scale className="h-3.5 w-3.5 text-primary-strong" /> Weighbridge Reconciliation & Escrow Disputes
        </span>
        <h1 className="mt-1.5 text-2xl font-extrabold text-ink">
          Pricing Audit & ±2% Weighbridge Tolerance Desk
        </h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Queue List */}
        <div className="space-y-2.5 lg:col-span-5">
          {disputes.map((d) => (
            <div
              key={d.id}
              onClick={() => {
                setSelectedId(d.id);
                setCustomPayout(null);
              }}
              className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                d.id === active.id
                  ? 'border-primary bg-surface shadow-elevated'
                  : 'border-border bg-surface shadow-soft hover:border-primary/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-ink">
                  {d.poolCode} • {d.category.replace('_', ' ').toUpperCase()}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                    d.status === 'resolved'
                      ? 'bg-primary-100 text-primary-strong'
                      : 'bg-coral-100 text-ink'
                  }`}
                >
                  {d.status.replace('_', ' ')}
                </span>
              </div>
              <div className="mt-1 text-xs font-semibold text-ink-muted">
                {d.raisedBy} vs. {d.againstParty}
              </div>
              <p className="mt-1 text-[11px] text-ink-muted line-clamp-2">{d.summary}</p>
            </div>
          ))}
        </div>

        {/* Case Evidence & Tolerance Resolver */}
        <div className="space-y-4 rounded-3xl border border-border bg-surface p-6 shadow-soft lg:col-span-7">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h2 className="text-lg font-extrabold text-ink">
                Case {active.poolCode} — Slip #{active.slipNumber}
              </h2>
              <p className="text-xs text-ink-muted">
                Raised by {active.raisedBy} • Held Escrow: ₹{active.escrowAmountInr}
              </p>
            </div>
            <FileText className="h-6 w-6 text-primary-strong" />
          </div>

          <div className="grid grid-cols-3 gap-3 rounded-2xl bg-surface-2 p-4 text-center text-xs">
            <div>
              <span className="text-ink-muted">Booked Weight</span>
              <div className="mt-0.5 text-base font-extrabold text-ink">
                {active.bookedWeightQuintals} qtl
              </div>
            </div>
            <div>
              <span className="text-ink-muted">Weighbridge Slip</span>
              <div className="mt-0.5 text-base font-extrabold text-primary-strong">
                {active.weighbridgeQuintals} qtl
              </div>
            </div>
            <div>
              <span className="text-ink-muted">Variance (±{active.tolerancePct}% Rule)</span>
              <div
                className={`mt-0.5 text-base font-extrabold ${
                  withinTolerance ? 'text-primary-strong' : 'text-coral'
                }`}
              >
                {variancePct > 0 ? `+${variancePct}%` : `${variancePct}%`}
              </div>
            </div>
          </div>

          <p className="text-xs leading-relaxed text-ink">{active.summary}</p>

          <div className="rounded-2xl border border-primary/35 bg-primary-100/50 p-4 text-xs">
            <div className="font-extrabold text-primary-strong">
              Automated Tolerance Calculation: Recommended Settlement ₹{recommendedPayout}
            </div>
            <p className="mt-1 text-ink-muted">
              {withinTolerance
                ? 'Weight difference falls inside the ±2.0% moisture & scale band; release booked fare without surcharge.'
                : 'Variance exceeds ±2.0% band; pro-rata adjustment applied before releasing escrow to ledger.'}
            </p>
          </div>

          {active.status !== 'resolved' ? (
            <div className="space-y-3 pt-1">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="disp-amt" className="text-[11px] font-bold uppercase text-ink-muted">
                    Final Escrow Settlement (₹)
                  </label>
                  <input
                    id="disp-amt"
                    type="number"
                    value={payoutToApply}
                    onChange={(e) => setCustomPayout(Number(e.target.value))}
                    className="mt-1 min-h-[42px] w-full rounded-xl border border-border bg-surface-2 px-3 text-sm font-extrabold text-ink"
                  />
                </div>
                <div>
                  <label htmlFor="disp-note" className="text-[11px] font-bold uppercase text-ink-muted">
                    Audit Resolution Note
                  </label>
                  <input
                    id="disp-note"
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="mt-1 min-h-[42px] w-full rounded-xl border border-border bg-surface-2 px-3 text-xs font-medium text-ink"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleResolve}
                className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl bg-primary text-xs font-extrabold text-white hover:bg-primary-strong"
              >
                <CheckCircle2 className="h-4 w-4" /> Resolve Case & Post ₹{payoutToApply} to Escrow Ledger
              </button>
            </div>
          ) : (
            <div className="rounded-2xl bg-surface-2 p-3.5 text-xs font-bold text-primary-strong">
              Resolved at ₹{active.adjustedPayoutInr}: {active.resolutionNote}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
