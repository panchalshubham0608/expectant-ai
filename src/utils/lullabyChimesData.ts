export type ChimeScaleId = 'starlight' | 'moonbeam' | 'warm-harp';

export type ChimeStarShape = 'star' | 'sparkle' | 'moon' | 'gem';

export interface ChimeStarNode {
  index: number;
  x: number;
  y: number;
  radius: number;
  shape: ChimeStarShape;
  fill: string;
  glow: string;
}

export interface ChimeScaleDefinition {
  id: ChimeScaleId;
  label: string;
  subtitle: string;
  noteLabels: readonly string[];
  frequencies: readonly number[];
  skyTop: string;
  skyMid: string;
  skyBottom: string;
  hillBack: string;
  hillFront: string;
}

export interface LullabyStep {
  starIndex: number;
  delayMs: number;
}

export interface LullabyPreset {
  id: string;
  name: string;
  tagline: string;
  steps: readonly LullabyStep[];
}

export const CHIME_SCALES: readonly ChimeScaleDefinition[] = [
  {
    id: 'starlight',
    label: 'Starlight C',
    subtitle: 'Bright music-box pentatonic',
    noteLabels: ['C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5', 'G5'],
    frequencies: [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99],
    skyTop: '#171c44',
    skyMid: '#2a2f6b',
    skyBottom: '#4f4689',
    hillBack: '#26295c',
    hillFront: '#1b1d45',
  },
  {
    id: 'moonbeam',
    label: 'Moonbeam F',
    subtitle: 'Soft dreamy lullaby key',
    noteLabels: ['F4', 'G4', 'A4', 'C5', 'D5', 'F5', 'G5', 'A5', 'C6'],
    frequencies: [349.23, 392.0, 440.0, 523.25, 587.33, 698.46, 783.99, 880.0, 1046.5],
    skyTop: '#162041',
    skyMid: '#263a6e',
    skyBottom: '#4e6397',
    hillBack: '#1f305b',
    hillFront: '#152245',
  },
  {
    id: 'warm-harp',
    label: 'Warm Harp G',
    subtitle: 'Cozy twilight harp chords',
    noteLabels: ['G3', 'A3', 'B3', 'D4', 'E4', 'G4', 'A4', 'B4', 'D5'],
    frequencies: [196.0, 220.0, 246.94, 293.66, 329.63, 392.0, 440.0, 493.88, 587.33],
    skyTop: '#241840',
    skyMid: '#432b68',
    skyBottom: '#784e88',
    hillBack: '#352256',
    hillFront: '#251740',
  },
] as const;

export const CHIME_SCALE_BY_ID: Record<ChimeScaleId, ChimeScaleDefinition> = {
  starlight: CHIME_SCALES[0],
  moonbeam: CHIME_SCALES[1],
  'warm-harp': CHIME_SCALES[2],
};

/**
 * 9 generously spaced glowing stars laid out like a constellation harp from low (left) to high (right).
 */
export const CHIME_STARS: readonly ChimeStarNode[] = [
  { index: 0, x: 46, y: 164, radius: 17, shape: 'star', fill: '#fde68a', glow: '#f59e0b' },
  { index: 1, x: 84, y: 112, radius: 16, shape: 'sparkle', fill: '#fed7aa', glow: '#fb923c' },
  { index: 2, x: 122, y: 162, radius: 16, shape: 'gem', fill: '#fbcfe8', glow: '#f472b6' },
  { index: 3, x: 158, y: 86, radius: 18, shape: 'moon', fill: '#fef08a', glow: '#eab308' },
  { index: 4, x: 192, y: 146, radius: 17, shape: 'star', fill: '#e9d5ff', glow: '#a855f7' },
  { index: 5, x: 228, y: 92, radius: 17, shape: 'sparkle', fill: '#bae6fd', glow: '#38bdf8' },
  { index: 6, x: 262, y: 154, radius: 16, shape: 'gem', fill: '#a7f3d0', glow: '#34d399' },
  { index: 7, x: 294, y: 100, radius: 17, shape: 'star', fill: '#fef3c7', glow: '#fbbf24' },
  { index: 8, x: 320, y: 156, radius: 15, shape: 'sparkle', fill: '#ddd6fe', glow: '#818cf8' },
] as const;

