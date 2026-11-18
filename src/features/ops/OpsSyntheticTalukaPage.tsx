import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  AlertOctagon,
  CheckCircle2,
  GitCompare,
  Mic,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Volume2,
  Wand2,
} from 'lucide-react';
import type { LanguageCode } from '@/app/constants';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import {
  evaluatePolicyOnTaluka,
  runRedTeamSimulation,
  simulateThirtyDayTrajectory,
} from '@/engine/behaviour';
import { speakTextAloud } from '@/services/pdfExport';
import { useAppStore } from '@/stores/useAppStore';
import type { PersonaTraitSet } from '@/types/domain';

const PRESET_DECISIONS = [
  'Add a ₹200 fee when a transporter cancels',
  'Charge shippers by weight share instead of equal split',
  'Make shippers wait up to 3 hours for a 30 percent discount',
];

const TRAIT_LABELS: { key: keyof PersonaTraitSet; label: string }[] = [
  { key: 'riskAppetite', label: 'Risk Appetite' },
  { key: 'trustInStrangers', label: 'Trust in Strangers' },
  { key: 'priceSensitivity', label: 'Price Sensitivity' },
  { key: 'patience', label: 'Patience' },
  { key: 'loyalty', label: 'Loyalty' },
  { key: 'digitalComfort', label: 'Digital Comfort' },
  { key: 'literacy', label: 'Literacy' },
  { key: 'neighbourInfluence', label: 'Neighbour Influence' },
];

const NODE_POSITIONS: Record<string, { x: number; y: number }> = {
  p_sunita: { x: 250, y: 120 },
  p_ramesh: { x: 110, y: 75 },
  p_baldev: { x: 95, y: 185 },
  p_lakshmi: { x: 210, y: 235 },
  p_kavitha: { x: 350, y: 215 },
  p_priya: { x: 390, y: 105 },
  p_mohan: { x: 520, y: 130 },
  p_kiran: { x: 510, y: 235 },
  p_anwar: { x: 635, y: 95 },
  p_venkatesh: { x: 630, y: 215 },
};

