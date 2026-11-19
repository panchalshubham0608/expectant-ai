export type PondThemeId = 'morning-lotus' | 'moonlit-koi' | 'jade-bamboo';

export interface PondThemeDefinition {
  id: PondThemeId;
  label: string;
  waterTop: string;
  waterMid: string;
  waterBottom: string;
  rippleStroke: string;
  padFill: string;
  padHighlight: string;
  padVein: string;
  lotusOuter: string;
  lotusInner: string;
  lotusCenter: string;
  petalColors: readonly string[];
  pebbleFill: string;
  koiPrimary: string;
  koiSecondary: string;
  waterNotesHz: readonly number[];
}

export interface PondLilyPad {
  id: string;
  x: number;
  y: number;
  rx: number;
  ry: number;
  rotation: number;
  hasLotus?: boolean;
  lotusScale?: number;
}

export interface PondPebble {
  x: number;
  y: number;
  rx: number;
  ry: number;
  rotation: number;
  opacity: number;
}

export const POND_THEMES: readonly PondThemeDefinition[] = [
  {
    id: 'morning-lotus',
    label: 'Morning Lotus',
    waterTop: '#b9e5e8',
    waterMid: '#7ec8cf',
    waterBottom: '#4b9ca8',
    rippleStroke: '#ffffff',
    padFill: '#5aa67b',
    padHighlight: '#7cc299',
    padVein: '#3e7f5c',
    lotusOuter: '#fbcfe8',
    lotusInner: '#f472b6',
    lotusCenter: '#fde68a',
    petalColors: ['#fbcfe8', '#fce7f3', '#fef3c7', '#f9a8d4'],
    pebbleFill: '#3b7e8a',
    koiPrimary: '#fb923c',
    koiSecondary: '#fef3c7',
    waterNotesHz: [329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99],
  },
  {
    id: 'moonlit-koi',
    label: 'Moonlit Koi',
    waterTop: '#243b6b',
    waterMid: '#1e325c',
    waterBottom: '#13203d',
    rippleStroke: '#bae6fd',
    padFill: '#2f6c68',
    padHighlight: '#438983',
    padVein: '#1f4f4c',
    lotusOuter: '#e9d5ff',
    lotusInner: '#c084fc',
    lotusCenter: '#fef08a',
    petalColors: ['#e9d5ff', '#bae6fd', '#fef3c7', '#ddd6fe'],
    pebbleFill: '#12203b',
    koiPrimary: '#fda4af',
    koiSecondary: '#fff1f2',
    waterNotesHz: [293.66, 349.23, 392.0, 440.0, 523.25, 587.33, 698.46],
  },
  {
    id: 'jade-bamboo',
    label: 'Jade Spring',
    waterTop: '#c4e8d5',
    waterMid: '#7fc5ac',
    waterBottom: '#48937e',
    rippleStroke: '#ecfdf5',
    padFill: '#4d9869',
    padHighlight: '#73b98c',
    padVein: '#33704a',
    lotusOuter: '#fef9c3',
    lotusInner: '#fde047',
    lotusCenter: '#fb923c',
    petalColors: ['#fef9c3', '#d1fae5', '#fde68a', '#ffffff'],
    pebbleFill: '#357363',
    koiPrimary: '#fcd34d',
    koiSecondary: '#ffffff',
    waterNotesHz: [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 659.25],
  },
] as const;

export const POND_THEME_BY_ID: Record<PondThemeId, PondThemeDefinition> = {
  'morning-lotus': POND_THEMES[0],
  'moonlit-koi': POND_THEMES[1],
  'jade-bamboo': POND_THEMES[2],
};

export const POND_LILY_PADS: readonly PondLilyPad[] = [
  { id: 'pad-1', x: 64, y: 66, rx: 32, ry: 23, rotation: -18, hasLotus: true, lotusScale: 0.92 },
  { id: 'pad-2', x: 108, y: 90, rx: 21, ry: 15, rotation: 34 },
  { id: 'pad-3', x: 294, y: 74, rx: 28, ry: 20, rotation: 152 },
  { id: 'pad-4', x: 288, y: 208, rx: 35, ry: 24, rotation: 122, hasLotus: true, lotusScale: 1.05 },
  { id: 'pad-5', x: 242, y: 228, rx: 22, ry: 15, rotation: -50 },
  { id: 'pad-6', x: 62, y: 214, rx: 27, ry: 19, rotation: 24 },
] as const;

export const POND_PEBBLES: readonly PondPebble[] = [
  { x: 152, y: 62, rx: 14, ry: 9, rotation: 15, opacity: 0.25 },
  { x: 174, y: 54, rx: 9, ry: 6, rotation: -18, opacity: 0.2 },
  { x: 208, y: 196, rx: 16, ry: 10, rotation: -10, opacity: 0.22 },
  { x: 126, y: 218, rx: 13, ry: 8, rotation: 22, opacity: 0.22 },
  { x: 146, y: 230, rx: 8, ry: 5, rotation: -8, opacity: 0.18 },
  { x: 318, y: 144, rx: 12, ry: 8, rotation: 35, opacity: 0.2 },
] as const;
