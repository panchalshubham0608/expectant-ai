import {
  PUZZLES_PER_KIND,
  createPuzzleId,
  type ConnectionsPuzzle,
  type DailyMindPuzzles,
  type RiddlePuzzle,
  type WordScramblePuzzle,
} from '../models/mindPuzzle';

const FALLBACK_CONNECTIONS: Omit<ConnectionsPuzzle, 'id'>[] = [
  {
    title: 'Garden & Lullaby',
    themeHint: 'Find four gentle themes hiding across nature, tea, music, and cozy baby essentials.',
    groups: [
      {
        category: 'Soothing Herbal Teas',
        difficulty: 'gentle',
        words: ['Chamomile', 'Ginger', 'Peppermint', 'Rooibos'],
      },
      {
        category: 'Gentle Lullaby Words',
        difficulty: 'cozy',
        words: ['Hush', 'Starlight', 'Cradle', 'Slumber'],
      },
      {
        category: 'Spring Blossoms',
        difficulty: 'clever',
        words: ['Jasmine', 'Lotus', 'Marigold', 'Tulip'],
      },
      {
        category: 'Soft Fabrics',
        difficulty: 'tricky',
        words: ['Muslin', 'Cashmere', 'Fleece', 'Linen'],
      },
    ],
  },
  {
    title: 'Morning Harmony',
    themeHint: 'Spot four peaceful groupings from sunlight, instruments, fruit, and calm words.',
    groups: [
      {
        category: 'Warm Tropical Fruits',
        difficulty: 'gentle',
        words: ['Mango', 'Peach', 'Apricot', 'Papaya'],
      },
      {
        category: 'Calm Musical Instruments',
        difficulty: 'cozy',
        words: ['Flute', 'Harp', 'Sitar', 'Piano'],
      },
      {
        category: 'Times of Soft Light',
        difficulty: 'clever',
        words: ['Dawn', 'Twilight', 'Dusk', 'Golden Hour'],
      },
      {
        category: 'Words Meaning Gentle',
        difficulty: 'tricky',
        words: ['Tender', 'Serene', 'Mild', 'Mellow'],
      },
    ],
  },
  {
    title: 'Cozy Kitchen & Skies',
    themeHint: 'Connect aromatic spices, cloud shapes, storybook animals, and comforting colors.',
    groups: [
      {
        category: 'Warm Baking Spices',
        difficulty: 'gentle',
        words: ['Cinnamon', 'Cardamom', 'Nutmeg', 'Vanilla'],
      },
      {
        category: 'Baby Animals',
        difficulty: 'cozy',
        words: ['Fawn', 'Duckling', 'Kitten', 'Lamb'],
      },
      {
        category: 'Pastel Shades',
        difficulty: 'clever',
        words: ['Lavender', 'Mint', 'Blush', 'Buttercup'],
      },
      {
        category: 'Things Found in the Sky',
        difficulty: 'tricky',
        words: ['Rainbow', 'Crescent', 'Cumulus', 'Aurora'],
      },
    ],
  },
  {
    title: 'Quiet Sanctuary',
    themeHint: 'Group restful rituals, soothing nature sounds, nursery pieces, and joyful virtues.',
    groups: [
      {
        category: 'Soothing Nature Sounds',
        difficulty: 'gentle',
        words: ['Rainfall', 'Birdsong', 'Waves', 'Rustling'],
      },
      {
        category: 'Cozy Nursery Items',
        difficulty: 'cozy',
        words: ['Rattle', 'Swaddle', 'Mobile', 'Nightlight'],
      },
      {
        category: 'Peaceful Pastimes',
        difficulty: 'clever',
        words: ['Knitting', 'Journaling', 'Sketching', 'Reading'],
      },
      {
        category: 'Warm Virtues',
        difficulty: 'tricky',
        words: ['Kindness', 'Patience', 'Wonder', 'Gratitude'],
      },
    ],
  },
];

