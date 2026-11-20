import {
  DEFAULT_DAILY_MIX_ALLOCATION,
  DEFAULT_PUZZLES_PER_KIND,
  createPuzzleId,
  type DailyMindPuzzles,
  type DailyMixAllocation,
  type FiveCluesPuzzle,
  type MindPuzzleKind,
  type RebusPuzzle,
  type RiddlePuzzle,
  type WordScramblePuzzle,
} from '../models/mindPuzzle';

const FALLBACK_FIVE_CLUES: Omit<FiveCluesPuzzle, 'id'>[] = [
  {
    title: 'The Crimson Thread',
    category: 'Kitchen Wonder',
    clues: [
      'I am harvested by hand at dawn before the morning sun opens my purple petals.',
      'Weight for weight, I have long been prized more dearly than gold.',
      'Just two or three of my delicate crimson threads can tint a whole pot bright golden.',
      'I lend my floral warmth to paella, biryani, and soothing warm evening milk.',
      'I come from the dried stigmas of a small autumn crocus flower.',
    ],
    options: ['Saffron', 'Cardamom', 'Turmeric', 'Cinnamon'],
    correctIndex: 0,
    explanation:
      'Saffron threads are carefully picked from autumn crocus blossoms and give warm milk and festive rice their signature golden glow.',
  },
  {
    title: 'The Floating City',
    category: 'World Place',
    clues: [
      'My neighborhoods rest upon millions of ancient timber pilings beneath calm lagoon waters.',
      'Instead of traffic horns, you hear gentle oars and water taxis gliding down curved lanes.',
      'More than four hundred footbridges link my small islands together.',
      'I am famous for pastel palaces, hand-blown Murano glass, and carnival masks.',
      'Gondolas drift past St. Mark’s Square along my Grand Canal in northern Italy.',
    ],
    options: ['Amsterdam', 'Venice', 'Kyoto', 'Lisbon'],
    correctIndex: 1,
    explanation:
      'Venice is built across a peaceful lagoon of more than 100 islands linked by canals and footbridges.',
  },
  {
    title: 'The Pocket Navigator',
    category: 'Everyday Invention',
    clues: [
      'My earliest versions were spoon-shaped stones resting quietly on polished bronze plates.',
      'I respond to an invisible force wrapping the entire Earth from pole to pole.',
      'Sailors trusted me even when thick clouds hid the stars and shoreline.',
      'Turn my case any way you like, and my slender needle still insists on pointing one way.',
      'Hikers and travelers check my N, E, S, and W dial to always find North.',
    ],
    options: ['A Sundial', 'A Telescope', 'A Compass', 'An Hourglass'],
    correctIndex: 2,
    explanation:
      'A magnetic compass aligns with Earth’s magnetic field, guiding travelers reliably through cloud and fog.',
  },
  {
    title: 'The Paper Blossom',
    category: 'Art & Craft',
    clues: [
      'I begin with nothing more than a single crisp square and two patient hands.',
      'No scissors and no glue are needed to bring my shapes to life.',
      'Valley folds and mountain folds turn a flat sheet into birds, stars, or lotus flowers.',
      'Tradition says folding a thousand of my cranes carries peace and heartfelt wishes.',
      'My Japanese name literally means "folding paper."',
    ],
    options: ['Calligraphy', 'Kintsugi', 'Ikebana', 'Origami'],
    correctIndex: 3,
    explanation:
      'Origami (from "ori" to fold and "kami" paper) transforms simple paper squares into delicate sculptures.',
  },
  {
    title: 'The Sky’s Curtain',
    category: 'Nature Wonder',
    clues: [
      'My story begins ninety-three million miles away in bursts of charged solar wind.',
      'I shimmer highest in crisp, dark winter skies near the polar circles.',
      'Quiet ribbons of emerald green, violet, and soft rose ripple overhead without a sound.',
      'Travelers gather in Iceland, Norway, and northern Canada hoping to catch my dance.',
      'I am also lovingly known as the Northern Lights.',
    ],
    options: ['Aurora Borealis', 'Meteor Shower', 'Lunar Eclipse', 'Rainbow'],
    correctIndex: 0,
    explanation:
      'The Aurora Borealis lights up polar skies when solar particles gently collide with gases high in Earth’s atmosphere.',
  },
  {
    title: 'The Coastal Beacon',
    category: 'Seaside Classic',
    clues: [
      'I stand solitary where restless tides meet rocky headlands.',
      'My spiral staircase climbs toward a quiet room made almost entirely of glass.',
      'A clever Fresnel lens turns a single warm light into a beam visible for miles.',
      'Even in thick coastal mist, sailors recognize my steady rotating flash.',
      'I am a tall seaside tower built to guide ships safely home.',
    ],
    options: ['A Windmill', 'A Lighthouse', 'A Bell Tower', 'An Observatory'],
    correctIndex: 1,
    explanation:
      'Lighthouses use stepped Fresnel lenses to project a calm, steady beacon far across dark waters.',
  },
];

