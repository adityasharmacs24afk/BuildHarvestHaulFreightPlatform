import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  Building2,
  CalendarClock,
  CheckCircle2,
  Download,
  FileUp,
  Plus,
  Truck,
} from 'lucide-react';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { CARGO_CATALOG } from '@/engine/compatibility';
import { roadDistanceKm } from '@/engine/geo';
import { downloadCsvFile } from '@/services/pdfExport';
import { useAppStore } from '@/stores/useAppStore';
import type { CropOrCargo } from '@/types/domain';

export function BusinessCorridorsPage() {
  const nodes = useAppStore((s) => s.nodes);
  const businesses = useAppStore((s) => s.businesses);
  const transporters = useAppStore((s) => s.transporters);
  const vehicles = useAppStore((s) => s.vehicles);
  const returnLegOffers = useAppStore((s) => s.returnLegOffers);
  const currentAccountId = useAppStore((s) => s.currentAccountId);
  const prebookReturnLegCapacity = useAppStore((s) => s.prebookReturnLegCapacity);

  const activeBiz =
    businesses.find((b) => b.accountId === currentAccountId) ?? businesses[0];

  const [originNodeId, setOriginNodeId] = useState('d_kolar_agro');
  const [destNodeId, setDestNodeId] = useState('v_srinivaspur');
  const [cargo, setCargo] = useState<CropOrCargo>('fertiliser');
  const [weightQuintals, setWeightQuintals] = useState(16);
  const [dispatchDate, setDispatchDate] = useState(
    new Date(Date.now() + 86_400_000).toISOString().slice(0, 10),
  );

  const origNode = nodes.find((n) => n.id === originNodeId) ?? nodes[0];
  const destNode = nodes.find((n) => n.id === destNodeId) ?? nodes[1];
  const distKm = roadDistanceKm(origNode, destNode, 1.32);
  const standardRatePerQtl = Math.max(78, Math.round(48 + distKm * 1.45));
  const tourDiscountedRate = Math.round(standardRatePerQtl * 0.78);

  const matchingReturningVehicles = useMemo(
    () =>
      vehicles
        .filter((v) => v.capacityQuintals >= weightQuintals * 0.75)
        .slice(0, 5)
        .map((v) => ({
          vehicle: v,
          owner: transporters.find((t) => t.id === v.transporterId) ?? transporters[0],
          homeName: nodes.find((n) => n.id === v.homeVillageId)?.name ?? 'Srinivaspur',
        })),
    [vehicles, transporters, nodes, weightQuintals],
  );

  const handlePrebook = async (e: React.FormEvent) => {
    e.preventDefault();
    await prebookReturnLegCapacity({
      businessId: activeBiz.id,
      businessName: activeBiz.name,
      cargo,
      weightQuintals,
      originNodeId,
      destinationNodeId: destNodeId,
      ratePerQuintalInr: tourDiscountedRate,
    });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-ink">
            <Building2 className="h-3.5 w-3.5 text-primary-strong" /> {activeBiz.name} • GSTIN {activeBiz.gstin}
          </span>
          <h1 className="mt-1.5 text-2xl font-extrabold text-ink sm:text-3xl">
            Pre-Book Return-Leg Capacity (22% Tour Discount)
          </h1>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Pre-Book Return Corridor Form */}
        <form
          onSubmit={handlePrebook}
          className="space-y-4 rounded-3xl border border-border bg-surface p-6 shadow-soft lg:col-span-6"
        >
          <h2 className="text-base font-extrabold text-ink">
            Reserve Empty Homeward Beds on Mandi Vehicles
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="biz-orig" className="text-[11px] font-bold uppercase text-ink-muted">
                Loading Hub / Mandi
              </label>
              <select
                id="biz-orig"
                value={originNodeId}
                onChange={(e) => setOriginNodeId(e.target.value)}
                className="mt-1 min-h-[44px] w-full rounded-xl border border-border bg-surface-2 px-3 text-xs font-bold text-ink"
              >
                {nodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="biz-dest" className="text-[11px] font-bold uppercase text-ink-muted">
                Village / Taluka Destination
              </label>
              <select
                id="biz-dest"
                value={destNodeId}
                onChange={(e) => setDestNodeId(e.target.value)}
                className="mt-1 min-h-[44px] w-full rounded-xl border border-border bg-surface-2 px-3 text-xs font-bold text-ink"
              >
                {nodes.filter((n) => n.kind === 'village' || n.kind === 'factory').map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name} ({n.taluka})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="biz-cargo" className="text-[11px] font-bold uppercase text-ink-muted">
                Cargo Type (Cleaned Return Bed)
              </label>
              <select
                id="biz-cargo"
                value={cargo}
                onChange={(e) => setCargo(e.target.value as CropOrCargo)}
                className="mt-1 min-h-[44px] w-full rounded-xl border border-border bg-surface-2 px-3 text-xs font-bold text-ink"
              >
                {(['fertiliser', 'poultry_feed', 'crates_packaging', 'tomato', 'potato', 'ragi'] as CropOrCargo[]).map(
                  (c) => (
                    <option key={c} value={c}>
                      {CARGO_CATALOG[c].labelEn}
                    </option>
                  ),
                )}
              </select>
            </div>
            <div>
              <label htmlFor="biz-date" className="text-[11px] font-bold uppercase text-ink-muted">
                Dispatch Date
              </label>
              <input
                id="biz-date"
                type="date"
                value={dispatchDate}
                onChange={(e) => setDispatchDate(e.target.value)}
                className="mt-1 min-h-[44px] w-full rounded-xl border border-border bg-surface-2 px-3 text-xs font-bold text-ink"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold">
              <span>Lot Volume</span>
              <span className="font-bold text-primary-strong">{weightQuintals} quintals</span>
            </div>
            <input
              type="range"
              min={5}
              max={42}
              value={weightQuintals}
              onChange={(e) => setWeightQuintals(Number(e.target.value))}
              aria-label="Return lot volume in quintals"
              className="mt-1.5 w-full accent-primary"
            />
          </div>

          <div className="rounded-2xl bg-surface-2 p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-ink-muted">Tour-Discounted Rate</span>
              <div className="font-heading text-2xl font-extrabold text-primary-strong">
                ₹{tourDiscountedRate}/qtl{' '}
                <span className="text-xs font-normal text-ink-muted line-through">
                  ₹{standardRatePerQtl}/qtl
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-ink-muted">Total Offer</span>
              <div className="font-heading text-2xl font-extrabold text-ink">
                <AnimatedNumber value={tourDiscountedRate * weightQuintals} prefix="₹" />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-extrabold text-white shadow-soft hover:bg-primary-strong"
          >
            <CheckCircle2 className="h-4 w-4" /> Publish Pre-Booked Return Capacity
          </button>
        </form>

        {/* Matching Returning Transporters + Active Return Offers */}
        <div className="space-y-4 lg:col-span-6">
          <div className="rounded-3xl border border-border bg-surface p-5 shadow-soft">
            <h2 className="text-base font-extrabold text-ink">
              Transporters Returning Along {destNode.name} Corridor
            </h2>
            <div className="mt-3 space-y-2.5">
              {matchingReturningVehicles.map(({ vehicle, owner, homeName }) => (
                <div
                  key={vehicle.id}
                  className="flex items-center justify-between rounded-2xl border border-border bg-surface-2/65 p-3 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <Truck className="h-4 w-4 text-primary-strong" />
                    <div>
                      <div className="font-extrabold text-ink">
                        {vehicle.plate} • {vehicle.typeName}
                      </div>
                      <div className="text-ink-muted">
                        {owner.name} • Home base: {homeName} • {vehicle.capacityQuintals} qtl bed
                      </div>
                    </div>
                  </div>
                  <span className="rounded-lg bg-primary-100 px-2.5 py-1 text-[10px] font-extrabold text-primary-strong">
                    {owner.reliabilityScore}% Reliable
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-surface p-5 shadow-soft">
            <h3 className="text-sm font-extrabold text-ink">
              Your Listed Return-Leg Slots ({returnLegOffers.length})
            </h3>
            <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
              {returnLegOffers.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-xl border border-border bg-bg p-3 text-xs">
                  <div>
                    <span className="font-extrabold text-ink">
                      {CARGO_CATALOG[r.cargo].labelEn} ({r.weightQuintals} qtl)
                    </span>
                    <div className="text-[11px] text-ink-muted">
                      ₹{r.ratePerQuintalInr}/qtl • Total ₹{r.totalOfferInr}
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                      r.status === 'attached'
                        ? 'bg-primary-100 text-primary-strong'
                        : 'bg-sky-100 text-ink'
                    }`}
                  >
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function BusinessStandingCsvPage() {
  const nodes = useAppStore((s) => s.nodes);
  const businesses = useAppStore((s) => s.businesses);
  const standingOrders = useAppStore((s) => s.standingOrders);
  const toggleStandingOrder = useAppStore((s) => s.toggleStandingOrder);
  const createStandingOrder = useAppStore((s) => s.createStandingOrder);
  const bulkImportBusinessLoads = useAppStore((s) => s.bulkImportBusinessLoads);

  const activeBiz = businesses[0];
  const [cargo, setCargo] = useState<CropOrCargo>('fertiliser');
  const [destId, setDestId] = useState('v_srinivaspur');
  const [freq, setFreq] = useState<'daily' | 'twice_weekly' | 'weekly'>('twice_weekly');
  const [quintals, setQuintals] = useState(18);

  const [csvText, setCsvText] = useState(
    'cargo,weight_quintals,origin_id,destination_id\nfertiliser,15,d_kolar_agro,v_srinivaspur\ncrates_packaging,12,c_narasapura_cold,v_vemgal\npoultry_feed,20,f_malur_feed,v_bangarapet',
  );

  const parsedCsvRows = useMemo(() => {
    const lines = csvText
      .trim()
      .split(/\r?\n/)
      .filter((l) => l.trim().length > 0);
    const dataLines = lines[0]?.toLowerCase().includes('cargo') ? lines.slice(1) : lines;
    return dataLines
      .map((ln) => {
        const [c, w, orig, dest] = ln.split(',').map((s) => s.trim());
        const validCargo = (c in CARGO_CATALOG ? c : 'fertiliser') as CropOrCargo;
        return {
          crop: validCargo,
          weightQuintals: Math.max(1, Number(w) || 12),
          originNodeId: nodes.some((n) => n.id === orig) ? orig : 'd_kolar_agro',
          destinationNodeId: nodes.some((n) => n.id === dest) ? dest : 'v_srinivaspur',
        };
      });
  }, [csvText, nodes]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCsvText(String(reader.result ?? ''));
    };
    reader.readAsText(file);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Standing Orders */}
        <div className="space-y-4 rounded-3xl border border-border bg-surface p-6 shadow-soft lg:col-span-6">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary-strong" />
            <h1 className="text-lg font-extrabold text-ink">Recurring Standing Orders</h1>
          </div>

          <div className="space-y-2.5">
            {standingOrders.map((so) => {
              const orig = nodes.find((n) => n.id === so.originNodeId)?.name ?? so.originNodeId;
              const dest = nodes.find((n) => n.id === so.destinationNodeId)?.name ?? so.destinationNodeId;
              return (
                <div
                  key={so.id}
                  className="flex items-center justify-between rounded-2xl border border-border bg-surface-2/70 p-3.5 text-xs"
                >
                  <div>
                    <div className="font-extrabold text-ink">
                      {CARGO_CATALOG[so.cargo].labelEn} • {so.quintalsPerRun} qtl ({so.frequency.replace('_', ' ')})
                    </div>
                    <div className="text-ink-muted">
                      {orig} → {dest}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleStandingOrder(so.id)}
                    className={`min-h-[36px] rounded-xl px-3 py-1.5 text-xs font-extrabold ${
                      so.active ? 'bg-primary text-white' : 'border border-border bg-surface text-ink-muted'
                    }`}
                  >
                    {so.active ? 'Active' : 'Paused'}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="border-t border-border pt-4">
            <h2 className="text-xs font-bold uppercase text-ink-muted">Add Standing Corridor Order</h2>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <select
                aria-label="Cargo"
                value={cargo}
                onChange={(e) => setCargo(e.target.value as CropOrCargo)}
                className="min-h-[42px] rounded-xl border border-border bg-surface-2 px-2 text-xs font-bold"
              >
                <option value="fertiliser">Fertiliser</option>
                <option value="poultry_feed">Poultry Feed</option>
                <option value="crates_packaging">Crates</option>
              </select>
              <select
                aria-label="Destination"
                value={destId}
                onChange={(e) => setDestId(e.target.value)}
                className="min-h-[42px] rounded-xl border border-border bg-surface-2 px-2 text-xs font-bold"
              >
                {nodes.filter((n) => n.kind === 'village').map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
              <select
                aria-label="Frequency"
                value={freq}
                onChange={(e) => setFreq(e.target.value as 'daily' | 'twice_weekly' | 'weekly')}
                className="min-h-[42px] rounded-xl border border-border bg-surface-2 px-2 text-xs font-bold"
              >
                <option value="daily">Daily</option>
                <option value="twice_weekly">Twice Weekly</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
            <div className="mt-2 flex gap-2">
              <input
                type="number"
                value={quintals}
                onChange={(e) => setQuintals(Number(e.target.value))}
                aria-label="Quintals per run"
                className="min-h-[42px] w-28 rounded-xl border border-border bg-surface-2 px-3 text-xs font-bold"
              />
              <button
                type="button"
                onClick={() =>
                  createStandingOrder({
                    businessId: activeBiz.id,
                    cargo,
                    originNodeId: 'd_kolar_agro',
                    destinationNodeId: destId,
                    frequency: freq,
                    quintalsPerRun: quintals,
                  })
                }
                className="inline-flex min-h-[42px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-ink px-4 text-xs font-extrabold text-white"
              >
                <Plus className="h-4 w-4" /> Save Standing Schedule
              </button>
            </div>
          </div>
        </div>

        {/* Bulk CSV Upload & Live Parse Preview */}
        <div className="space-y-4 rounded-3xl border border-border bg-surface p-6 shadow-soft lg:col-span-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-extrabold text-ink">Bulk CSV Manifest Upload & Preview</h2>
            <label className="inline-flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-xl border border-primary bg-primary-100 px-3.5 py-2 text-xs font-bold text-primary-strong">
              <FileUp className="h-4 w-4" />
              <span>Choose .CSV File</span>
              <input type="file" accept=".csv,text/csv" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          <textarea
            rows={4}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            aria-label="CSV manifest rows"
            className="w-full rounded-2xl border border-border bg-surface-2 p-3 font-mono text-xs text-ink"
          />

          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-2 text-[10px] uppercase text-ink-muted">
                <tr>
                  <th className="px-3 py-2">Cargo</th>
                  <th className="px-3 py-2">Quintals</th>
                  <th className="px-3 py-2">Origin</th>
                  <th className="px-3 py-2">Destination</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {parsedCsvRows.map((row, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-2 font-bold">{CARGO_CATALOG[row.crop].labelEn}</td>
                    <td className="px-3 py-2">{row.weightQuintals} qtl</td>
                    <td className="px-3 py-2">{nodes.find((n) => n.id === row.originNodeId)?.name}</td>
                    <td className="px-3 py-2">{nodes.find((n) => n.id === row.destinationNodeId)?.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={() =>
              bulkImportBusinessLoads(parsedCsvRows, activeBiz.name, activeBiz.phone)
            }
            className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl bg-primary text-xs font-extrabold text-white hover:bg-primary-strong"
          >
            <CheckCircle2 className="h-4 w-4" /> Queue {parsedCsvRows.length} Parsed Shipments into Corridor Pools
          </button>
        </div>
      </div>
    </div>
  );
}

export function BusinessInvoicesPage() {
  const ledger = useAppStore((s) => s.ledger);
  const nodes = useAppStore((s) => s.nodes);

  const corridorChartData = useMemo(
    () =>
      nodes
        .filter((n) => ['v_srinivaspur', 'v_mulbagal', 'v_malur', 'v_vemgal', 'v_bangarapet', 'v_chintamani'].includes(n.id))
        .map((n, idx) => ({
          corridor: n.name,
          outboundProduceQtl: n.baseDemandQuintals * 4,
          returnInputsQtl: Math.round(n.baseDemandQuintals * (1.8 + (idx % 3) * 0.3)),
        })),
    [nodes],
  );

  const invoices = ledger.slice(0, 10);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <div className="rounded-3xl border border-border bg-surface p-6 shadow-soft">
        <h1 className="text-lg font-extrabold text-ink">
          Bi-Directional Corridor Balance (Outbound Harvest vs. Return Inputs)
        </h1>
        <div className="mt-4 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={corridorChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E1EBE4" />
              <XAxis dataKey="corridor" tick={{ fontSize: 11, fill: '#5C6F65' }} />
              <YAxis tick={{ fontSize: 11, fill: '#5C6F65' }} />
              <Tooltip />
              <Bar dataKey="outboundProduceQtl" name="Outbound Produce (qtl)" fill="#3FA374" radius={[6, 6, 0, 0]} />
              <Bar dataKey="returnInputsQtl" name="Return-Leg Inputs (qtl)" fill="#7CC6E8" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-surface p-6 shadow-soft">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-ink">GST Freight Invoices & Escrow Settlements</h2>
          <button
            type="button"
            onClick={() =>
              downloadCsvFile(
                'HarvestHaul-Business-Invoices.csv',
                ['Date', 'Pool Code', 'Party', 'Kind', 'Amount INR', 'UPI Ref'],
                invoices.map((i) => [i.timestamp, i.poolCode, i.partyName, i.kind, i.amountInr, i.upiRef]),
              )
            }
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-border bg-surface-2 px-3.5 text-xs font-bold text-ink"
          >
            <Download className="h-4 w-4 text-primary-strong" /> Export GST CSV
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-2 text-[11px] uppercase text-ink-muted">
              <tr>
                <th className="px-3 py-2.5">Invoice / Pool</th>
                <th className="px-3 py-2.5">Counterparty</th>
                <th className="px-3 py-2.5">Amount</th>
                <th className="px-3 py-2.5">Reference</th>
                <th className="px-3 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td className="px-3 py-2.5 font-bold text-ink">{inv.poolCode}</td>
                  <td className="px-3 py-2.5">{inv.partyName}</td>
                  <td className="px-3 py-2.5 font-bold">₹{inv.amountInr}</td>
                  <td className="px-3 py-2.5 font-mono text-[11px]">{inv.upiRef}</td>
                  <td className="px-3 py-2.5">
                    <span className="rounded-full bg-primary-100 px-2.5 py-0.5 text-[10px] font-bold text-primary-strong">
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
