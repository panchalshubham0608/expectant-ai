import {
  Circle,
  CircleDot,
  Disc,
  Droplets,
  Flower2,
  Grid2X2,
  Grid3X3,
  Hash,
  Music,
  Palette,
  Sparkles,
  Type,
  Wind,
  type LucideIcon,
} from 'lucide-react';

export type BuiltInActivityId =
  | 'sudoku'
  | 'memory'
  | 'mandala'
  | 'breathing'
  | 'starlight-paths'
  | 'tea-pour'
  | 'lullaby-chimes'
  | 'four-in-a-row'
  | 'dots-and-boxes'
  | 'reversi'
  | 'mancala'
  | 'gomoku'
  | 'word-duel';

export type BuiltInCategoryKey = 'all' | 'two-player' | 'logic' | 'mindful';

export interface BuiltInActivityMeta {
  id: BuiltInActivityId;
  label: string;
  subtitle: string;
  description: string;
  category: Exclude<BuiltInCategoryKey, 'all'>;
  modeTag: string;
  icon: LucideIcon;
  iconClass: string;
  activeClass: string;
  badgeClass: string;
  isProgressive: boolean;
}

export const BUILT_IN_CATEGORIES: readonly {
  key: BuiltInCategoryKey;
  label: string;
}[] = [
  { key: 'all', label: 'All' },
  { key: 'two-player', label: '2P & Solo' },
  { key: 'logic', label: 'Calm Logic' },
  { key: 'mindful', label: 'Mindful' },
] as const;

/**
 * Default priority order starts with the 4 classic built-ins so brand-new profiles
 * see Mini Sudoku, Memory Match, Mandala Art, and Calm Breathing until play counts adapt.
 */
