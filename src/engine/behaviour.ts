import type {
  PersonaReaction,
  PolicySimulationResult,
  SyntheticPersona,
} from '@/types/domain';

interface PolicyFeatures {
  hasTransporterPenalty: boolean;
  penaltyInr: number;
  hasCompletionBonus: boolean;
  hasWeightSplit: boolean;
  hasEqualSplit: boolean;
  hasShapleyOrOptIn: boolean;
  forcedWaitHours: number;
  discountPct: number;
  requiresAppOnly: boolean;
  hasStandbyRetainer: boolean;
}

export function extractPolicyFeatures(policyText: string): PolicyFeatures {
  const lower = policyText.toLowerCase();
  const feeMatch = lower.match(/₹\s*(\d+)|(\d+)\s*inr|(\d+)\s*rupee/);
  const numVal = feeMatch ? parseInt(feeMatch[1] || feeMatch[2] || feeMatch[3], 10) : 200;

  const waitMatch = lower.match(/(\d+)\s*(?:hour|hr|घंट|ಗಂಟೆ)/);
  const pctMatch = lower.match(/(\d+)\s*(?:%|percent)/);

  const mentionsCancelFee =
    (lower.includes('fee') || lower.includes('penalty') || lower.includes('fine') || lower.includes('deduct')) &&
    lower.includes('cancel') &&
    !lower.includes('no penalty') &&
    !lower.includes('without penalty') &&
    !lower.includes('replace fee');

  const hasCompletionBonus =
    lower.includes('bonus') ||
    lower.includes('reward') ||
    lower.includes('streak') ||
    lower.includes('priority access') ||
    lower.includes('grace');

  const hasStandbyRetainer = lower.includes('standby') || lower.includes('retainer');
  const hasWeightSplit = lower.includes('weight share') || lower.includes('by weight');
  const hasEqualSplit = lower.includes('equal split') || lower.includes('equally');
  const hasShapleyOrOptIn =
    lower.includes('opt-in') ||
    lower.includes('optional') ||
    lower.includes('choice') ||
    lower.includes('shapley') ||
    lower.includes('cap detour') ||
    lower.includes('spoilage guard');

  const forcedWaitHours =
    lower.includes('wait') && !hasShapleyOrOptIn
      ? waitMatch
        ? parseInt(waitMatch[1], 10)
        : 3
      : waitMatch && hasShapleyOrOptIn
        ? Math.max(0, parseInt(waitMatch[1], 10) - 2)
        : 0;

  const discountPct = pctMatch ? parseInt(pctMatch[1], 10) : hasWeightSplit ? 14 : 0;
  const requiresAppOnly =
    lower.includes('smartphone only') || lower.includes('mandatory app') || lower.includes('remove voice');

  return {
    hasTransporterPenalty: mentionsCancelFee,
    penaltyInr: mentionsCancelFee ? numVal : 0,
    hasCompletionBonus,
    hasWeightSplit,
    hasEqualSplit,
    hasShapleyOrOptIn,
    forcedWaitHours,
    discountPct,
    requiresAppOnly,
    hasStandbyRetainer,
  };
}

