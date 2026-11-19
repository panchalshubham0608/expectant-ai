export type NurseryCategoryKey =
  | 'wall'
  | 'window'
  | 'crib'
  | 'mobile'
  | 'plush'
  | 'rug'
  | 'garland'
  | 'corner';

export type WallStyleId =
  | 'sage-mist'
  | 'buttercream'
  | 'blush-cloud'
  | 'sky-dream'
  | 'lavender-lullaby'
  | 'warm-linen';

export type WindowSkyId =
  | 'morning-sun'
  | 'daydream-blue'
  | 'peach-sunset'
  | 'starry-night'
  | 'rainbow-sky';

export type CribStyleId =
  | 'honey-oak'
  | 'cloud-white'
  | 'walnut-cozy'
  | 'sage-cradle'
  | 'canopy-dream';

export type MobileStyleId =
  | 'moon-stars'
  | 'fluffy-clouds'
  | 'little-birds'
  | 'soft-hearts'
  | 'hot-air';

export type PlushStyleId = 'teddy' | 'bunny' | 'elephant' | 'fox' | 'giraffe' | 'whale';

export type RugStyleId =
  | 'braided-cream'
  | 'rainbow-arch'
  | 'cloud-fluff'
  | 'star-medallion'
  | 'sage-woven';

export type GarlandStyleId =
  | 'warm-lights'
  | 'pastel-bunting'
  | 'star-garland'
  | 'leaf-vine'
  | 'none';

export type CornerStyleId =
  | 'rocking-chair'
  | 'bookshelf'
  | 'moon-lamp'
  | 'potted-olive'
  | 'toy-basket';

export interface NurseryConfig {
  wall: WallStyleId;
  window: WindowSkyId;
  crib: CribStyleId;
  mobile: MobileStyleId;
  plush: PlushStyleId;
  rug: RugStyleId;
  garland: GarlandStyleId;
  corner: CornerStyleId;
}

export interface NurseryOptionItem<T extends string> {
  id: T;
  label: string;
  swatch: string;
  accent?: string;
}

export const WALL_OPTIONS: readonly (NurseryOptionItem<WallStyleId> & {
  upperHex: string;
  lowerHex: string;
  trimHex: string;
  pattern: 'dots' | 'stars' | 'clouds' | 'stripes' | 'leaves' | 'crescents';
  patternHex: string;
})[] = [
  {
    id: 'sage-mist',
    label: 'Sage Mist',
    swatch: '#dceee2',
    upperHex: '#e6f2ea',
    lowerHex: '#d4e7da',
    trimHex: '#f6faf7',
    pattern: 'leaves',
    patternHex: '#b7d6c2',
  },
  {
    id: 'buttercream',
    label: 'Buttercream',
    swatch: '#fef3c7',
    upperHex: '#fffbeb',
    lowerHex: '#f8ebd0',
    trimHex: '#ffffff',
    pattern: 'stars',
    patternHex: '#edd69d',
  },
  {
    id: 'blush-cloud',
    label: 'Blush Cloud',
    swatch: '#ffe4e6',
    upperHex: '#fff1f2',
    lowerHex: '#f9dde2',
    trimHex: '#ffffff',
    pattern: 'dots',
    patternHex: '#f4c2cb',
  },
  {
    id: 'sky-dream',
    label: 'Sky Dream',
    swatch: '#e0f2fe',
    upperHex: '#eff8ff',
    lowerHex: '#d8ecfb',
    trimHex: '#ffffff',
    pattern: 'clouds',
    patternHex: '#c0dff7',
  },
  {
    id: 'lavender-lullaby',
    label: 'Lavender',
    swatch: '#ede9fe',
    upperHex: '#f5f3ff',
    lowerHex: '#e5dff9',
    trimHex: '#ffffff',
    pattern: 'crescents',
    patternHex: '#cfc4f2',
  },
  {
    id: 'warm-linen',
    label: 'Warm Linen',
    swatch: '#f3eadf',
    upperHex: '#faf5ef',
    lowerHex: '#ede2d4',
    trimHex: '#ffffff',
    pattern: 'stripes',
    patternHex: '#e6dacb',
  },
] as const;

export const WINDOW_OPTIONS: readonly NurseryOptionItem<WindowSkyId>[] = [
  { id: 'morning-sun', label: 'Morning Sun', swatch: '#fde68a' },
  { id: 'daydream-blue', label: 'Daydream', swatch: '#93c5fd' },
  { id: 'peach-sunset', label: 'Peach Sunset', swatch: '#fdba74' },
  { id: 'starry-night', label: 'Starry Night', swatch: '#312e81' },
  { id: 'rainbow-sky', label: 'Rainbow Sky', swatch: '#f9a8d4' },
] as const;

