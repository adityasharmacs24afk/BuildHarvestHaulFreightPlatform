import type { CropOrCargo } from '@/types/domain';

export interface CargoMeta {
  id: CropOrCargo;
  labelEn: string;
  labelHi: string;
  labelKn: string;
  category: 'delicate_produce' | 'hardy_produce' | 'aromatic_flowers' | 'dry_grain' | 'chemical_input' | 'feed_input' | 'packaging';
  shelfLifeHoursAt25C: number;
  valuePerQuintalInr: number;
  stackFragility: 1 | 2 | 3; // 3 = fragile (must load on top / accessible)
}

export const CARGO_CATALOG: Record<CropOrCargo, CargoMeta> = {
  tomato: {
    id: 'tomato',
    labelEn: 'Tomato',
    labelHi: 'टमाटर',
    labelKn: 'ಟೊಮೆಟೊ',
    category: 'delicate_produce',
    shelfLifeHoursAt25C: 26,
    valuePerQuintalInr: 2200,
    stackFragility: 3,
  },
  potato: {
    id: 'potato',
    labelEn: 'Potato',
    labelHi: 'आलू',
    labelKn: 'ಆಲೂಗಡ್ಡೆ',
    category: 'hardy_produce',
    shelfLifeHoursAt25C: 120,
    valuePerQuintalInr: 1850,
    stackFragility: 1,
  },
  beans: {
    id: 'beans',
    labelEn: 'French Beans',
    labelHi: 'बीन्स',
    labelKn: 'ಹುರಳಿಕಾಯಿ',
    category: 'delicate_produce',
    shelfLifeHoursAt25C: 22,
    valuePerQuintalInr: 3400,
    stackFragility: 2,
  },
  carrot: {
    id: 'carrot',
    labelEn: 'Carrot',
    labelHi: 'गाजर',
    labelKn: 'ಕ್ಯಾರೆಟ್',
    category: 'hardy_produce',
    shelfLifeHoursAt25C: 48,
    valuePerQuintalInr: 2600,
    stackFragility: 1,
  },
  cabbage: {
    id: 'cabbage',
    labelEn: 'Cabbage',
    labelHi: 'पत्तागोभी',
    labelKn: 'ಎಲೆಕೋಸು',
    category: 'hardy_produce',
    shelfLifeHoursAt25C: 42,
    valuePerQuintalInr: 1400,
    stackFragility: 2,
  },
  capsicum: {
    id: 'capsicum',
    labelEn: 'Capsicum',
    labelHi: 'शिमला मिर्च',
    labelKn: 'ದೊಣ್ಣಮೆಣಸಿನಕಾಯಿ',
    category: 'delicate_produce',
    shelfLifeHoursAt25C: 28,
    valuePerQuintalInr: 3800,
    stackFragility: 3,
  },
  ragi: {
    id: 'ragi',
    labelEn: 'Ragi (Finger Millet)',
    labelHi: 'रागी',
    labelKn: 'ರಾಗಿ',
    category: 'dry_grain',
    shelfLifeHoursAt25C: 720,
    valuePerQuintalInr: 3600,
    stackFragility: 1,
  },
  mango: {
    id: 'mango',
    labelEn: 'Alphonso & Totapuri Mango',
    labelHi: 'आम',
    labelKn: 'ಮಾವಿನಹಣ್ಣು',
    category: 'delicate_produce',
    shelfLifeHoursAt25C: 36,
    valuePerQuintalInr: 4900,
    stackFragility: 3,
  },
  flowers: {
    id: 'flowers',
    labelEn: 'Marigold & Chrysanthemum',
    labelHi: 'गेंदा फूल',
    labelKn: 'ಚೆಂಡು ಹೂವು',
    category: 'aromatic_flowers',
    shelfLifeHoursAt25C: 14,
    valuePerQuintalInr: 5500,
    stackFragility: 3,
  },
  fertiliser: {
    id: 'fertiliser',
    labelEn: 'NPK & Urea Fertiliser',
    labelHi: 'उर्वरक खाद',
    labelKn: 'ರಸಗೊಬ್ಬರ',
    category: 'chemical_input',
    shelfLifeHoursAt25C: 2400,
    valuePerQuintalInr: 1350,
    stackFragility: 1,
  },
  poultry_feed: {
    id: 'poultry_feed',
    labelEn: 'Poultry & Cattle Feed',
    labelHi: 'पशु एवं मुर्गी चारा',
    labelKn: 'ಕೋಳಿ ಮತ್ತು ಜಾನುವಾರು ಆಹಾರ',
    category: 'feed_input',
    shelfLifeHoursAt25C: 960,
    valuePerQuintalInr: 2150,
    stackFragility: 1,
  },
  crates_packaging: {
    id: 'crates_packaging',
    labelEn: 'Returnable Crates & Cartons',
    labelHi: 'क्रेट और पैकेजिंग',
    labelKn: 'ಕ್ರೇಟ್‌ಗಳು ಮತ್ತು ಪ್ಯಾಕೇಜಿಂಗ್',
    category: 'packaging',
    shelfLifeHoursAt25C: 4000,
    valuePerQuintalInr: 900,
    stackFragility: 1,
  },
};

