export type WishMoodKey = 'warmth' | 'joy' | 'wonder' | 'calm';

export interface CuratedBabyWish {
  id: string;
  mood: WishMoodKey;
  text: string;
}

export interface WishStarColor {
  id: string;
  label: string;
  fill: string;
  glow: string;
  textClass: string;
  badgeBg: string;
}

export interface JarStarSlot {
  x: number;
  y: number;
  size: number;
  rotation: number;
}

export interface FireflyDriftSpot {
  id: string;
  x: number;
  y: number;
  delay: string;
  duration: string;
  colorIndex: number;
}

export const WISH_MOODS: readonly { key: WishMoodKey; label: string }[] = [
  { key: 'warmth', label: 'Warmth' },
  { key: 'joy', label: 'Joy' },
  { key: 'wonder', label: 'Wonder' },
  { key: 'calm', label: 'Calm' },
] as const;

export const WISH_STAR_COLORS: readonly WishStarColor[] = [
  {
    id: 'sunbeam',
    label: 'Sunbeam',
    fill: '#fde68a',
    glow: '#f59e0b',
    textClass: 'text-amber-800',
    badgeBg: 'bg-amber-50 ring-amber-200',
  },
  {
    id: 'rosebud',
    label: 'Rosebud',
    fill: '#fbcfe8',
    glow: '#ec4899',
    textClass: 'text-rose-800',
    badgeBg: 'bg-rose-50 ring-rose-200',
  },
  {
    id: 'skyglow',
    label: 'Skyglow',
    fill: '#bae6fd',
    glow: '#38bdf8',
    textClass: 'text-sky-800',
    badgeBg: 'bg-sky-50 ring-sky-200',
  },
  {
    id: 'mintdew',
    label: 'Mintdew',
    fill: '#a7f3d0',
    glow: '#10b981',
    textClass: 'text-emerald-800',
    badgeBg: 'bg-emerald-50 ring-emerald-200',
  },
  {
    id: 'lilac',
    label: 'Lilac',
    fill: '#ddd6fe',
    glow: '#8b5cf6',
    textClass: 'text-violet-800',
    badgeBg: 'bg-violet-50 ring-violet-200',
  },
  {
    id: 'peach',
    label: 'Peach',
    fill: '#fed7aa',
    glow: '#f97316',
    textClass: 'text-orange-800',
    badgeBg: 'bg-orange-50 ring-orange-200',
  },
] as const;

export const CURATED_BABY_WISHES: readonly CuratedBabyWish[] = [
  // Warmth
  { id: 'w1', mood: 'warmth', text: 'Always know how deeply and warmly you are loved.' },
  { id: 'w2', mood: 'warmth', text: 'Soft blankets, cozy bedtime stories, and safe hugs.' },
  { id: 'w3', mood: 'warmth', text: 'A home filled with patience, kindness, and gentle voices.' },
  { id: 'w4', mood: 'warmth', text: 'Warm sunshine on your cheeks every single morning.' },
  { id: 'w5', mood: 'warmth', text: 'Kind friends who celebrate exactly who you are.' },
  { id: 'w6', mood: 'warmth', text: 'Gentle hands waiting to hold yours whenever you reach out.' },

  // Joy
  { id: 'j1', mood: 'joy', text: 'Belly giggles that light up rainy afternoons.' },
  { id: 'j2', mood: 'joy', text: 'Silly songs, happy dances, and playful little surprises.' },
  { id: 'j3', mood: 'joy', text: 'Tiny moments that make your whole face sparkle.' },
  { id: 'j4', mood: 'joy', text: 'Warm pancakes on slow, sunny weekend mornings.' },
  { id: 'j5', mood: 'joy', text: 'A heart that finds simple delight in everyday magic.' },
  { id: 'j6', mood: 'joy', text: 'Joyful footsteps splashing through spring puddles.' },

  // Wonder
  { id: 'd1', mood: 'wonder', text: 'Curious eyes ready to discover butterflies and stars.' },
  { id: 'd2', mood: 'wonder', text: 'Big daydreams and the courage to follow gentle curiosity.' },
  { id: 'd3', mood: 'wonder', text: 'Wildflowers to notice and cloud shapes to name together.' },
  { id: 'd4', mood: 'wonder', text: 'Books that open colorful worlds before bedtime.' },
  { id: 'd5', mood: 'wonder', text: 'A lifelong sense of awe for the sky, sea, and trees.' },
  { id: 'd6', mood: 'wonder', text: 'Creative little hands that love to build, paint, and explore.' },

  // Calm
  { id: 'c1', mood: 'calm', text: 'Peaceful naps and soft, dreamy nights under gentle moonlight.' },
  { id: 'c2', mood: 'calm', text: 'An unhurried life with room to breathe and simply be.' },
  { id: 'c3', mood: 'calm', text: 'Quiet inner steadiness wherever your path leads.' },
  { id: 'c4', mood: 'calm', text: 'Soft lullabies whenever the world feels too busy.' },
  { id: 'c5', mood: 'calm', text: 'Comfort in quiet mornings and cozy twilight skies.' },
  { id: 'c6', mood: 'calm', text: 'Peace wrapped gently around you, today and always.' },
] as const;

