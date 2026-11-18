import type { CropOrCargo, GeoNode } from '@/types/domain';

export interface ParsedVoiceBooking {
  crop: CropOrCargo;
  weightQuintals: number;
  rawQuantity: number;
  unitLabel: string;
  pickupNodeId: string;
  dropNodeId: string;
  readySlot: 'today_afternoon' | 'today_evening' | 'tomorrow_morning' | 'tomorrow_evening';
  readyLabel: string;
  confidencePct: number;
  matchedTokens: string[];
}

const CROP_KEYWORDS: { crop: CropOrCargo; patterns: string[] }[] = [
  { crop: 'tomato', patterns: ['tomato', 'tomatoes', 'tamatar', 'टमाटर', 'ಟೊಮೆಟೊ', 'ಟೊಮ್ಯಾಟೊ'] },
  { crop: 'potato', patterns: ['potato', 'potatoes', 'aloo', 'आलू', 'ಆಲೂಗಡ್ಡೆ', 'ಆಲೂ'] },
  { crop: 'beans', patterns: ['beans', 'bean', 'french bean', 'बीन्स', 'फलियां', 'ಹುರಳಿಕಾಯಿ', 'ಬೀನ್ಸ್'] },
  { crop: 'carrot', patterns: ['carrot', 'carrots', 'gajar', 'गाजर', 'ಕ್ಯಾರೆಟ್', 'ಗಜರಿ'] },
  { crop: 'cabbage', patterns: ['cabbage', 'gobhi', 'पत्तागोभी', 'गोभी', 'ಎಲೆಕೋಸು', 'ಕ್ಯಾಬೇಜ್'] },
  { crop: 'capsicum', patterns: ['capsicum', 'shimla', 'शिमला मिर्च', 'शिमला', 'ದೊಣ್ಣಮೆಣಸಿನಕಾಯಿ', 'ಕ್ಯಾಪ್ಸಿಕಂ'] },
  { crop: 'ragi', patterns: ['ragi', 'millet', 'रागी', 'ರಾಗಿ'] },
  { crop: 'mango', patterns: ['mango', 'mangoes', 'totapuri', 'aam', 'आम', 'ಮಾವಿನಹಣ್ಣು', 'ಮಾವು'] },
  { crop: 'flowers', patterns: ['flower', 'flowers', 'marigold', 'phool', 'गेंदा', 'फूल', 'ಚೆಂಡು ಹೂವು', 'ಹೂವು'] },
  { crop: 'fertiliser', patterns: ['fertiliser', 'fertilizer', 'urea', 'npk', 'khad', 'उर्वरक', 'खाद', 'ರಸಗೊಬ್ಬರ', 'ಗೊಬ್ಬರ'] },
  { crop: 'poultry_feed', patterns: ['feed', 'poultry', 'cattle feed', 'chara', 'चारा', 'मुर्गी चारा', 'ಕೋಳಿ ಆಹಾರ', 'ಜಾನುವಾರು ಆಹಾರ'] },
  { crop: 'crates_packaging', patterns: ['crate', 'crates', 'carton', 'packaging', 'क्रेट', 'ಕ್ರೇಟ್'] },
];

const WORD_NUMBERS: Record<string, number> = {
  five: 5,
  eight: 8,
  ten: 10,
  twelve: 12,
  fifteen: 15,
  twenty: 20,
  twentyfive: 25,
  thirty: 30,
  forty: 40,
  fifty: 50,
  पांच: 5,
  दस: 10,
  पंद्रह: 15,
  बीस: 20,
  पच्चीस: 25,
  तीस: 30,
  ಐದು: 5,
  ಹತ್ತು: 10,
  ಹದಿನೈದು: 15,
  ಇಪ್ಪತ್ತು: 20,
  ಇಪ್ಪತ್ತೈದು: 25,
  ಮುವ್ವತ್ತು: 30,
};

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function matchPlacesInText(text: string, nodes: GeoNode[]): GeoNode[] {
  const lower = text.toLowerCase();
  const words = lower.replace(/[,.;!?]/g, ' ').split(/\s+/).filter(Boolean);
  const hits: { node: GeoNode; pos: number; score: number }[] = [];

  for (const node of nodes) {
    const candidates = [
      node.name.toLowerCase(),
      node.name.toLowerCase().replace(/\s+(apmc|market|mandi|packhouse|cold store|pulp unit|feed mill)/g, '').trim(),
      node.nameHi.toLowerCase(),
      node.nameKn.toLowerCase(),
    ].filter((s) => s.length >= 3);

    let bestPos = -1;
    let bestScore = 0;
    for (const cand of candidates) {
      const idx = lower.indexOf(cand);
      if (idx >= 0) {
        bestPos = idx;
        bestScore = 100 + cand.length;
        break;
      }
      // Fuzzy match single-word village names against spoken English tokens
      if (/^[a-z]+$/.test(cand) && cand.length >= 5) {
        for (let wIdx = 0; wIdx < words.length; wIdx++) {
          const w = words[wIdx];
          if (w.length >= 5 && levenshtein(w, cand) <= 1) {
            bestPos = lower.indexOf(w);
            bestScore = 75;
            break;
          }
        }
      }
    }
    if (bestPos >= 0) {
      hits.push({ node, pos: bestPos, score: bestScore });
    }
  }

  hits.sort((a, b) => b.score - a.score || a.pos - b.pos);
  const unique: GeoNode[] = [];
  const seen = new Set<string>();
  for (const h of hits) {
    if (!seen.has(h.node.id)) {
      seen.add(h.node.id);
      unique.push(h.node);
    }
  }
  return unique;
}