export const CRIB_OPTIONS: readonly (NurseryOptionItem<CribStyleId> & {
  frameHex: string;
  frameDarkHex: string;
  blanketHex: string;
  blanketTrimHex: string;
  pillowHex: string;
  hasCanopy?: boolean;
})[] = [
  {
    id: 'honey-oak',
    label: 'Honey Oak',
    swatch: '#d6a56c',
    frameHex: '#d6a56c',
    frameDarkHex: '#b8834b',
    blanketHex: '#a7d7c5',
    blanketTrimHex: '#e6f5ef',
    pillowHex: '#fef3c7',
  },
  {
    id: 'cloud-white',
    label: 'Cloud White',
    swatch: '#f8fafc',
    frameHex: '#ffffff',
    frameDarkHex: '#cbd5e1',
    blanketHex: '#fbcfe8',
    blanketTrimHex: '#fff1f2',
    pillowHex: '#e0e7ff',
  },
  {
    id: 'walnut-cozy',
    label: 'Walnut',
    swatch: '#8b5e3c',
    frameHex: '#92623f',
    frameDarkHex: '#6b452a',
    blanketHex: '#fde68a',
    blanketTrimHex: '#fffbeb',
    pillowHex: '#fed7aa',
  },
  {
    id: 'sage-cradle',
    label: 'Sage Wood',
    swatch: '#86b599',
    frameHex: '#8bb89d',
    frameDarkHex: '#6c987e',
    blanketHex: '#fed7aa',
    blanketTrimHex: '#fff7ed',
    pillowHex: '#fef9c3',
  },
  {
    id: 'canopy-dream',
    label: 'Canopy',
    swatch: '#ddd6fe',
    frameHex: '#ffffff',
    frameDarkHex: '#cbd5e1',
    blanketHex: '#c4b5fd',
    blanketTrimHex: '#f5f3ff',
    pillowHex: '#fce7f3',
    hasCanopy: true,
  },
] as const;

export const MOBILE_OPTIONS: readonly NurseryOptionItem<MobileStyleId>[] = [
  { id: 'moon-stars', label: 'Moon & Stars', swatch: '#fde68a' },
  { id: 'fluffy-clouds', label: 'Clouds', swatch: '#bae6fd' },
  { id: 'little-birds', label: 'Little Birds', swatch: '#a7f3d0' },
  { id: 'soft-hearts', label: 'Soft Hearts', swatch: '#fecdd3' },
  { id: 'hot-air', label: 'Balloons', swatch: '#ddd6fe' },
] as const;

export const PLUSH_OPTIONS: readonly NurseryOptionItem<PlushStyleId>[] = [
  { id: 'teddy', label: 'Honey Bear', swatch: '#d4a373' },
  { id: 'bunny', label: 'Snow Bunny', swatch: '#f8fafc' },
  { id: 'elephant', label: 'Elephant', swatch: '#94a3b8' },
  { id: 'fox', label: 'Little Fox', swatch: '#fb923c' },
  { id: 'giraffe', label: 'Giraffe', swatch: '#fcd34d' },
  { id: 'whale', label: 'Dream Whale', swatch: '#7dd3fc' },
] as const;

export const RUG_OPTIONS: readonly NurseryOptionItem<RugStyleId>[] = [
  { id: 'braided-cream', label: 'Braided Cream', swatch: '#f3e8d8' },
  { id: 'rainbow-arch', label: 'Rainbow', swatch: '#fda4af' },
  { id: 'cloud-fluff', label: 'Cloud Fluff', swatch: '#f8fafc' },
  { id: 'star-medallion', label: 'Starlight', swatch: '#c7d2fe' },
  { id: 'sage-woven', label: 'Sage Woven', swatch: '#bbf7d0' },
] as const;

export const GARLAND_OPTIONS: readonly NurseryOptionItem<GarlandStyleId>[] = [
  { id: 'warm-lights', label: 'Fairy Lights', swatch: '#fde68a' },
  { id: 'pastel-bunting', label: 'Bunting', swatch: '#fbcfe8' },
  { id: 'star-garland', label: 'Stars', swatch: '#c7d2fe' },
  { id: 'leaf-vine', label: 'Leaf Vine', swatch: '#86efac' },
  { id: 'none', label: 'Clean Wall', swatch: '#f1f5f9' },
] as const;

export const CORNER_OPTIONS: readonly NurseryOptionItem<CornerStyleId>[] = [
  { id: 'rocking-chair', label: 'Rocker', swatch: '#d6a56c' },
  { id: 'bookshelf', label: 'Bookshelf', swatch: '#93c5fd' },
  { id: 'moon-lamp', label: 'Moon Lamp', swatch: '#fde68a' },
  { id: 'potted-olive', label: 'Olive Plant', swatch: '#86efac' },
  { id: 'toy-basket', label: 'Toy Basket', swatch: '#e7d3b8' },
] as const;