/**
 * 24 cozy bottom-to-top nestling spots inside the glass keepsake jar (belly: x 124..236, y 124..232).
 */
export const JAR_STAR_SLOTS: readonly JarStarSlot[] = [
  { x: 148, y: 224, size: 11, rotation: -10 },
  { x: 180, y: 226, size: 12, rotation: 8 },
  { x: 212, y: 223, size: 11, rotation: -6 },
  { x: 134, y: 206, size: 10, rotation: 14 },
  { x: 164, y: 208, size: 11, rotation: -12 },
  { x: 196, y: 207, size: 11, rotation: 10 },
  { x: 224, y: 205, size: 10, rotation: -15 },
  { x: 146, y: 189, size: 11, rotation: 6 },
  { x: 178, y: 191, size: 12, rotation: -8 },
  { x: 210, y: 188, size: 11, rotation: 12 },
  { x: 132, y: 172, size: 10, rotation: -14 },
  { x: 162, y: 173, size: 11, rotation: 9 },
  { x: 194, y: 174, size: 11, rotation: -7 },
  { x: 224, y: 171, size: 10, rotation: 11 },
  { x: 148, y: 155, size: 11, rotation: -9 },
  { x: 180, y: 156, size: 12, rotation: 5 },
  { x: 212, y: 154, size: 11, rotation: -11 },
  { x: 136, y: 139, size: 10, rotation: 13 },
  { x: 166, y: 138, size: 11, rotation: -6 },
  { x: 198, y: 139, size: 11, rotation: 8 },
  { x: 222, y: 138, size: 10, rotation: -12 },
  { x: 154, y: 123, size: 10, rotation: 7 },
  { x: 182, y: 122, size: 10, rotation: -5 },
  { x: 208, y: 124, size: 10, rotation: 10 },
] as const;

export const FIREFLY_DRIFT_SPOTS: readonly FireflyDriftSpot[] = [
  { id: 'ff-1', x: 54, y: 74, delay: '0s', duration: '3.6s', colorIndex: 0 },
  { id: 'ff-2', x: 86, y: 150, delay: '0.9s', duration: '4.2s', colorIndex: 1 },
  { id: 'ff-3', x: 48, y: 210, delay: '1.5s', duration: '3.9s', colorIndex: 2 },
  { id: 'ff-4', x: 304, y: 68, delay: '0.4s', duration: '4.0s', colorIndex: 4 },
  { id: 'ff-5', x: 280, y: 144, delay: '1.2s', duration: '3.5s', colorIndex: 3 },
  { id: 'ff-6', x: 314, y: 206, delay: '1.9s', duration: '4.3s', colorIndex: 5 },
] as const;

export const MAX_WISH_LENGTH = 72;

export const sanitizeWishText = (raw: string): string => {
  // Remove ASCII control characters and collapse runs of whitespace
  let cleaned = '';
  for (let i = 0; i < raw.length; i++) {
    const code = raw.charCodeAt(i);
    if (code >= 32 && code !== 127) {
      cleaned += raw[i];
    }
  }
  return cleaned.replace(/\s+/g, ' ').trim().slice(0, MAX_WISH_LENGTH);
};
