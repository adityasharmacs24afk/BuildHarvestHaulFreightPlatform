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
  CheckCheck,
  Languages,
  Send,
  Sprout,
  UserPlus,
  Users,
  Vote,
} from 'lucide-react';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { VoiceWaveformWidget } from '@/components/ui/VoiceWaveformModal';
import { CARGO_CATALOG } from '@/engine/compatibility';
import { parseVoiceBookingInput } from '@/engine/voiceParser';
import { pushToast } from '@/services/eventBus';
import { useAppStore } from '@/stores/useAppStore';
import type { CropOrCargo, SplitRule } from '@/types/domain';

export function FpoMembersPage() {
  const fpos = useAppStore((s) => s.fpos);
  const farmers = useAppStore((s) => s.farmers);
  const nodes = useAppStore((s) => s.nodes);
  const language = useAppStore((s) => s.language);
  const voicePhrases = useAppStore((s) => s.voicePhrases);
  const createLoadAndPool = useAppStore((s) => s.createLoadAndPool);

  const activeFpo = fpos[0];
  const [cropFilter, setCropFilter] = useState<string>('all');
  const [comfortFilter, setComfortFilter] = useState<string>('all');
  const [selectedFarmerId, setSelectedFarmerId] = useState<string>(farmers[0].id);
  const [voiceNote, setVoiceNote] = useState('16 quintal tomato tomorrow morning Kolar APMC');
  const [invitePhone, setInvitePhone] = useState('+91 90001 99210');

  const filteredMembers = useMemo(
    () =>
      farmers.filter((f) => {
        if (cropFilter !== 'all' && !f.primaryCrops.includes(cropFilter as CropOrCargo)) return false;
        if (comfortFilter !== 'all' && f.digitalComfort !== comfortFilter) return false;
        return true;
      }),
    [farmers, cropFilter, comfortFilter],
  );

  const targetFarmer = farmers.find((f) => f.id === selectedFarmerId) ?? farmers[0];
  const parsed = useMemo(
    () => parseVoiceBookingInput(voiceNote, nodes, targetFarmer.villageId, 'm_kolar_apmc'),
    [voiceNote, nodes, targetFarmer.villageId],
  );

  const handleBookForMember = async () => {
    await createLoadAndPool({
      shipperId: targetFarmer.id,
      shipperName: targetFarmer.name,
      shipperPhone: targetFarmer.phone,
      shipperRole: 'fpo',
      crop: parsed.crop,
      weightQuintals: parsed.weightQuintals,
      unitLabel: parsed.unitLabel,
      pickupNodeId: targetFarmer.villageId,
      dropNodeId: parsed.dropNodeId,
      maxWaitHours: 3,
      minDiscountPct: 16,
      freshnessScore: 89,
    });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-border bg-surface p-5 shadow-soft">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-100 px-3 py-1 text-xs font-bold text-primary-strong">
            <Users className="h-3.5 w-3.5" /> {activeFpo.name} ({activeFpo.regNumber})
          </span>
          <h1 className="mt-1.5 text-2xl font-extrabold text-ink">
            Member Directory & Coordinator Assisted Booking
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="tel"
            value={invitePhone}
            onChange={(e) => setInvitePhone(e.target.value)}
            aria-label="Member phone to invite"
            className="min-h-[40px] rounded-xl border border-border bg-surface-2 px-3 text-xs font-bold"
          />
          <button
            type="button"
            onClick={() =>
              pushToast('FPO Invite Sent', `Sent Kannada & English voice onboarding link to ${invitePhone}.`, 'success')
            }
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-ink px-3.5 text-xs font-extrabold text-white"
          >
            <UserPlus className="h-3.5 w-3.5" /> Invite Grower
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Member Directory */}
        <div className="space-y-4 rounded-3xl border border-border bg-surface p-5 shadow-soft lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-extrabold text-ink">
              Grower Roster ({filteredMembers.length} Matching)
            </h2>
            <div className="flex gap-2">
              <select
                aria-label="Filter by crop"
                value={cropFilter}
                onChange={(e) => setCropFilter(e.target.value)}
                className="min-h-[38px] rounded-xl border border-border bg-surface-2 px-2.5 text-xs font-bold"
              >
                <option value="all">All Crops</option>
                <option value="tomato">Tomato</option>
                <option value="potato">Potato</option>
                <option value="beans">Beans</option>
                <option value="mango">Mango</option>
                <option value="flowers">Flowers</option>
              </select>
              <select
                aria-label="Filter by digital comfort"
                value={comfortFilter}
                onChange={(e) => setComfortFilter(e.target.value)}
                className="min-h-[38px] rounded-xl border border-border bg-surface-2 px-2.5 text-xs font-bold"
              >
                <option value="all">All Access Modes</option>
                <option value="voice_only">Voice Only</option>
                <option value="assisted">Assisted</option>
                <option value="smartphone">Smartphone</option>
              </select>
            </div>
          </div>

          <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
            {filteredMembers.slice(0, 24).map((m) => {
              const vName = nodes.find((n) => n.id === m.villageId)?.name ?? 'Vemgal';
              const isSelected = m.id === targetFarmer.id;
              return (
                <div
                  key={m.id}
                  onClick={() => setSelectedFarmerId(m.id)}
                  className={`flex cursor-pointer items-center justify-between rounded-2xl border p-3 text-xs transition-colors ${
                    isSelected
                      ? 'border-primary bg-primary-100/60'
                      : 'border-border bg-bg hover:bg-surface-2'
                  }`}
                >
                  <div>
                    <div className="font-extrabold text-ink">
                      {m.name} • {vName} ({m.landAcres} acres)
                    </div>
                    <div className="mt-0.5 text-[11px] text-ink-muted">
                      {m.primaryCrops.map((c) => CARGO_CATALOG[c].labelEn).join(', ')} • {m.digitalComfort.replace('_', ' ')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-primary-strong">₹{m.totalSavedInr.toLocaleString('en-IN')} saved</div>
                    <span className="text-[10px] text-ink-muted">{m.completedShipments} trips</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Book on Behalf of Member */}
        <div className="space-y-4 rounded-3xl border border-primary/35 bg-surface p-5 shadow-soft lg:col-span-5">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase text-primary-strong">
            <Sprout className="h-4 w-4" /> Book On Behalf Of Member
          </span>
          <h2 className="text-lg font-extrabold text-ink">
            Booking for {targetFarmer.name}
          </h2>

          <VoiceWaveformWidget
            language={language}
            phrases={voicePhrases.filter((p) => p.role === 'farmer')}
            value={voiceNote}
            onChange={setVoiceNote}
            label="Speak or type member’s harvest lot"
          />

          <div className="rounded-2xl bg-surface-2 p-3.5 text-xs space-y-1">
            <div>
              <strong>Parsed Lot:</strong> {parsed.weightQuintals} qtl {CARGO_CATALOG[parsed.crop].labelEn}
            </div>
            <div>
              <strong>Destination:</strong> {nodes.find((n) => n.id === parsed.dropNodeId)?.name}
            </div>
          </div>

          <button
            type="button"
            onClick={handleBookForMember}
            className="min-h-[48px] w-full rounded-2xl bg-primary px-5 text-sm font-extrabold text-white shadow-soft hover:bg-primary-strong"
          >
            Add {targetFarmer.name.split(' ')[0]}’s Lot to FPO Collective Pool
          </button>
        </div>
      </div>
    </div>
  );
}

export function FpoPoolsAnalyticsPage() {
  const fpos = useAppStore((s) => s.fpos);
  const farmers = useAppStore((s) => s.farmers);
  const setFpoPreferredSplitRule = useAppStore((s) => s.setFpoPreferredSplitRule);

  const activeFpo = fpos[0];
  const chartData = farmers.slice(0, 8).map((f) => ({
    member: f.name.split(' ')[0],
    savedInr: f.totalSavedInr,
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-border bg-surface p-5 shadow-soft">
          <span className="text-xs text-ink-muted">Collective Volume Pooled</span>
          <div className="mt-1 font-heading text-3xl font-extrabold text-ink">
            <AnimatedNumber value={activeFpo.totalPooledQuintals} suffix=" qtl" />
          </div>
        </div>
        <div className="rounded-3xl border border-primary/40 bg-primary-100/55 p-5 shadow-soft">
          <span className="text-xs font-semibold text-primary-strong">Verified Member Freight Savings</span>
          <div className="mt-1 font-heading text-3xl font-extrabold text-primary-strong">
            <AnimatedNumber value={activeFpo.memberSavingsInr} prefix="₹" />
          </div>
        </div>
        <div className="rounded-3xl border border-border bg-surface p-5 shadow-soft">
          <span className="text-xs text-ink-muted">Voted FPO Split Rule</span>
          <div className="mt-1 font-heading text-2xl font-extrabold uppercase text-ink">
            {activeFpo.preferredSplitRule}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="rounded-3xl border border-border bg-surface p-6 shadow-soft lg:col-span-7">
          <h2 className="text-base font-extrabold text-ink">Member Freight Savings vs. Solo Tempo Hire (₹)</h2>
          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E1EBE4" />
                <XAxis dataKey="member" tick={{ fontSize: 11, fill: '#5C6F65' }} />
                <YAxis tick={{ fontSize: 11, fill: '#5C6F65' }} />
                <Tooltip formatter={(v: any) => [`₹${v}`, 'Freight Saved']} />
                <Bar dataKey="savedInr" fill="#3FA374" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-surface p-6 shadow-soft lg:col-span-5">
          <div className="flex items-center gap-2">
            <Vote className="h-5 w-5 text-primary-strong" />
            <h2 className="text-base font-extrabold text-ink">FPO Board Split-Rule Resolution</h2>
          </div>
          <p className="mt-1 text-xs text-ink-muted">
            Select the collective default cost-sharing rule applied when {activeFpo.name} dispatches group vehicles:
          </p>
          <div className="mt-4 space-y-2.5">
            {(['shapley', 'weight', 'distance', 'equal'] as SplitRule[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setFpoPreferredSplitRule(activeFpo.id, r)}
                className={`flex w-full items-center justify-between rounded-2xl border p-3.5 text-left text-xs font-bold ${
                  activeFpo.preferredSplitRule === r
                    ? 'border-primary bg-primary-100 text-primary-strong'
                    : 'border-border bg-surface-2 text-ink'
                }`}
              >
                <span className="uppercase">{r} Split</span>
                <span>{activeFpo.preferredSplitRule === r ? 'Active Collective Standard' : 'Adopt Rule'}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function FpoBroadcastPage() {
  const fpos = useAppStore((s) => s.fpos);
  const fpoAnnouncements = useAppStore((s) => s.fpoAnnouncements);
  const sendFpoAnnouncement = useAppStore((s) => s.sendFpoAnnouncement);

  const activeFpo = fpos[0];
  const [title, setTitle] = useState('Tomorrow 6:15 AM Shared Eicher to Bengaluru KR Market');
  const [bodyEn, setBodyEn] = useState(
    'Members harvesting beans, capsicum, or tomato can drop crates at Vemgal Packhouse by 6:00 AM for 24% lower pooled fare.',
  );
  const [bodyHi, setBodyHi] = useState(
    'बीन्स, शिमला मिर्च या टमाटर वाले सदस्य कल सुबह 6:00 बजे तक वेमगल पैकहाउस पर क्रेट लाकर 24% कम साझा किराये का लाभ उठाएं।',
  );
  const [bodyKn, setBodyKn] = useState(
    'ಹುರಳಿಕಾಯಿ, ದೊಣ್ಣಮೆಣಸಿನಕಾಯಿ ಅಥವಾ ಟೊಮೆಟೊ ಕೊಯ್ಲು ಮಾಡುವ ಸದಸ್ಯರು ನಾಳೆ ಬೆಳಿಗ್ಗೆ 6:00 ಗಂಟೆಯೊಳಗೆ ವೇಮಗಲ್ ಪ್ಯಾಕ್‌ಹೌಸ್‌ಗೆ ತಂದು ಶೇ. 24 ರಷ್ಟು ಬಾಡಿಗೆ ಉಳಿಸಿ.',
  );

  const handleAutoTranslate = () => {
    setBodyHi(`सूचना (${title}): वेमगल एवं आसपास के सभी सदस्य समय पर क्रेट पैकहाउस पहुंचाएं; वापसी लोड छूट लागू है।`);
    setBodyKn(`ಪ್ರಕಟಣೆ (${title}): ವೇಮಗಲ್ ಮತ್ತು ಸುತ್ತಮುತ್ತಲಿನ ಎಲ್ಲಾ ಸದಸ್ಯರು ಸಮಯಕ್ಕೆ ಸರಿಯಾಗಿ ಕ್ರೇಟ್ ತಲುಪಿಸಿ; ಮರುಪ್ರಯಾಣದ ರಿಯಾಯಿತಿ ಲಭ್ಯವಿದೆ.`);
    pushToast('Translated to Hindi & Kannada', 'Local-script member messages updated.', 'info');
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    sendFpoAnnouncement({ fpoId: activeFpo.id, title, bodyEn, bodyHi, bodyKn });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <div className="grid gap-6 lg:grid-cols-12">
        <form
          onSubmit={handleSend}
          className="space-y-4 rounded-3xl border border-border bg-surface p-6 shadow-soft lg:col-span-7"
        >
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-extrabold text-ink">Compose Multilingual Member Broadcast</h1>
            <button
              type="button"
              onClick={handleAutoTranslate}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-primary bg-primary-100 px-3 text-xs font-bold text-primary-strong"
            >
              <Languages className="h-3.5 w-3.5" /> Sync Hindi & Kannada
            </button>
          </div>

          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-label="Announcement title"
            className="min-h-[44px] w-full rounded-xl border border-border bg-surface-2 px-3.5 text-xs font-bold text-ink"
          />
          <textarea
            rows={2}
            value={bodyEn}
            onChange={(e) => setBodyEn(e.target.value)}
            aria-label="English message"
            className="w-full rounded-xl border border-border bg-surface-2 p-3 text-xs text-ink"
          />
          <textarea
            rows={2}
            value={bodyKn}
            onChange={(e) => setBodyKn(e.target.value)}
            aria-label="Kannada message"
            className="w-full rounded-xl border border-border bg-surface-2 p-3 text-xs text-ink"
          />
          <textarea
            rows={2}
            value={bodyHi}
            onChange={(e) => setBodyHi(e.target.value)}
            aria-label="Hindi message"
            className="w-full rounded-xl border border-border bg-surface-2 p-3 text-xs text-ink"
          />

          <button
            type="submit"
            className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-primary text-xs font-extrabold text-white hover:bg-primary-strong"
          >
            <Send className="h-4 w-4" /> Send to {activeFpo.memberCount} Members (Voice Call + Chat)
          </button>
        </form>

        <div className="space-y-3 rounded-3xl border border-border bg-surface p-6 shadow-soft lg:col-span-5">
          <h2 className="text-base font-extrabold text-ink">Sent Broadcasts & Read Receipts</h2>
          {fpoAnnouncements.map((ann) => (
            <div key={ann.id} className="rounded-2xl border border-border bg-bg p-4 text-xs space-y-2">
              <div className="font-extrabold text-ink">{ann.title}</div>
              <p className="text-ink-muted">{ann.bodyKn}</p>
              <p className="text-ink-muted">{ann.bodyEn}</p>
              <div className="flex items-center justify-between border-t border-border pt-2 text-[11px] font-bold text-primary-strong">
                <span className="inline-flex items-center gap-1">
                  <CheckCheck className="h-3.5 w-3.5" /> Delivered: {ann.deliveredCount}
                </span>
                <span>Read / Listened: {ann.readCount}/{ann.deliveredCount}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