export function OpsSyntheticTalukaPage() {
  const personas = useAppStore((s) => s.personas);
  const language = useAppStore((s) => s.language);
  const updatePersonaTrait = useAppStore((s) => s.updatePersonaTrait);
  const runSyntheticTalukaPolicy = useAppStore((s) => s.runSyntheticTalukaPolicy);

  const [mode, setMode] = useState<'judge' | 'red_team' | 'timelapse' | 'ab_duel' | 'voice_replay'>('judge');
  const [policyText, setPolicyText] = useState(PRESET_DECISIONS[0]);
  const [duelPolicyB, setDuelPolicyB] = useState(
    'Replace cancellation fee with a ₹250 5-trip reliability streak bonus, 1 breakdown grace pass per month, and paid standby retainers on high-risk routes (no rejection penalty).',
  );
  const [selectedPersonaId, setSelectedPersonaId] = useState(personas[0].id);
  const [voiceLang, setVoiceLang] = useState<LanguageCode>(language);

  const currentEval = useMemo(
    () => evaluatePolicyOnTaluka(policyText, personas),
    [policyText, personas],
  );
  const duelEvalB = useMemo(
    () => evaluatePolicyOnTaluka(duelPolicyB, personas),
    [duelPolicyB, personas],
  );
  const thirtyDayData = useMemo(
    () => simulateThirtyDayTrajectory(policyText, personas),
    [policyText, personas],
  );
  const redTeamCases = useMemo(() => runRedTeamSimulation(), []);

  const groupBreakdown = useMemo(() => {
    const groups = ['farmer', 'fpo', 'transporter', 'trader', 'input_dealer'] as const;
    return groups.map((g) => {
      const subset = currentEval.reactions.filter((r) => r.stakeholderGroup === g);
      const acc = subset.filter((r) => r.stance === 'accept').length;
      return {
        group: g.replace('_', ' ').toUpperCase(),
        acceptancePct: subset.length > 0 ? Math.round((acc / subset.length) * 100) : 0,
      };
    });
  }, [currentEval]);

  const activePersona = personas.find((p) => p.id === selectedPersonaId) ?? personas[0];

  const handleApplySuggestedFix = async () => {
    const fix = currentEval.suggestedFixText;
    setPolicyText(fix);
    await runSyntheticTalukaPolicy(fix);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      {/* Header + Mandatory Directional Note */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-violet/35 bg-gradient-to-r from-violet-100/65 via-surface to-primary-100/45 p-6 shadow-soft">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet text-white px-3 py-1 text-xs font-extrabold">
              <Users className="h-3.5 w-3.5" /> Synthetic Taluka — Behavioural Policy Lab
            </span>
            <span className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold text-ink-muted">
              Simulated stakeholders. Results are directional.
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-extrabold text-ink">
            Test Pricing, Waiting & Cancellation Rules Before Rolling Out to Real Villages
          </h1>
        </div>

        {/* 5 Mode Switcher */}
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { id: 'judge', label: 'Judge Decision' },
              { id: 'red_team', label: 'Red-Team Defences' },
              { id: 'timelapse', label: '30-Day Time-Lapse' },
              { id: 'ab_duel', label: 'A/B Policy Duel' },
              { id: 'voice_replay', label: 'Voice Replay' },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className={`min-h-[38px] rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-colors ${
                mode === m.id
                  ? 'bg-ink text-white shadow-soft'
                  : 'border border-border bg-surface text-ink hover:bg-surface-2'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Policy Decision Input Box & Preset Chips */}
      <div className="rounded-3xl border border-border bg-surface p-5 shadow-soft">
        <label htmlFor="taluka-decision-input" className="text-xs font-extrabold uppercase tracking-wider text-ink-muted">
          Propose a Platform Rule or Pricing Decision (Type or Speak)
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            id="taluka-decision-input"
            type="text"
            value={policyText}
            onChange={(e) => setPolicyText(e.target.value)}
            className="min-h-[48px] flex-1 rounded-2xl border border-border bg-surface-2 px-4 text-sm font-semibold text-ink focus:bg-surface"
          />
          <button
            type="button"
            onClick={() => runSyntheticTalukaPolicy(policyText)}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-xs font-extrabold text-white hover:bg-primary-strong"
          >
            <Sparkles className="h-4 w-4" /> Evaluate Across 10 Personas
          </button>
          <button
            type="button"
            onClick={() => setPolicyText(PRESET_DECISIONS[0])}
            aria-label="Voice preset"
            className="inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-2xl border border-border bg-surface-2 px-3.5 text-xs font-bold text-ink"
          >
            <Mic className="h-4 w-4 text-primary" /> Voice Preset
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {PRESET_DECISIONS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setPolicyText(preset)}
              className={`rounded-xl border px-3 py-1.5 text-xs font-semibold ${
                policyText === preset
                  ? 'border-primary bg-primary-100 text-primary-strong'
                  : 'border-border bg-bg text-ink hover:border-primary/50'
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* MODE 1: JUDGE THIS DECISION + SOCIAL LAYER + 10 PERSONAS */}
      {mode === 'judge' && (
        <div className="space-y-6">
          {/* Judge KPI Summary + Suggested Fix */}
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="space-y-4 rounded-3xl border border-border bg-surface p-6 shadow-soft lg:col-span-6">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-2xl bg-surface-2 p-3.5">
                  <span className="text-[11px] font-bold uppercase text-ink-muted">Acceptance</span>
                  <div className="mt-1 font-heading text-3xl font-extrabold text-primary-strong">
                    <AnimatedNumber value={currentEval.acceptancePct} suffix="%" />
                  </div>
                </div>
                <div className="rounded-2xl bg-surface-2 p-3.5">
                  <span className="text-[11px] font-bold uppercase text-ink-muted">Perceived Fairness</span>
                  <div className="mt-1 font-heading text-3xl font-extrabold text-ink">
                    {currentEval.avgFairness}/5
                  </div>
                </div>
                <div className="rounded-2xl bg-surface-2 p-3.5">
                  <span className="text-[11px] font-bold uppercase text-ink-muted">Predicted Churn</span>
                  <div className="mt-1 font-heading text-3xl font-extrabold text-coral">
                    <AnimatedNumber value={currentEval.predictedChurnPct} suffix="%" />
                  </div>
                </div>
              </div>

              {/* Acceptance by Stakeholder Type Bar */}
              <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={groupBreakdown} layout="vertical" margin={{ left: 24, right: 12 }}>
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="group" tick={{ fontSize: 10, fill: '#1E2B25' }} width={90} />
                    <Tooltip formatter={(v: any) => [`${v}%`, 'Acceptance']} />
                    <Bar dataKey="acceptancePct" fill="#3FA374" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Objections & Unintended Consequences */}
              {currentEval.mainObjections.length > 0 && (
                <div>
                  <span className="text-[11px] font-bold uppercase text-ink-muted">Main Objections</span>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {currentEval.mainObjections.map((obj) => (
                      <span key={obj} className="rounded-lg bg-coral-100 px-2.5 py-1 text-[11px] font-semibold text-ink">
                        {obj}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-primary/40 bg-primary-100/55 p-4">
                <div className="text-xs font-extrabold text-primary-strong">
                  Suggested Policy Fix (Predicted to Lift Acceptance & Cut Churn)
                </div>
                <p className="mt-1 text-xs text-ink leading-relaxed">{currentEval.suggestedFixText}</p>
                <button
                  type="button"
                  onClick={handleApplySuggestedFix}
                  className="mt-3 inline-flex min-h-[42px] items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-extrabold text-white shadow-soft hover:bg-primary-strong"
                >
                  <Wand2 className="h-4 w-4" /> Apply Suggested Fix & Re-Run
                </button>
              </div>
            </div>

            {/* Animated Social Influence Network Graph */}
            <div className="rounded-3xl border border-border bg-surface p-6 shadow-soft lg:col-span-6">
              <h2 className="text-base font-extrabold text-ink">
                Social Word-of-Mouth & Tea-Stall Rumour Graph
              </h2>
              <p className="text-xs text-ink-muted">
                Coral links show frustrated operators spreading churn warnings; green links show FPO & neighbour endorsement.
              </p>

              <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-[#F4F9F6]">
                <svg viewBox="0 0 740 300" className="h-[260px] w-full">
                  {/* Social Edges */}
                  {personas.flatMap((p) =>
                    p.connectedPersonaIds.map((peerId) => {
                      if (p.id > peerId) return null;
                      const posA = NODE_POSITIONS[p.id];
                      const posB = NODE_POSITIONS[peerId];
                      if (!posA || !posB) return null;
                      const rA = currentEval.reactions.find((r) => r.personaId === p.id);
                      const negative = rA?.stance === 'reject';
                      return (
                        <line
                          key={`${p.id}_${peerId}`}
                          x1={posA.x}
                          y1={posA.y}
                          x2={posB.x}
                          y2={posB.y}
                          stroke={negative ? '#EF8A6B' : '#3FA374'}
                          strokeWidth={negative ? 3 : 2}
                          strokeDasharray={negative ? '6 4' : undefined}
                          opacity="0.7"
                        />
                      );
                    }),
                  )}

                  {/* Persona Nodes */}
                  {personas.map((p) => {
                    const pos = NODE_POSITIONS[p.id] ?? { x: 100, y: 100 };
                    const rx = currentEval.reactions.find((r) => r.personaId === p.id)!;
                    const fill =
                      rx.stance === 'accept'
                        ? '#3FA374'
                        : rx.stance === 'counter'
                          ? '#F6B93B'
                          : '#EF8A6B';
                    return (
                      <g
                        key={p.id}
                        transform={`translate(${pos.x}, ${pos.y})`}
                        onClick={() => setSelectedPersonaId(p.id)}
                        className="cursor-pointer"
                      >
                        {rx.stance === 'reject' && (
                          <circle r="24" fill="none" stroke="#EF8A6B" strokeWidth="2" className="pulse-ring" />
                        )}
                        <circle
                          r="18"
                          fill={fill}
                          stroke={selectedPersonaId === p.id ? '#1E2B25' : '#FFFFFF'}
                          strokeWidth="3"
                        />
                        <text y="4" textAnchor="middle" fontSize="10" fontWeight="800" fill="#FFFFFF">
                          {p.name.slice(0, 3)}
                        </text>
                        <text y="32" textAnchor="middle" fontSize="10" fontWeight="700" fill="#1E2B25">
                          {p.name} ({rx.stance})
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Unintended Consequences List */}
              <div className="mt-3 space-y-1.5">
                <span className="text-[11px] font-bold uppercase text-ink-muted">
                  Second-Order Consequences
                </span>
                {currentEval.unintendedConsequences.map((uc) => (
                  <div key={uc} className="rounded-xl bg-surface-2 px-3 py-2 text-xs text-ink">
                    • {uc}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 10 Persona Cards + Trait Sliders */}
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="grid gap-3 sm:grid-cols-2 lg:col-span-8">
              {personas.map((p) => {
                const rx = currentEval.reactions.find((r) => r.personaId === p.id)!;
                const badgeCls =
                  rx.stance === 'accept'
                    ? 'bg-primary-100 text-primary-strong'
                    : rx.stance === 'counter'
                      ? 'bg-accent-100 text-ink'
                      : 'bg-coral-100 text-ink';
                return (
                  <motion.div
                    key={p.id}
                    layout
                    onClick={() => setSelectedPersonaId(p.id)}
                    className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                      selectedPersonaId === p.id
                        ? 'border-primary bg-surface shadow-elevated'
                        : 'border-border bg-surface shadow-soft hover:border-primary/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-extrabold text-ink">
                          {p.name} • <span className="text-xs font-semibold text-ink-muted">{p.villageName}</span>
                        </div>
                        <div className="text-[11px] text-ink-muted">{p.archetype}</div>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase ${badgeCls}`}>
                        {rx.stance} ({rx.fairnessScore}/5)
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-ink leading-relaxed">“{rx.reasonEn}”</p>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-ink-muted">
                      <span>Churn risk: {rx.churnRiskPct}%</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          speakTextAloud(rx.reasonEn, 'en');
                        }}
                        className="inline-flex items-center gap-1 font-bold text-primary-strong hover:underline"
                      >
                        <Volume2 className="h-3.5 w-3.5" /> Speak
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Selected Persona 8-Trait Sliders */}
            <div className="rounded-3xl border border-border bg-surface p-5 shadow-soft lg:col-span-4">
              <h3 className="text-base font-extrabold text-ink">
                Tune {activePersona.name}’s Behavioural Traits
              </h3>
              <p className="mt-0.5 text-xs text-ink-muted">{activePersona.bio}</p>

              <div className="mt-4 space-y-3">
                {TRAIT_LABELS.map(({ key, label }) => (
                  <div key={key}>
                    <div className="flex justify-between text-xs font-semibold">
                      <span>{label}</span>
                      <span className="font-bold text-primary-strong">{activePersona.traits[key]}</span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={98}
                      value={activePersona.traits[key]}
                      onChange={(e) => updatePersonaTrait(activePersona.id, key, Number(e.target.value))}
                      aria-label={`${activePersona.name} ${label}`}
                      className="mt-1 w-full accent-primary"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: RED-TEAM ADVERSARIAL DEFENCE MODE */}
      {mode === 'red_team' && (
        <div className="grid gap-4 md:grid-cols-3">
          {redTeamCases.map((c) => (
            <div key={c.id} className="flex flex-col justify-between rounded-3xl border border-border bg-surface p-6 shadow-soft">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 rounded-full bg-coral-100 px-2.5 py-1 text-[10px] font-extrabold uppercase text-ink">
                    <AlertOctagon className="h-3.5 w-3.5 text-coral" /> Red-Team Attack
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary-100 px-2.5 py-1 text-[10px] font-extrabold uppercase text-primary-strong">
                    <ShieldCheck className="h-3.5 w-3.5" /> Neutralised
                  </span>
                </div>
                <h2 className="text-base font-extrabold text-ink">{c.title}</h2>
                <div className="text-xs font-semibold text-ink-muted">{c.adversaryPersona}</div>
                <p className="text-xs text-ink leading-relaxed">{c.vectorDescription}</p>
                <div className="rounded-2xl bg-primary-100/60 p-3 text-xs">
                  <strong className="text-primary-strong">Platform Defence Triggered:</strong>
                  <p className="mt-1 text-ink">{c.defenceTriggered}</p>
                </div>
              </div>
              <div className="mt-4 border-t border-border pt-3 text-xs font-semibold text-ink">
                <CheckCircle2 className="mr-1 inline h-4 w-4 text-primary-strong" />
                {c.auditOutcome}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODE 3: 30-DAY TIME-LAPSE */}
      {mode === 'timelapse' && (
        <div className="rounded-3xl border border-border bg-surface p-6 shadow-soft">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary-strong" />
            <h2 className="text-lg font-extrabold text-ink">
              30-Day Trust, Participation & Empty-Kilometre Trajectory
            </h2>
          </div>
          <div className="mt-4 h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={thirtyDayData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E1EBE4" />
                <XAxis dataKey="day" tickFormatter={(d) => `Day ${d}`} tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="trustScore" name="Village Trust Score" stroke="#3FA374" strokeWidth={3} />
                <Line type="monotone" dataKey="activeParticipationPct" name="Active Participation %" stroke="#9B8AE6" strokeWidth={2.5} />
                <Line type="monotone" dataKey="emptyKmPct" name="Empty Return km %" stroke="#EF8A6B" strokeWidth={2.5} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* MODE 4: A/B POLICY DUEL */}
      {mode === 'ab_duel' && (
        <div className="space-y-5 rounded-3xl border border-border bg-surface p-6 shadow-soft">
          <div className="flex items-center gap-2">
            <GitCompare className="h-5 w-5 text-primary-strong" />
            <h2 className="text-lg font-extrabold text-ink">A/B Policy Duel on Identical 10-Persona Taluka</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-surface-2 p-4">
              <span className="text-[11px] font-bold uppercase text-ink-muted">Rule A (Current Input)</span>
              <p className="mt-1 text-xs font-bold text-ink">{policyText}</p>
              <div className="mt-3 flex gap-4 text-xs">
                <span>Acceptance: <strong>{currentEval.acceptancePct}%</strong></span>
                <span>Fairness: <strong>{currentEval.avgFairness}/5</strong></span>
                <span>Churn: <strong>{currentEval.predictedChurnPct}%</strong></span>
              </div>
            </div>
            <div className="rounded-2xl border border-primary bg-primary-100/50 p-4">
              <span className="text-[11px] font-bold uppercase text-primary-strong">Rule B (Challenger)</span>
              <input
                type="text"
                value={duelPolicyB}
                onChange={(e) => setDuelPolicyB(e.target.value)}
                aria-label="Challenger policy rule B"
                className="mt-1 min-h-[38px] w-full rounded-xl border border-border bg-surface px-3 text-xs font-bold text-ink"
              />
              <div className="mt-3 flex gap-4 text-xs">
                <span>Acceptance: <strong className="text-primary-strong">{duelEvalB.acceptancePct}%</strong></span>
                <span>Fairness: <strong>{duelEvalB.avgFairness}/5</strong></span>
                <span>Churn: <strong>{duelEvalB.predictedChurnPct}%</strong></span>
              </div>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { metric: 'Acceptance %', ruleA: currentEval.acceptancePct, ruleB: duelEvalB.acceptancePct },
                  { metric: 'Fairness (x20)', ruleA: currentEval.avgFairness * 20, ruleB: duelEvalB.avgFairness * 20 },
                  { metric: 'Predicted Churn %', ruleA: currentEval.predictedChurnPct, ruleB: duelEvalB.predictedChurnPct },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E1EBE4" />
                <XAxis dataKey="metric" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="ruleA" name="Policy A" fill="#EF8A6B" radius={[6, 6, 0, 0]} />
                <Bar dataKey="ruleB" name="Policy B" fill="#3FA374" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* MODE 5: MULTILINGUAL VOICE REPLAY */}
      {mode === 'voice_replay' && (
        <div className="space-y-4 rounded-3xl border border-border bg-surface p-6 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-extrabold text-ink">
              Hear Stakeholder Reactions in English, Hindi & Kannada
            </h2>
            <div className="flex gap-2">
              {(
                [
                  { code: 'en', label: 'English' },
                  { code: 'kn', label: 'ಕನ್ನಡ (Kannada)' },
                  { code: 'hi', label: 'हिन्दी (Hindi)' },
                ] as const
              ).map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => setVoiceLang(l.code)}
                  className={`min-h-[38px] rounded-xl px-3.5 text-xs font-bold ${
                    voiceLang === l.code ? 'bg-primary text-white' : 'bg-surface-2 text-ink'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {currentEval.reactions.map((rx) => {
              const text =
                voiceLang === 'kn' ? rx.reasonKn : voiceLang === 'hi' ? rx.reasonHi : rx.reasonEn;
              return (
                <div key={rx.personaId} className="rounded-2xl border border-border bg-bg p-4 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-ink">
                      {rx.personaName} ({rx.archetype})
                    </span>
                    <button
                      type="button"
                      onClick={() => speakTextAloud(text, voiceLang)}
                      className="inline-flex min-h-[34px] items-center gap-1.5 rounded-xl bg-ink px-3 py-1 text-[11px] font-bold text-white hover:bg-primary-strong"
                    >
                      <Volume2 className="h-3.5 w-3.5" /> Speak ({voiceLang.toUpperCase()})
                    </button>
                  </div>
                  <p className="mt-2 leading-relaxed text-ink-muted">{text}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