const FALLBACK_REBUS: Omit<RebusPuzzle, 'id'>[] = [
  {
    title: 'Stacked Meaning',
    category: 'Word Picture',
    visual: {
      layout: 'stack',
      primary: 'STAND',
      secondary: 'I',
    },
    options: ['I understand', 'Stand over me', 'Underneath it all', 'I stand under'],
    correctIndex: 0,
    hint: 'Read where the letter "I" sits relative to the word "STAND".',
    explanation: 'The letter "I" sits right underneath "STAND" — reading it aloud gives "I understand"!',
  },
  {
    title: 'Hidden in the Middle',
    category: 'Word Picture',
    visual: {
      layout: 'between',
      primary: 'LINE',
      secondary: 'read',
      accent: 'LINE',
    },
    options: ['Line by line', 'Read between the lines', 'Reading online', 'Across the lines'],
    correctIndex: 1,
    hint: 'Notice where the word "read" is tucked.',
    explanation: '"Read" sits right between two "LINE"s — "Read between the lines"!',
  },
  {
    title: 'Creative Frame',
    category: 'Word Picture',
    visual: {
      layout: 'box',
      primary: 'THINK',
      secondary: 'BOX',
      boxPlacement: 'outside',
    },
    options: ['Think inside the box', 'Out of the box', 'Think outside the box', 'Boxed-in thoughts'],
    correctIndex: 2,
    hint: 'Look at where the word "THINK" floats in relation to the drawn square.',
    explanation: '"THINK" is placed right outside the box — "Think outside the box"!',
  },
  {
    title: 'Whisper Scale',
    category: 'Word Picture',
    visual: {
      layout: 'size',
      primary: 'talk',
      sizeVariant: 'tiny',
    },
    options: ['Short talk', 'Sweet talk', 'Whispered talk', 'Small talk'],
    correctIndex: 3,
    hint: 'Pay attention to how tiny the word looks inside the card.',
    explanation: 'A tiny "talk" visually spells out the everyday phrase "Small talk"!',
  },
  {
    title: 'Bright Hue',
    category: 'Word Picture',
    visual: {
      layout: 'colorWord',
      primary: 'LINING',
      color: 'silver',
    },
    options: ['Silver lining', 'Silver screen', 'Shining line', 'Gray lining'],
    correctIndex: 0,
    hint: 'Combine the color of the letters with the word itself.',
    explanation: 'The word "LINING" colored in shimmering silver gives "Silver lining"!',
  },
  {
    title: 'Flipped Treat',
    category: 'Word Picture',
    visual: {
      layout: 'direction',
      primary: 'CAKE',
      direction: 'upsideDown',
    },
    options: ['Turn the cake', 'Upside-down cake', 'Flip a cake', 'Backwards cake'],
    correctIndex: 1,
    hint: 'Notice which way the bakery word is turned.',
    explanation: '"CAKE" turned completely upside down gives "Upside-down cake"!',
  },
  {
    title: 'Morning Pause',
    category: 'Word Picture',
    visual: {
      layout: 'split',
      primary: 'COFF',
      secondary: 'EE',
    },
    options: ['Half a coffee', 'Split the coffee', 'Coffee break', 'Broken coffee'],
    correctIndex: 2,
    hint: 'Look at what happened right in the middle of the word "COFFEE".',
    explanation: 'A crisp break right through the middle of "COFFEE" gives "Coffee break"!',
  },
  {
    title: 'Three of a Kind',
    category: 'Word Picture',
    visual: {
      layout: 'repeat',
      primary: 'CYCLE',
      repeatCount: 3,
    },
    options: ['Three cycles', 'Cycle again', 'Triple cycle', 'Tricycle'],
    correctIndex: 3,
    hint: 'Count how many times the word appears on the card.',
    explanation: 'Three stacked "CYCLE"s literally read as "Tricycle"!',
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
  {
    title: 'Botanical Garden',
    theme: 'Fragrant Flowers & Leaves',
    items: [
      { word: 'PETAL', clue: 'A delicate colorful leaf forming part of a flower’s blossom.' },
      { word: 'JASMINE', clue: 'A small white flower prized for its sweet evening fragrance.' },
      { word: 'ORCHARD', clue: 'A sunny grove where fruit trees grow in neat rows.' },
      { word: 'CLOVER', clue: 'A soft green meadow plant sometimes found with four leaves.' },
    ],
  },
  {
    title: 'Cozy Study',
    theme: 'Stories & Quiet Pastimes',
    items: [
      { word: 'NOVEL', clue: 'A long fictional book to curl up with on a rainy afternoon.' },
      { word: 'SKETCH', clue: 'A quick, gentle pencil drawing capturing an idea.' },
      { word: 'LANTERN', clue: 'A portable warm light encased in glass or paper.' },
      { word: 'JOURNAL', clue: 'A personal notebook filled with daily thoughts and memories.' },
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
  {
    title: 'The Wandering Traveler',
    category: 'Cozy Riddle',
    question:
      'I travel all around the world in neat envelopes while staying quietly in one tiny corner. What am I?',
    options: ['A compass', 'A postage stamp', 'A postcard', 'A ribbon'],
    correctIndex: 1,
    hint: 'Look at the top-right corner of a letter sent to a friend.',
    explanation:
      'A postage stamp stays tucked in the corner of an envelope as it journeys anywhere in the world.',
  },
  {
    title: 'Echoing Letters',
    category: 'Wordplay',
    question:
      'What single everyday English word becomes shorter the moment you add two letters to it?',
    options: ['Tiny', 'Brief', 'Short', 'Small'],
    correctIndex: 2,
    hint: 'Read the clue very literally—add "er" to one of the choices.',
    explanation: 'Adding the two letters "er" to the word "Short" literally turns it into "Shorter"!',
  },
];

const withFreshId = <T extends object>(
  list: T[],
  prefix: MindPuzzleKind,
  count: number
): (T & { id: string })[] => {
  const result: (T & { id: string })[] = [];
  for (let i = 0; i < count; i++) {
    const template = list[i % list.length];
    result.push({ ...template, id: createPuzzleId(prefix) });
  }
  return result;
};

export const getFallbackFiveCluesPuzzles = (
  count: number = DEFAULT_PUZZLES_PER_KIND
): FiveCluesPuzzle[] => withFreshId(FALLBACK_FIVE_CLUES, 'fiveClues', count);

export const getFallbackRebusPuzzles = (
  count: number = DEFAULT_PUZZLES_PER_KIND
): RebusPuzzle[] => withFreshId(FALLBACK_REBUS, 'rebus', count);

export const getFallbackWordScramblePuzzles = (
  count: number = DEFAULT_PUZZLES_PER_KIND
): WordScramblePuzzle[] => withFreshId(FALLBACK_WORD_SCRAMBLES, 'wordScramble', count);

export const getFallbackRiddlePuzzles = (
  count: number = DEFAULT_PUZZLES_PER_KIND
): RiddlePuzzle[] => withFreshId(FALLBACK_RIDDLES, 'riddle', count);

export const getFallbackDailyMindPuzzles = (
  allocation: DailyMixAllocation = DEFAULT_DAILY_MIX_ALLOCATION
): DailyMindPuzzles => ({
  fiveClues: getFallbackFiveCluesPuzzles(allocation.fiveClues),
  rebus: getFallbackRebusPuzzles(allocation.rebus),
  wordScramble: getFallbackWordScramblePuzzles(allocation.wordScramble),
  riddle: getFallbackRiddlePuzzles(allocation.riddle),
  updatedAt: Date.now(),
});