/**
 * Checks whether two cargo types can share the same vehicle bed simultaneously
 * (note: outbound produce and return-leg inputs are separated in time, so return legs are compatible).
 */
export function areCargosCompatible(a: CropOrCargo, b: CropOrCargo): { compatible: boolean; reason?: string } {
  if (a === b) return { compatible: true };
  const metaA = CARGO_CATALOG[a];
  const metaB = CARGO_CATALOG[b];

  const cats = new Set([metaA.category, metaB.category]);

  // Rule 1: Chemical fertiliser cannot share a bed with any fresh produce, flowers, or feed
  if (cats.has('chemical_input')) {
    if (
      cats.has('delicate_produce') ||
      cats.has('hardy_produce') ||
      cats.has('aromatic_flowers') ||
      cats.has('feed_input') ||
      cats.has('dry_grain')
    ) {
      return {
        compatible: false,
        reason: 'Chemical fertiliser cannot share a vehicle bed with food crops or animal feed.',
      };
    }
  }

  // Rule 2: Strong-odour poultry feed cannot share a bed with delicate produce or fresh flowers
  if (cats.has('feed_input') && (cats.has('delicate_produce') || cats.has('aromatic_flowers'))) {
    return {
      compatible: false,
      reason: 'Animal feed bags carry odour and dust that taint fresh produce and flowers.',
    };
  }

  // Rule 3: Fresh flowers cannot ride alongside ethylene-heavy ripening tomato/mango
  if (cats.has('aromatic_flowers') && (a === 'tomato' || b === 'tomato' || a === 'mango' || b === 'mango')) {
    return {
      compatible: false,
      reason: 'Ethylene gas from ripening tomatoes or mangoes wilts cut flowers in transit.',
    };
  }

  return { compatible: true };
}

export function isPoolCargoSetCompatible(cargos: CropOrCargo[]): { compatible: boolean; conflictReason?: string } {
  for (let i = 0; i < cargos.length; i++) {
    for (let j = i + 1; j < cargos.length; j++) {
      const res = areCargosCompatible(cargos[i], cargos[j]);
      if (!res.compatible) {
        return { compatible: false, conflictReason: res.reason };
      }
    }
  }
  return { compatible: true };
}

/**
 * Computes LIFO (Last-In-First-Out) loading sequence:
 * Loads dropped FIRST at earlier mandis must be loaded LAST (highest lifoSequence)
 * so crates do not need re-handling on the roadside.
 */
export function computeLifoLoadingOrder<T extends { id: string; dropOrderIndex: number }>(
  items: T[],
): { id: string; loadOrder: number; unloadOrder: number }[] {
  const sortedByDrop = [...items].sort((a, b) => a.dropOrderIndex - b.dropOrderIndex);
  const total = sortedByDrop.length;
  return sortedByDrop.map((item, idx) => ({
    id: item.id,
    unloadOrder: idx + 1,
    loadOrder: total - idx,
  }));
}