export function evaluatePolicyOnTaluka(
  policyText: string,
  personas: SyntheticPersona[],
): PolicySimulationResult {
  const feat = extractPolicyFeatures(policyText);

  // Step 1: Individual deterministic utility (Kahneman-Tversky loss aversion lambda = 2.15)
  const initialUtilities = new Map<string, number>();
  const objections = new Map<string, string>();

  for (const p of personas) {
    const t = p.traits;
    let utility = 18; // baseline neutral-positive goodwill

    if (feat.hasTransporterPenalty) {
      if (p.stakeholderGroup === 'transporter') {
        // Strong loss aversion when autonomy is threatened
        const lossHit = (feat.penaltyInr / 100) * 24 * 2.15 * (1 + (100 - t.riskAppetite) / 140);
        utility -= lossHit;
        objections.set(p.id, 'Punishes breakdown or tyre puncture outside driver control');
      } else if (p.stakeholderGroup === 'farmer' || p.stakeholderGroup === 'fpo') {
        utility += 10 - (100 - t.trustInStrangers) * 0.08;
      }
    }

    if (feat.hasCompletionBonus) {
      if (p.stakeholderGroup === 'transporter') {
        utility += 28 + t.loyalty * 0.16;
      } else {
        utility += 14;
      }
    }

    if (feat.hasStandbyRetainer) {
      utility += p.stakeholderGroup === 'transporter' ? 22 : 18;
    }

    if (feat.hasWeightSplit) {
      if (p.stakeholderGroup === 'farmer' && t.priceSensitivity > 70) {
        utility += 26;
      } else if (p.stakeholderGroup === 'trader' || p.stakeholderGroup === 'input_dealer') {
        // Larger-lot shippers pay slightly more than equal split unless capped
        utility -= feat.hasShapleyOrOptIn ? 2 : 16;
        if (!feat.hasShapleyOrOptIn) {
          objections.set(p.id, 'Heavy anchor shippers subsidise distant small pickups without trunk credit');
        }
      } else {
        utility += 14;
      }
    }

    if (feat.hasEqualSplit && !feat.hasWeightSplit) {
      if (p.stakeholderGroup === 'farmer' && t.priceSensitivity > 68) {
        utility -= 34;
        objections.set(p.id, 'Small 6-quintal farmers refuse paying the same fare as 35-quintal lots');
      }
    }

    if (feat.forcedWaitHours > 0) {
      const waitPain = feat.forcedWaitHours * (105 - t.patience) * 0.22;
      const discountGain = feat.discountPct * (t.priceSensitivity / 100) * 1.35;
      utility += discountGain - waitPain;
      if (waitPain > discountGain + 6) {
        objections.set(p.id, 'Mandatory mandi delay risks tomato softening & missed morning auction');
      }
    }

    if (feat.hasShapleyOrOptIn) {
      utility += 19 + (t.trustInStrangers * 0.1);
    }

    if (feat.requiresAppOnly && (t.literacy < 55 || t.digitalComfort < 50)) {
      utility -= 52;
      objections.set(p.id, 'Excludes voice-first & elder growers without typing fluency');
    }

    initialUtilities.set(p.id, utility);
  }

  // Step 2: Social network influence pass (angry transporters spread rumours; FPO leaders pull neighbours)
  const finalReactions: PersonaReaction[] = personas.map((p) => {
    let u = initialUtilities.get(p.id) ?? 15;
    let peerShift = 0;
    for (const peerId of p.connectedPersonaIds) {
      const peer = personas.find((x) => x.id === peerId);
      const peerU = initialUtilities.get(peerId) ?? 15;
      if (!peer) continue;
      const weight = (p.traits.neighbourInfluence / 100) * (peer.traits.neighbourInfluence / 100) * 0.38;
      // Negative rumours propagate 1.4x stronger than positive word-of-mouth
      peerShift += peerU < 0 ? peerU * weight * 1.4 : peerU * weight;
    }
    u += peerShift;

    const stance: PersonaReaction['stance'] = u >= 16 ? 'accept' : u >= -6 ? 'counter' : 'reject';
    const fairnessScore = Math.max(1, Math.min(5, Math.round(((u + 45) / 95) * 4 + 1)));
    const churnRiskPct = Math.max(
      3,
      Math.min(89, Math.round(46 - u * 0.68 + (100 - p.traits.loyalty) * 0.18)),
    );
    const rumourSpreadStrength = Math.max(
      -100,
      Math.min(100, Math.round((u / 48) * p.traits.neighbourInfluence)),
    );

    const obj = objections.get(p.id);
    const { reasonEn, reasonHi, reasonKn } = buildPersonaVoiceReason(p, stance, fairnessScore, obj);

    return {
      personaId: p.id,
      personaName: p.name,
      archetype: p.archetype,
      stakeholderGroup: p.stakeholderGroup,
      stance,
      fairnessScore,
      churnRiskPct,
      rumourSpreadStrength,
      reasonEn,
      reasonHi,
      reasonKn,
      objectionTag: stance !== 'accept' ? obj ?? 'Wants transparent opt-in guardrails' : undefined,
    };
  });

  const acceptCount = finalReactions.filter((r) => r.stance === 'accept').length;
  const acceptancePct = Math.round((acceptCount / Math.max(1, personas.length)) * 100);
  const avgFairness =
    Math.round(
      (finalReactions.reduce((acc, r) => acc + r.fairnessScore, 0) / Math.max(1, personas.length)) * 10,
    ) / 10;
  const predictedChurnPct = Math.round(
    finalReactions.reduce((acc, r) => acc + r.churnRiskPct, 0) / Math.max(1, personas.length),
  );

  const mainObjections = Array.from(
    new Set(finalReactions.map((r) => r.objectionTag).filter((x): x is string => Boolean(x))),
  ).slice(0, 4);

  const unintendedConsequences: string[] = [];
  if (feat.hasTransporterPenalty) {
    unintendedConsequences.push(
      'Informal tempo owners stop accepting rain-day or interior-village pools to avoid fee risk.',
    );
    unintendedConsequences.push(
      'Transporters warn union peers at Kolar APMC tea stalls, shrinking morning supply by ~22%.',
    );
  }
  if (feat.forcedWaitHours >= 2) {
    unintendedConsequences.push(
      'Tomato & flower growers miss peak 7:30 AM auction bidding when held without a spoilage ceiling.',
    );
  }
  if (feat.hasWeightSplit && !feat.hasShapleyOrOptIn) {
    unintendedConsequences.push(
      '25-quintal mandi traders book private vehicles off-platform unless trunk-corridor savings are credited.',
    );
  }
  if (unintendedConsequences.length === 0) {
    unintendedConsequences.push(
      'Higher pool demand at dawn requires 2 additional standby vehicles around Srinivaspur and Vemgal.',
    );
  }

  let suggestedFixText =
    'Use opt-in Shapley route-plus-weight sharing, cap wait windows by crop spoilage clock, and reward 10-trip completion streaks + standby retainers with zero rejection penalty.';
  if (feat.hasTransporterPenalty) {
    suggestedFixText =
      'Replace cancellation fee with a ₹250 5-trip reliability streak bonus, 1 breakdown grace pass per month, and paid standby retainers on high-risk routes (no rejection penalty).';
  } else if (feat.forcedWaitHours > 0) {
    suggestedFixText =
      'Make the 3-hour pooling wait strictly opt-in with an automatic spoilage-clock release if shelf life drops below 65%, guaranteeing at least 18% fare discount.';
  } else if (feat.hasWeightSplit || feat.hasEqualSplit) {
    suggestedFixText =
      'Blend weight share with Shapley trunk-distance credit and return-leg discount so both 6-quintal growers and 30-quintal anchor shippers save at least 15%.';
  }

  return {
    id: `sim_${Date.now()}`,
    policyText,
    ranAt: new Date().toISOString(),
    acceptancePct,
    avgFairness,
    predictedChurnPct,
    mainObjections,
    unintendedConsequences,
    suggestedFixText,
    reactions: finalReactions,
  };
}

