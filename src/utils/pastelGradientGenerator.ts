export type GradientGridSize = 4 | 5 | 6;

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface PastelGradientPalette {
  id: string;
  name: string;
  topLeft: RgbColor;
  topRight: RgbColor;
  bottomLeft: RgbColor;
  bottomRight: RgbColor;
}

export interface GradientBoard {
  size: GradientGridSize;
  palette: PastelGradientPalette;
  /** Hex color for each canonical tileId (0 .. size*size - 1). */
  tileColors: readonly string[];
  /** Indices locked in place (the 4 corners). */
  lockedIndices: readonly number[];
  /** Starting scrambled tileId at each grid slot. */
  initialOrder: readonly number[];
}

export interface GradientSessionTier {
  level: number;
  label: string;
  size: GradientGridSize;
  gentleSwaps: number | null;
}

/**
 * 12 curated 4-corner soothing pastel palettes with distinct perceptual separation across both axes.
 */
export const PASTEL_GRADIENT_PALETTES: readonly PastelGradientPalette[] = [
  {
    id: 'peach-dawn',
    name: 'Peach Dawn',
    topLeft: { r: 254, g: 205, b: 170 },
    topRight: { r: 244, g: 138, b: 162 },
    bottomLeft: { r: 254, g: 242, b: 196 },
    bottomRight: { r: 165, g: 152, b: 224 },
  },
  {
    id: 'seafoam-breeze',
    name: 'Seafoam Breeze',
    topLeft: { r: 164, g: 230, b: 210 },
    topRight: { r: 112, g: 172, b: 226 },
    bottomLeft: { r: 246, g: 240, b: 190 },
    bottomRight: { r: 164, g: 146, b: 216 },
  },
  {
    id: 'lavender-mist',
    name: 'Lavender Mist',
    topLeft: { r: 234, g: 186, b: 232 },
    topRight: { r: 142, g: 158, b: 232 },
    bottomLeft: { r: 254, g: 214, b: 192 },
    bottomRight: { r: 136, g: 212, b: 204 },
  },
  {
    id: 'sage-meadow',
    name: 'Sage Meadow',
    topLeft: { r: 198, g: 228, b: 174 },
    topRight: { r: 112, g: 186, b: 176 },
    bottomLeft: { r: 252, g: 226, b: 178 },
    bottomRight: { r: 122, g: 148, b: 196 },
  },
  {
    id: 'rosewater-silk',
    name: 'Rosewater Silk',
    topLeft: { r: 248, g: 178, b: 198 },
    topRight: { r: 252, g: 222, b: 166 },
    bottomLeft: { r: 168, g: 146, b: 210 },
    bottomRight: { r: 142, g: 208, b: 214 },
  },
  {
    id: 'sunset-cloud',
    name: 'Sunset Cloud',
    topLeft: { r: 252, g: 168, b: 146 },
    topRight: { r: 216, g: 138, b: 192 },
    bottomLeft: { r: 254, g: 234, b: 174 },
    bottomRight: { r: 132, g: 166, b: 222 },
  },
  {
    id: 'nordic-sky',
    name: 'Nordic Sky',
    topLeft: { r: 150, g: 206, b: 238 },
    topRight: { r: 198, g: 172, b: 232 },
    bottomLeft: { r: 184, g: 232, b: 202 },
    bottomRight: { r: 248, g: 194, b: 182 },
  },
  {
    id: 'honey-apricot',
    name: 'Honey Apricot',
    topLeft: { r: 254, g: 224, b: 146 },
    topRight: { r: 244, g: 150, b: 148 },
    bottomLeft: { r: 182, g: 226, b: 196 },
    bottomRight: { r: 174, g: 152, b: 218 },
  },
  {
    id: 'eucalyptus-dew',
    name: 'Eucalyptus Dew',
    topLeft: { r: 154, g: 216, b: 194 },
    topRight: { r: 224, g: 232, b: 168 },
    bottomLeft: { r: 122, g: 162, b: 214 },
    bottomRight: { r: 236, g: 172, b: 192 },
  },
  {
    id: 'berry-sorbet',
    name: 'Berry Sorbet',
    topLeft: { r: 236, g: 148, b: 178 },
    topRight: { r: 178, g: 150, b: 224 },
    bottomLeft: { r: 254, g: 212, b: 176 },
    bottomRight: { r: 146, g: 206, b: 228 },
  },
  {
    id: 'twilight-lilac',
    name: 'Twilight Lilac',
    topLeft: { r: 188, g: 164, b: 234 },
    topRight: { r: 246, g: 176, b: 194 },
    bottomLeft: { r: 126, g: 188, b: 216 },
    bottomRight: { r: 250, g: 228, b: 176 },
  },
  {
    id: 'warm-terracotta',
    name: 'Warm Terracotta',
    topLeft: { r: 234, g: 162, b: 140 },
    topRight: { r: 248, g: 220, b: 168 },
    bottomLeft: { r: 152, g: 156, b: 204 },
    bottomRight: { r: 156, g: 212, b: 194 },
  },
] as const;

const toHex = (value: number): string => {
  const clamped = Math.max(0, Math.min(255, Math.round(value)));
  return clamped.toString(16).padStart(2, '0');
};