const FALLBACK_WORD_SCRAMBLES: Omit<WordScramblePuzzle, 'id'>[] = [
  {
    title: 'Peaceful Nest',
    theme: 'Calm & Cozy Comforts',
    items: [
      { word: 'BLOOM', clue: 'What a flower bud does as it gently opens in sunlight.' },
      { word: 'CRADLE', clue: 'A cozy rocking bed designed for sweet newborn naps.' },
      { word: 'SERENE', clue: 'Calm, peaceful, and completely untroubled.' },
      { word: 'LULLABY', clue: 'A soft, melodic song sung to soothe a little one to sleep.' },
    ],
  },
  {
    title: 'Nature Wonders',
    theme: 'Gentle Outdoor Beauty',
    items: [
      { word: 'BREEZE', clue: 'A light, refreshing wind on a quiet afternoon.' },
      { word: 'MEADOW', clue: 'An open green field dotted with wildflowers.' },
      { word: 'RAINBOW', clue: 'A colorful arc that appears across the sky after rain.' },
      { word: 'HORIZON', clue: 'The distant line where the earth meets the sky.' },
    ],
  },
  {
    title: 'Warm Kitchen',
    theme: 'Nourishing Flavors & Aromas',
    items: [
      { word: 'HONEY', clue: 'A sweet golden nectar made by busy garden bees.' },
      { word: 'ALMOND', clue: 'A crunchy oval nut often soaked overnight or blended into milk.' },
      { word: 'SAFFRON', clue: 'A fragrant golden spice prized in warm milk and festive rice.' },
      { word: 'GINGER', clue: 'A warming root brewed into soothing tea with lemon.' },
    ],
  },
  {
    title: 'Starry Evening',
    theme: 'Quiet Nighttime Calm',
    items: [
      { word: 'DREAM', clue: 'A peaceful story your mind wanders through while sleeping.' },
      { word: 'GLOWING', clue: 'Shining softly like moonlight or a warm bedside lamp.' },
      { word: 'BLANKET', clue: 'A soft woven layer to wrap around yourself on a cool evening.' },
      { word: 'HARMONY', clue: 'Musical notes blending together in gentle agreement.' },
    ],
  },
];

const FALLBACK_RIDDLES: Omit<RiddlePuzzle, 'id'>[] = [
  {
    title: 'The Quiet Companion',
    category: 'Cozy Riddle',
    question:
      'I grow longer when the sun is low, rest quietly beside you on a morning walk, and disappear completely in the dark. What am I?',
    options: ['A shadow', 'A breeze', 'A melody', 'A footprint'],
    correctIndex: 0,
    hint: 'Think of something sunlight paints on the ground behind or ahead of you.',
    explanation:
      'Your shadow stretches long at sunrise and sunset, walks silently beside you, and vanishes when there is no light.',
  },
  {
    title: 'The Gentle Cycle',
    category: 'Pattern Spark',
    question:
      'Look at this nature-inspired sequence: Seed → Sprout → Bud → Blossom. Which stage naturally comes next in the cycle?',
    options: ['Fruit', 'Pebble', 'Cloud', 'Frost'],
    correctIndex: 0,
    hint: 'Think about what a blossom gently transforms into on a tree.',
    explanation:
      'After a flower blossoms, it develops into fruit—carrying new seeds to begin the cycle of life all over again.',
  },
  {
    title: 'The Endless Song',
    category: 'Wordplay',
    question:
      'I have keys that open no locks, space without any room, and you can press me softly to fill a quiet home with music. What am I?',
    options: ['A piano', 'A diary', 'A window', 'A lantern'],
    correctIndex: 0,
    hint: 'Picture a musical instrument with rows of black and white keys.',
    explanation:
      'A piano has musical keys rather than house keys, yet unlocks endless melodies and lullabies.',
  },
  {
    title: 'Morning Numbers',
    category: 'Number Pattern',
    question:
      'A cozy stepping-stone pattern goes: 2, 4, 8, 16, __. Which number keeps the gentle doubling pattern going?',
    options: ['24', '30', '32', '36'],
    correctIndex: 2,
    hint: 'Notice how each step is twice the number right before it.',
    explanation:
      'Each number doubles the previous one (2 → 4 → 8 → 16), and doubling 16 gives 32.',
  },
];

const withFreshId = <T extends object>(
  list: T[],
  prefix: 'connections' | 'wordScramble' | 'riddle',
  count: number
): (T & { id: string })[] => {
  const result: (T & { id: string })[] = [];
  for (let i = 0; i < count; i++) {
    const template = list[i % list.length];
    result.push({ ...template, id: createPuzzleId(prefix) });
  }
  return result;
};

export const getFallbackConnectionsPuzzles = (
  count: number = PUZZLES_PER_KIND
): ConnectionsPuzzle[] => withFreshId(FALLBACK_CONNECTIONS, 'connections', count);

export const getFallbackWordScramblePuzzles = (
  count: number = PUZZLES_PER_KIND
): WordScramblePuzzle[] => withFreshId(FALLBACK_WORD_SCRAMBLES, 'wordScramble', count);

export const getFallbackRiddlePuzzles = (count: number = PUZZLES_PER_KIND): RiddlePuzzle[] =>
  withFreshId(FALLBACK_RIDDLES, 'riddle', count);

export const getFallbackDailyMindPuzzles = (): DailyMindPuzzles => ({
  connections: getFallbackConnectionsPuzzles(PUZZLES_PER_KIND),
  wordScramble: getFallbackWordScramblePuzzles(PUZZLES_PER_KIND),
  riddle: getFallbackRiddlePuzzles(PUZZLES_PER_KIND),
  updatedAt: Date.now(),
});