export const AMBIENT_TWINKLE_STARS: readonly { x: number; y: number; r: number; delay: string }[] = [
  { x: 28, y: 40, r: 1.4, delay: '0s' },
  { x: 64, y: 58, r: 1.2, delay: '0.8s' },
  { x: 112, y: 42, r: 1.6, delay: '1.4s' },
  { x: 144, y: 138, r: 1.1, delay: '0.4s' },
  { x: 196, y: 46, r: 1.5, delay: '1.9s' },
  { x: 248, y: 44, r: 1.3, delay: '0.6s' },
  { x: 284, y: 56, r: 1.5, delay: '1.2s' },
  { x: 334, y: 48, r: 1.2, delay: '2.1s' },
  { x: 342, y: 108, r: 1.4, delay: '0.3s' },
  { x: 24, y: 110, r: 1.2, delay: '1.6s' },
  { x: 168, y: 192, r: 1.1, delay: '0.9s' },
  { x: 246, y: 196, r: 1.2, delay: '1.7s' },
] as const;

export const LULLABY_PRESETS: readonly LullabyPreset[] = [
  {
    id: 'twinkle-drift',
    name: 'Starlight Twinkle',
    tagline: 'A sweet, classic cradle shimmer',
    steps: [
      { starIndex: 0, delayMs: 0 },
      { starIndex: 0, delayMs: 460 },
      { starIndex: 3, delayMs: 920 },
      { starIndex: 3, delayMs: 1380 },
      { starIndex: 4, delayMs: 1840 },
      { starIndex: 4, delayMs: 2300 },
      { starIndex: 3, delayMs: 2760 },
      { starIndex: 2, delayMs: 3480 },
      { starIndex: 2, delayMs: 3940 },
      { starIndex: 1, delayMs: 4400 },
      { starIndex: 1, delayMs: 4860 },
      { starIndex: 0, delayMs: 5320 },
    ],
  },
  {
    id: 'moonlight-cradle',
    name: 'Moonlight Cradle',
    tagline: 'Slow rocking evening notes',
    steps: [
      { starIndex: 2, delayMs: 0 },
      { starIndex: 4, delayMs: 520 },
      { starIndex: 5, delayMs: 1040 },
      { starIndex: 3, delayMs: 1640 },
      { starIndex: 2, delayMs: 2220 },
      { starIndex: 1, delayMs: 2740 },
      { starIndex: 2, delayMs: 3260 },
      { starIndex: 4, delayMs: 3820 },
      { starIndex: 5, delayMs: 4380 },
      { starIndex: 7, delayMs: 4940 },
      { starIndex: 5, delayMs: 5560 },
      { starIndex: 3, delayMs: 6180 },
    ],
  },
  {
    id: 'sleepy-firefly',
    name: 'Sleepy Firefly',
    tagline: 'Floating pentatonic lullaby',
    steps: [
      { starIndex: 5, delayMs: 0 },
      { starIndex: 4, delayMs: 480 },
      { starIndex: 3, delayMs: 960 },
      { starIndex: 2, delayMs: 1440 },
      { starIndex: 3, delayMs: 2040 },
      { starIndex: 5, delayMs: 2540 },
      { starIndex: 6, delayMs: 3040 },
      { starIndex: 5, delayMs: 3640 },
      { starIndex: 4, delayMs: 4140 },
      { starIndex: 2, delayMs: 4680 },
      { starIndex: 0, delayMs: 5240 },
    ],
  },
  {
    id: 'morning-dewdrop',
    name: 'Morning Dewdrop',
    tagline: 'Warm rising chimes for baby',
    steps: [
      { starIndex: 0, delayMs: 0 },
      { starIndex: 2, delayMs: 420 },
      { starIndex: 3, delayMs: 840 },
      { starIndex: 5, delayMs: 1260 },
      { starIndex: 7, delayMs: 1740 },
      { starIndex: 8, delayMs: 2240 },
      { starIndex: 7, delayMs: 2820 },
      { starIndex: 5, delayMs: 3320 },
      { starIndex: 4, delayMs: 3820 },
      { starIndex: 5, delayMs: 4360 },
    ],
  },
] as const;