const rgbToHex = ({ r, g, b }: RgbColor): string => `#${toHex(r)}${toHex(g)}${toHex(b)}`;

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

const lerpRgb = (a: RgbColor, b: RgbColor, t: number): RgbColor => ({
  r: lerp(a.r, b.r, t),
  g: lerp(a.g, b.g, t),
  b: lerp(a.b, b.b, t),
});

export const interpolateGradientColors = (
  palette: PastelGradientPalette,
  size: GradientGridSize
): string[] => {
  const colors: string[] = [];
  const denom = Math.max(1, size - 1);
  for (let row = 0; row < size; row++) {
    const v = row / denom;
    const leftEdge = lerpRgb(palette.topLeft, palette.bottomLeft, v);
    const rightEdge = lerpRgb(palette.topRight, palette.bottomRight, v);
    for (let col = 0; col < size; col++) {
      const u = col / denom;
      colors.push(rgbToHex(lerpRgb(leftEdge, rightEdge, u)));
    }
  }
  return colors;
};

export const getGradientLockedIndices = (size: GradientGridSize): readonly number[] => [
  0,
  size - 1,
  size * (size - 1),
  size * size - 1,
];

export const getGradientTierForSolvedCount = (solvedCount: number): GradientSessionTier => {
  if (solvedCount < 2) {
    return { level: 1, label: 'Gentle', size: 4, gentleSwaps: 6 };
  }
  if (solvedCount < 4) {
    return { level: 2, label: 'Soft', size: 4, gentleSwaps: null };
  }
  if (solvedCount < 6) {
    return { level: 3, label: 'Cozy', size: 5, gentleSwaps: 9 };
  }
  if (solvedCount < 9) {
    return { level: 4, label: 'Deep', size: 5, gentleSwaps: null };
  }
  return { level: 5, label: 'Master', size: 6, gentleSwaps: null };
};

export interface GenerateGradientOptions {
  excludePaletteId?: string;
  gentleSwaps?: number | null;
}

export const generateGradientBoard = (
  size: GradientGridSize,
  options: GenerateGradientOptions = {}
): GradientBoard => {
  const candidates =
    options.excludePaletteId && PASTEL_GRADIENT_PALETTES.length > 1
      ? PASTEL_GRADIENT_PALETTES.filter((p) => p.id !== options.excludePaletteId)
      : PASTEL_GRADIENT_PALETTES;
  const palette = candidates[Math.floor(Math.random() * candidates.length)] ?? PASTEL_GRADIENT_PALETTES[0];

  const tileColors = interpolateGradientColors(palette, size);
  const lockedIndices = getGradientLockedIndices(size);
  const lockedSet = new Set(lockedIndices);

  const total = size * size;
  const unlockedIndices: number[] = [];
  for (let i = 0; i < total; i++) {
    if (!lockedSet.has(i)) unlockedIndices.push(i);
  }

  const order = Array.from({ length: total }, (_, idx) => idx);

  const applyScramble = () => {
    for (let i = 0; i < total; i++) order[i] = i;

    if (typeof options.gentleSwaps === 'number' && options.gentleSwaps > 0) {
      const swaps = Math.min(options.gentleSwaps, unlockedIndices.length);
      for (let s = 0; s < swaps; s++) {
        const aPos = Math.floor(Math.random() * unlockedIndices.length);
        let bPos = Math.floor(Math.random() * unlockedIndices.length);
        if (bPos === aPos) bPos = (aPos + 1) % unlockedIndices.length;
        const a = unlockedIndices[aPos];
        const b = unlockedIndices[bPos];
        const tmp = order[a];
        order[a] = order[b];
        order[b] = tmp;
      }
    } else {
      // Full Fisher-Yates shuffle across unlocked slots
      const shuffledValues = unlockedIndices.map((idx) => idx);
      for (let i = shuffledValues.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = shuffledValues[i];
        shuffledValues[i] = shuffledValues[j];
        shuffledValues[j] = tmp;
      }
      for (let i = 0; i < unlockedIndices.length; i++) {
        order[unlockedIndices[i]] = shuffledValues[i];
      }
    }
  };

  for (let attempt = 0; attempt < 8; attempt++) {
    applyScramble();
    const misplaced = unlockedIndices.filter((idx) => order[idx] !== idx).length;
    if (misplaced >= Math.min(4, unlockedIndices.length)) {
      break;
    }
  }

  return {
    size,
    palette,
    tileColors,
    lockedIndices,
    initialOrder: order,
  };
};

export const isGradientSolved = (order: readonly number[]): boolean =>
  order.every((tileId, idx) => tileId === idx);

export interface GradientHintPair {
  fromIndex: number;
  toIndex: number;
}

export const findGradientHint = (order: readonly number[]): GradientHintPair | null => {
  for (let idx = 0; idx < order.length; idx++) {
    if (order[idx] !== idx) {
      const targetIndex = order.indexOf(idx);
      if (targetIndex !== -1 && targetIndex !== idx) {
        return { fromIndex: idx, toIndex: targetIndex };
      }
    }
  }
  return null;
};