export const BUILT_IN_ACTIVITIES_CATALOG: readonly BuiltInActivityMeta[] = [
  {
    id: 'sudoku',
    label: 'Mini Sudoku',
    subtitle: '4×4 & 6×6 calm logic',
    description: 'Fill rows, columns, and boxes with no repeating digits — no timer, gentle hints.',
    category: 'logic',
    modeTag: 'Solo',
    icon: Grid3X3,
    iconClass: 'text-indigo-600',
    activeClass: 'bg-indigo-600 text-white shadow-sm',
    badgeClass: 'bg-indigo-50 text-indigo-700',
    isProgressive: false,
  },
  {
    id: 'memory',
    label: 'Memory Match',
    subtitle: 'Playful matching pairs',
    description: 'Flip soothing illustrated tiles to pair up matches across 8 rotating collections.',
    category: 'logic',
    modeTag: 'Solo',
    icon: Flower2,
    iconClass: 'text-emerald-600',
    activeClass: 'bg-emerald-600 text-white shadow-sm',
    badgeClass: 'bg-emerald-50 text-emerald-700',
    isProgressive: false,
  },
  {
    id: 'mandala',
    label: 'Mandala Art',
    subtitle: 'Tap-to-color calm',
    description: 'Color 100 handcrafted geometric, celestial, and botanical mandalas with curated palettes.',
    category: 'mindful',
    modeTag: 'Creative',
    icon: Palette,
    iconClass: 'text-violet-600',
    activeClass: 'bg-violet-600 text-white shadow-sm',
    badgeClass: 'bg-violet-50 text-violet-700',
    isProgressive: false,
  },
  {
    id: 'breathing',
    label: 'Calm Breathing',
    subtitle: 'Guided 4–2–4 pacer',
    description: 'Unwind with a gentle visual breathing orb paced at 4–2–4 or deep 4–4–6 rhythms.',
    category: 'mindful',
    modeTag: 'Mindful',
    icon: Wind,
    iconClass: 'text-sky-600',
    activeClass: 'bg-sky-600 text-white shadow-sm',
    badgeClass: 'bg-sky-50 text-sky-700',
    isProgressive: false,
  },
  {
    id: 'four-in-a-row',
    label: 'Four in a Row',
    subtitle: '2 Players · Solo vs Bot',
    description: 'Drop Baby Girl & Baby Boy tokens onto the 7×6 board and connect four in any direction.',
    category: 'two-player',
    modeTag: '2P · Solo',
    icon: CircleDot,
    iconClass: 'text-sky-600',
    activeClass: 'bg-sky-600 text-white shadow-sm',
    badgeClass: 'bg-sky-50 text-sky-700',
    isProgressive: true,
  },
  {
    id: 'dots-and-boxes',
    label: 'Dots & Boxes',
    subtitle: '2 Players · Solo vs Bot',
    description: 'Draw lines between dots to claim boxes and earn bonus turns on 3×3 to 5×5 grids.',
    category: 'two-player',
    modeTag: '2P · Solo',
    icon: Grid2X2,
    iconClass: 'text-teal-600',
    activeClass: 'bg-teal-600 text-white shadow-sm',
    badgeClass: 'bg-teal-50 text-teal-700',
    isProgressive: true,
  },
  {
    id: 'reversi',
    label: 'Reversi',
    subtitle: '2 Players · Solo vs Bot',
    description: 'Flank and flip your opponent’s stones on a crisp 6×6 quick or 8×8 classic board.',
    category: 'two-player',
    modeTag: '2P · Solo',
    icon: Disc,
    iconClass: 'text-emerald-600',
    activeClass: 'bg-emerald-600 text-white shadow-sm',
    badgeClass: 'bg-emerald-50 text-emerald-700',
    isProgressive: true,
  },
  {
    id: 'mancala',
    label: 'Mancala',
    subtitle: '2 Players · Solo vs Bot',
    description: 'Sow smooth stones counter-clockwise around the wooden board for captures & bonus turns.',
    category: 'two-player',
    modeTag: '2P · Solo',
    icon: Circle,
    iconClass: 'text-amber-600',
    activeClass: 'bg-amber-600 text-white shadow-sm',
    badgeClass: 'bg-amber-50 text-amber-800',
    isProgressive: true,
  },
  {
    id: 'gomoku',
    label: 'Five in a Row',
    subtitle: '2 Players · Solo vs Bot',
    description: 'Classic Gomoku stone strategy on a 9×9 or 11×11 grid — align five stones to win.',
    category: 'two-player',
    modeTag: '2P · Solo',
    icon: Hash,
    iconClass: 'text-amber-700',
    activeClass: 'bg-amber-700 text-white shadow-sm',
    badgeClass: 'bg-amber-50 text-amber-800',
    isProgressive: true,
  },
  {
    id: 'word-duel',
    label: 'Wordle Duel',
    subtitle: '2 Players · Solo Classic',
    description: 'Set a secret 5-letter word and pass the phone for 6 tries — or play unlimited solo words.',
    category: 'two-player',
    modeTag: '2P · Solo',
    icon: Type,
    iconClass: 'text-violet-600',
    activeClass: 'bg-violet-600 text-white shadow-sm',
    badgeClass: 'bg-violet-50 text-violet-700',
    isProgressive: true,
  },
  {
    id: 'starlight-paths',
    label: 'Starlight Paths',
    subtitle: 'Flow connect paths',
    description: 'Connect matching sky and nature icons across the full grid without crossing ribbons.',
    category: 'logic',
    modeTag: 'Solo',
    icon: Sparkles,
    iconClass: 'text-indigo-600',
    activeClass: 'bg-indigo-600 text-white shadow-sm',
    badgeClass: 'bg-indigo-50 text-indigo-700',
    isProgressive: true,
  },
  {
    id: 'tea-pour',
    label: 'Tea Pour Sort',
    subtitle: 'Soothing color sorting',
    description: 'Pour layered herbal infusions between glass jars until every shade rests neatly together.',
    category: 'logic',
    modeTag: 'Solo',
    icon: Droplets,
    iconClass: 'text-teal-600',
    activeClass: 'bg-teal-600 text-white shadow-sm',
    badgeClass: 'bg-teal-50 text-teal-700',
    isProgressive: true,
  },
  {
    id: 'lullaby-chimes',
    label: 'Lullaby Chimes',
    subtitle: 'Pentatonic music box',
    description: 'Tap glowing stars in harmonizing pentatonic scales or listen to gentle cradle lullabies.',
    category: 'mindful',
    modeTag: 'Music Box',
    icon: Music,
    iconClass: 'text-purple-600',
    activeClass: 'bg-purple-600 text-white shadow-sm',
    badgeClass: 'bg-purple-50 text-purple-700',
    isProgressive: false,
  },
] as const;

export const ALLOWED_BUILT_IN_IDS = new Set<BuiltInActivityId>(
  BUILT_IN_ACTIVITIES_CATALOG.map((item) => item.id)
);

export const BUILT_IN_ACTIVITY_BY_ID: Record<BuiltInActivityId, BuiltInActivityMeta> =
  Object.fromEntries(
    BUILT_IN_ACTIVITIES_CATALOG.map((item) => [item.id, item])
  ) as Record<BuiltInActivityId, BuiltInActivityMeta>;

const DEFAULT_ORDER_INDEX: Record<BuiltInActivityId, number> = Object.fromEntries(
  BUILT_IN_ACTIVITIES_CATALOG.map((item, idx) => [item.id, idx])
) as Record<BuiltInActivityId, number>;

export const getTopPlayedActivities = (
  playCounts: Partial<Record<BuiltInActivityId, number>>,
  count = 4
): BuiltInActivityMeta[] => {
  const sorted = [...BUILT_IN_ACTIVITIES_CATALOG].sort((a, b) => {
    const countDiff = (playCounts[b.id] ?? 0) - (playCounts[a.id] ?? 0);
    if (countDiff !== 0) return countDiff;
    return DEFAULT_ORDER_INDEX[a.id] - DEFAULT_ORDER_INDEX[b.id];
  });
  return sorted.slice(0, count);
};