export const NURSERY_CATEGORIES: readonly { key: NurseryCategoryKey; label: string }[] = [
  { key: 'wall', label: 'Wall' },
  { key: 'window', label: 'Window' },
  { key: 'crib', label: 'Crib' },
  { key: 'mobile', label: 'Mobile' },
  { key: 'plush', label: 'Plush' },
  { key: 'rug', label: 'Rug' },
  { key: 'garland', label: 'Garland' },
  { key: 'corner', label: 'Corner' },
] as const;

export const DEFAULT_NURSERY_CONFIG: NurseryConfig = {
  wall: 'sage-mist',
  window: 'morning-sun',
  crib: 'honey-oak',
  mobile: 'moon-stars',
  plush: 'teddy',
  rug: 'braided-cream',
  garland: 'warm-lights',
  corner: 'rocking-chair',
};

export const NURSERY_PRESETS: readonly { name: string; config: NurseryConfig }[] = [
  {
    name: 'Woodland Morning',
    config: {
      wall: 'sage-mist',
      window: 'morning-sun',
      crib: 'honey-oak',
      mobile: 'little-birds',
      plush: 'fox',
      rug: 'sage-woven',
      garland: 'leaf-vine',
      corner: 'potted-olive',
    },
  },
  {
    name: 'Starry Lullaby',
    config: {
      wall: 'lavender-lullaby',
      window: 'starry-night',
      crib: 'canopy-dream',
      mobile: 'moon-stars',
      plush: 'bunny',
      rug: 'star-medallion',
      garland: 'warm-lights',
      corner: 'moon-lamp',
    },
  },
  {
    name: 'Cloud Nine Daydream',
    config: {
      wall: 'sky-dream',
      window: 'daydream-blue',
      crib: 'cloud-white',
      mobile: 'fluffy-clouds',
      plush: 'whale',
      rug: 'cloud-fluff',
      garland: 'star-garland',
      corner: 'bookshelf',
    },
  },
  {
    name: 'Peachy Sunset',
    config: {
      wall: 'buttercream',
      window: 'peach-sunset',
      crib: 'walnut-cozy',
      mobile: 'hot-air',
      plush: 'giraffe',
      rug: 'braided-cream',
      garland: 'warm-lights',
      corner: 'rocking-chair',
    },
  },
  {
    name: 'Blush Rainbow Nest',
    config: {
      wall: 'blush-cloud',
      window: 'rainbow-sky',
      crib: 'cloud-white',
      mobile: 'soft-hearts',
      plush: 'elephant',
      rug: 'rainbow-arch',
      garland: 'pastel-bunting',
      corner: 'toy-basket',
    },
  },
  {
    name: 'Warm Boho Linen',
    config: {
      wall: 'warm-linen',
      window: 'morning-sun',
      crib: 'sage-cradle',
      mobile: 'moon-stars',
      plush: 'teddy',
      rug: 'braided-cream',
      garland: 'leaf-vine',
      corner: 'toy-basket',
    },
  },
] as const;

export const NURSERY_ALLOW_SETS = {
  wall: new Set<string>(WALL_OPTIONS.map((o) => o.id)),
  window: new Set<string>(WINDOW_OPTIONS.map((o) => o.id)),
  crib: new Set<string>(CRIB_OPTIONS.map((o) => o.id)),
  mobile: new Set<string>(MOBILE_OPTIONS.map((o) => o.id)),
  plush: new Set<string>(PLUSH_OPTIONS.map((o) => o.id)),
  rug: new Set<string>(RUG_OPTIONS.map((o) => o.id)),
  garland: new Set<string>(GARLAND_OPTIONS.map((o) => o.id)),
  corner: new Set<string>(CORNER_OPTIONS.map((o) => o.id)),
} as const;

export const buildRandomNurseryConfig = (): NurseryConfig => {
  const pick = <T extends string>(list: readonly NurseryOptionItem<T>[]): T =>
    list[Math.floor(Math.random() * list.length)].id;

  return {
    wall: pick(WALL_OPTIONS),
    window: pick(WINDOW_OPTIONS),
    crib: pick(CRIB_OPTIONS),
    mobile: pick(MOBILE_OPTIONS),
    plush: pick(PLUSH_OPTIONS),
    rug: pick(RUG_OPTIONS),
    garland: pick(GARLAND_OPTIONS),
    corner: pick(CORNER_OPTIONS),
  };
};