function buildPersonaVoiceReason(
  p: SyntheticPersona,
  stance: 'accept' | 'counter' | 'reject',
  fairness: number,
  objection?: string,
): { reasonEn: string; reasonHi: string; reasonKn: string } {
  if (stance === 'accept') {
    return {
      reasonEn: `As a ${p.archetype.toLowerCase()} in ${p.villageName}, this feels fair (${fairness}/5). My cost and choice are respected, and I will recommend this to my circle.`,
      reasonHi: `${p.villageName} से ${p.archetype} के रूप में यह नियम न्यायपूर्ण (${fairness}/5) लगता है। मेरी बचत और चुनाव दोनों सुरक्षित हैं।`,
      reasonKn: `${p.villageName} ಗ್ರಾಮದ ${p.archetype} ಆಗಿ ಈ ನಿಯಮ ನ್ಯಾಯಯುತವಾಗಿದೆ (${fairness}/5). ನನ್ನ ಉಳಿತಾಯ ಮತ್ತು ಆಯ್ಕೆಯ ಸ್ವಾತಂತ್ರ್ಯ ಉಳಿಯುತ್ತದೆ.`,
    };
  }
  if (stance === 'counter') {
    return {
      reasonEn: `I see the intent from ${p.villageName}, yet ${objection ? objection.toLowerCase() : 'we need an opt-in safety cap'}. Give us choice and a spoilage ceiling before I sign on.`,
      reasonHi: `${p.villageName} में हम इस विचार को समझते हैं, पर इसमें सुरक्षा सीमा और स्वैच्छिक विकल्प जोड़ना ज़रूरी है तभी हम साथ जुड़ेंगे।`,
      reasonKn: `${p.villageName} ಕಡೆಯಿಂದ ಹೇಳುವುದಾದರೆ ಇದರಲ್ಲಿ ಸ್ವಯಂಪ್ರೇರಿತ ಆಯ್ಕೆ ಮತ್ತು ಬೆಳೆ ತಾಜಾತನದ ಮಿತಿ ಸೇರಿಸಿದರೆ ಮಾತ್ರ ನಮಗೆ ಒಪ್ಪಿಗೆಯಾಗುತ್ತದೆ.`,
    };
  }
  return {
    reasonEn: `From ${p.villageName}, I reject this (${fairness}/5): ${objection ?? 'it shifts unfair risk onto small operators'}. If pushed without choice, my group will return to direct phone bookings.`,
    reasonHi: `${p.villageName} से मैं इसका विरोध करता हूँ (${fairness}/5): यह छोटे काम करने वालों पर अनुचित बोझ डालता है। बिना बदलाव हम पुराने तरीके पर लौट जाएंगे।`,
    reasonKn: `${p.villageName} ಗ್ರಾಮದಿಂದ ನಾನು ಇದನ್ನು ತಿರಸ್ಕರಿಸುತ್ತೇನೆ (${fairness}/5): ಇದು ಸಣ್ಣ ರೈತರು ಮತ್ತು ಚಾಲಕರ ಮೇಲೆ ಅನ್ಯಾಯದ ಹೊರೆ ಹಾಕುತ್ತದೆ.`,
  };
}