export function parseVoiceBookingInput(
  transcript: string,
  nodes: GeoNode[],
  defaultPickupId = 'v_vemgal',
  defaultDropId = 'm_kolar_apmc',
): ParsedVoiceBooking {
  const lower = transcript.toLowerCase().trim();
  const matchedTokens: string[] = [];
  let confidence = 52;

  // 1. Crop extraction
  let detectedCrop: CropOrCargo = 'tomato';
  for (const entry of CROP_KEYWORDS) {
    const hit = entry.patterns.find((p) => lower.includes(p.toLowerCase()));
    if (hit) {
      detectedCrop = entry.crop;
      matchedTokens.push(hit);
      confidence += 16;
      break;
    }
  }

  // 2. Quantity and unit extraction
  let rawQty = 15;
  const numMatch = lower.match(/(\d+(?:\.\d+)?)/);
  if (numMatch) {
    rawQty = Math.max(1, parseFloat(numMatch[1]));
    matchedTokens.push(numMatch[1]);
    confidence += 14;
  } else {
    for (const [word, val] of Object.entries(WORD_NUMBERS)) {
      if (lower.includes(word)) {
        rawQty = val;
        matchedTokens.push(word);
        confidence += 12;
        break;
      }
    }
  }

  let unitLabel = 'quintals';
  let weightQuintals = rawQty;
  if (/(kg|kilo|किलो|ಕೆಜಿ)/i.test(lower)) {
    unitLabel = `${rawQty} kg`;
    weightQuintals = Math.max(1, Math.round((rawQty / 100) * 10) / 10);
    confidence += 5;
  } else if (/(bag|bags|bori|बोरी|बोरे|ಚೀಲ)/i.test(lower)) {
    unitLabel = `${rawQty} bags (50 kg)`;
    weightQuintals = Math.max(1, Math.round(rawQty * 0.5 * 10) / 10);
    confidence += 5;
  } else if (/(crate|crates|क्रेट|ಕ್ರೇಟ್)/i.test(lower)) {
    unitLabel = `${rawQty} crates (25 kg)`;
    weightQuintals = Math.max(1, Math.round(rawQty * 0.25 * 10) / 10);
    confidence += 5;
  } else {
    unitLabel = `${rawQty} quintal`;
    if (/(quintal|qtl|क्विंटल|ಕ್ವಿಂಟಲ್|ಕ್ವಿಂಟಾಲ್)/i.test(lower)) {
      confidence += 6;
    }
  }

  // 3. Places (pickup village & destination mandi)
  const matchedPlaces = matchPlacesInText(transcript, nodes);
  let pickupNodeId = defaultPickupId;
  let dropNodeId = defaultDropId;

  const mandisFound = matchedPlaces.filter((n) => n.kind === 'mandi' || n.kind === 'factory' || n.kind === 'cold_chain');
  const mandiTownPrefixes = new Set(
    mandisFound.map((m) => m.name.toLowerCase().split(' ')[0]),
  );
  const villagesFound = matchedPlaces.filter(
    (n) =>
      (n.kind === 'village' || n.kind === 'input_dealer') &&
      !mandiTownPrefixes.has(n.name.toLowerCase().split(' ')[0]),
  );
  const fallbackVillages = matchedPlaces.filter(
    (n) => n.kind === 'village' || n.kind === 'input_dealer',
  );

  if (mandisFound.length > 0) {
    dropNodeId = mandisFound[0].id;
    matchedTokens.push(mandisFound[0].name);
    confidence += 8;
  } else if (matchedPlaces.length >= 2) {
    dropNodeId = matchedPlaces[matchedPlaces.length - 1].id;
    matchedTokens.push(matchedPlaces[matchedPlaces.length - 1].name);
  }

  if (villagesFound.length > 0) {
    pickupNodeId = villagesFound[0].id;
    matchedTokens.push(villagesFound[0].name);
    confidence += 6;
  } else if (fallbackVillages.length > 0 && mandisFound.length === 0) {
    pickupNodeId = fallbackVillages[0].id;
    matchedTokens.push(fallbackVillages[0].name);
    confidence += 6;
  }

  // 4. Ready time slot
  let readySlot: ParsedVoiceBooking['readySlot'] = 'tomorrow_morning';
  let readyLabel = 'Tomorrow, 6:30 AM';
  if (/(today|aaj|आज|ಇಂದು|ಈಗ|afternoon|dopahar|दोपहर|ಮಧ್ಯಾಹ್ನ)/i.test(lower)) {
    if (/(evening|shaam|शाम|ಸಂಜೆ)/i.test(lower)) {
      readySlot = 'today_evening';
      readyLabel = 'Today, 5:30 PM';
    } else {
      readySlot = 'today_afternoon';
      readyLabel = 'Today, 2:00 PM';
    }
    confidence += 5;
  } else if (/(tomorrow|kal|कल|ನಾಳೆ)/i.test(lower)) {
    if (/(evening|shaam|शाम|ಸಂಜೆ)/i.test(lower)) {
      readySlot = 'tomorrow_evening';
      readyLabel = 'Tomorrow, 5:00 PM';
    } else {
      readySlot = 'tomorrow_morning';
      readyLabel = 'Tomorrow, 6:30 AM';
    }
    confidence += 5;
  }

  return {
    crop: detectedCrop,
    weightQuintals: Math.min(120, Math.max(1, weightQuintals)),
    rawQuantity: rawQty,
    unitLabel,
    pickupNodeId,
    dropNodeId,
    readySlot,
    readyLabel,
    confidencePct: Math.min(98, confidence),
    matchedTokens,
  };
}
