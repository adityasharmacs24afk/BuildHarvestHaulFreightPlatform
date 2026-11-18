import { useMemo, useState } from 'react';
import { CheckCircle2, Download, FileCheck2, Search, XCircle } from 'lucide-react';
import { downloadCsvFile } from '@/services/pdfExport';
import { useAppStore } from '@/stores/useAppStore';

export function OpsLedgerOnboardingPage() {
  const ledger = useAppStore((s) => s.ledger);
  const onboardingQueue = useAppStore((s) => s.onboardingQueue);
  const nodes = useAppStore((s) => s.nodes);
  const reviewOnboardingApplication = useAppStore((s) => s.reviewOnboardingApplication);

  const [kindFilter, setKindFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const filteredLedger = useMemo(
    () =>
      ledger.filter((entry) => {
        if (kindFilter !== 'all' && entry.kind !== kindFilter) return false;
        if (
          search.trim() &&
          !entry.partyName.toLowerCase().includes(search.toLowerCase()) &&
          !entry.poolCode.toLowerCase().includes(search.toLowerCase()) &&
          !entry.upiRef.toLowerCase().includes(search.toLowerCase())
        ) {
          return false;
        }
        return true;
      }),
    [ledger, kindFilter, search],
  );

  const handleExportLedger = () => {
    downloadCsvFile(
      'HarvestHaul-Escrow-Ledger.csv',
      ['Timestamp', 'Pool Code', 'Party', 'Role', 'Kind', 'Amount INR', 'UPI Ref', 'Status', 'Notes'],
      filteredLedger.map((l) => [
        l.timestamp,
        l.poolCode,
        l.partyName,
        l.partyRole,
        l.kind,
        l.amountInr,
        l.upiRef,
        l.status,
        l.notes,
      ]),
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6">
      {/* Payments & Escrow Ledger */}
      <div className="rounded-3xl border border-border bg-surface p-6 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold text-ink">
              Payments & Escrow Ledger ({filteredLedger.length} Reconciled Entries)
            </h1>
            <p className="text-xs text-ink-muted">
              Every collection, transit hold, weighbridge release, shipper refund, and IMPS payout.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-ink-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search ledger"
                className="min-h-[38px] rounded-xl border border-border bg-surface-2 pl-9 pr-3 text-xs font-semibold"
              />
            </div>
            <select
              aria-label="Filter ledger entry kind"
              value={kindFilter}
              onChange={(e) => setKindFilter(e.target.value)}
              className="min-h-[38px] rounded-xl border border-border bg-surface-2 px-3 text-xs font-bold"
            >
              <option value="all">All States</option>
              <option value="held">Escrow Held</option>
              <option value="released">Released</option>
              <option value="payout">Driver Payout</option>
              <option value="refunded">Refunded</option>
            </select>
            <button
              type="button"
              onClick={handleExportLedger}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-ink px-3.5 text-xs font-bold text-white"
            >
              <Download className="h-3.5 w-3.5" /> Export CSV
            </button>
          </div>
        </div>

        <div className="mt-4 max-h-96 overflow-y-auto rounded-2xl border border-border">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-surface-2 text-[11px] uppercase text-ink-muted">
              <tr>
                <th className="px-3 py-2.5">Pool / Ref</th>
                <th className="px-3 py-2.5">Party</th>
                <th className="px-3 py-2.5">Kind</th>
                <th className="px-3 py-2.5">Amount</th>
                <th className="px-3 py-2.5">UPI / IMPS</th>
                <th className="px-3 py-2.5">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredLedger.slice(0, 60).map((entry) => (
                <tr key={entry.id}>
                  <td className="px-3 py-2.5 font-bold text-ink">{entry.poolCode}</td>
                  <td className="px-3 py-2.5">{entry.partyName}</td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                        entry.kind === 'held'
                          ? 'bg-accent-100 text-ink'
                          : entry.kind === 'refunded'
                            ? 'bg-coral-100 text-ink'
                            : 'bg-primary-100 text-primary-strong'
                      }`}
                    >
                      {entry.kind}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 font-bold">₹{entry.amountInr}</td>
                  <td className="px-3 py-2.5 font-mono text-[11px]">{entry.upiRef}</td>
                  <td className="px-3 py-2.5 text-ink-muted">{entry.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transporter Onboarding Review Queue */}
      <div className="rounded-3xl border border-border bg-surface p-6 shadow-soft">
        <div className="flex items-center gap-2">
          <FileCheck2 className="h-5 w-5 text-primary-strong" />
          <h2 className="text-lg font-extrabold text-ink">
            Transporter RC & Permit Verification Queue
          </h2>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {onboardingQueue.map((app) => {
            const vName = nodes.find((n) => n.id === app.villageId)?.name ?? 'Kolar';
            return (
              <div
                key={app.id}
                className="flex flex-col justify-between rounded-2xl border border-border bg-bg p-4 text-xs"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-ink">{app.applicantName}</span>
                    <span className="rounded-full bg-primary-100 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-primary-strong">
                      {app.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="rounded-xl border border-border bg-surface p-3 font-mono text-[11px]">
                    <div className="font-bold text-ink">PLATE: {app.vehiclePlate}</div>
                    <div>CAPACITY: {app.capacityQuintals} QTL • HOME: {vName}</div>
                    <div>RC FITNESS VALID: {app.rcValidUntil}</div>
                  </div>
                </div>

                {app.status === 'pending' ? (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        reviewOnboardingApplication(
                          app.id,
                          'approved',
                          'RC & Kolar Goods Permit verified',
                        )
                      }
                      className="inline-flex min-h-[38px] items-center justify-center gap-1 rounded-xl bg-primary text-xs font-extrabold text-white"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        reviewOnboardingApplication(
                          app.id,
                          'changes_requested',
                          'Please re-upload clearer rear plate photo',
                        )
                      }
                      className="inline-flex min-h-[38px] items-center justify-center gap-1 rounded-xl border border-coral bg-coral-100/50 text-xs font-bold text-ink"
                    >
                      <XCircle className="h-3.5 w-3.5 text-coral" /> Re-upload
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 text-[11px] font-semibold text-primary-strong">
                    {app.reviewerNote}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