export interface RedTeamAttackCase {
  id: string;
  title: string;
  adversaryPersona: string;
  vectorDescription: string;
  attemptedGainInr: number;
  defenceTriggered: string;
  auditOutcome: string;
  blocked: boolean;
}

export function runRedTeamSimulation(): RedTeamAttackCase[] {
  return [
    {
      id: 'rt_underdeclare_weight',
      title: 'Under-declared crate weight to shrink weight-share bill',
      adversaryPersona: 'Anwar (Mandi Commission Agent) + accomplice loader',
      vectorDescription:
        'Books 14 quintals on voice booking while loading 21 quintals of potato bags onto shared Bolero Pickup.',
      attemptedGainInr: 490,
      defenceTriggered:
        'Driver checklist axle-load check + APMC digital weighbridge slip reconciliation (>2% tolerance triggers automatic escrow adjustment).',
      auditOutcome:
        'Escrow re-computed on 21.0 qtl actual slip weight; ₹490 recovered before payout release and logged on SHA-256 chain.',
      blocked: true,
    },
    {
      id: 'rt_ring_collusion',
      title: 'Coordinated counter-offer ring at dawn harvest peak',
      adversaryPersona: 'Three corridor tempo operators holding simultaneous counter-offers +28%',
      vectorDescription:
        'Coordinated +28% counter-offers within 90 seconds on Vemgal–Kolar tomato pools to force surge pricing.',
      attemptedGainInr: 1350,
      defenceTriggered:
        'Tour-cost ceiling guard + cross-taluka standby retainer activation + return-leg Eicher dispatch from Srinivaspur.',
      auditOutcome:
        'Pool served within +4% normal cost band via standby vehicle; no shipper paid surge rates.',
      blocked: true,
    },
    {
      id: 'rt_opportunistic_cancel',
      title: 'Last-minute cancellation to chase private cash load',
      adversaryPersona: 'Low-commitment operator 18 minutes before village pickup',
      vectorDescription:
        'Cancels confirmed 3-farmer tomato pool after spotting an off-platform full-truck load near Mulbagal.',
      attemptedGainInr: 820,
      defenceTriggered:
        'Minimal-change self-healing solver reassigns pool in 3.1s to standby tractor/pickup; streak reward resets without punitive fine.',
      auditOutcome:
        'Zero farmer re-booking needed; standby earned ₹350 retainer + full tour income; operator lost Gold Priority tier.',
      blocked: true,
    },
  ];
}

export interface ThirtyDayPoint {
  day: number;
  trustScore: number;
  activeParticipationPct: number;
  emptyKmPct: number;
}

export function simulateThirtyDayTrajectory(policyText: string, personas: SyntheticPersona[]): ThirtyDayPoint[] {
  const evalRes = evaluatePolicyOnTaluka(policyText, personas);
  const positive = evalRes.acceptancePct >= 65;
  const points: ThirtyDayPoint[] = [];
  let trust = 62;
  let part = 54;
  let empty = 44;

  for (let day = 1; day <= 30; day++) {
    const drift = positive
      ? (evalRes.acceptancePct - 55) * 0.032
      : (evalRes.acceptancePct - 58) * 0.038;
    trust = Math.max(22, Math.min(95, trust + drift));
    part = Math.max(18, Math.min(94, part + drift * 1.12));
    empty = Math.max(14, Math.min(68, empty - drift * 0.78));
    points.push({
      day,
      trustScore: Math.round(trust),
      activeParticipationPct: Math.round(part),
      emptyKmPct: Math.round(empty),
    });
  }
  return points;
}
