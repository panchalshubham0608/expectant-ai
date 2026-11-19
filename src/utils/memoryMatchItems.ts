export interface MemorySymbolDefinition {
  pairId: string;
  symbol: string;
  label: string;
  tint: string;
}

const TINT = {
  fruits: 'bg-rose-50 ring-rose-200',
  foods: 'bg-amber-50 ring-amber-200',
  animals: 'bg-emerald-50 ring-emerald-200',
  nature: 'bg-teal-50 ring-teal-200',
  vehicles: 'bg-sky-50 ring-sky-200',
  smileys: 'bg-yellow-50 ring-yellow-200',
  play: 'bg-violet-50 ring-violet-200',
  cozy: 'bg-indigo-50 ring-indigo-200',
} as const;

const makeGroup = (
  tint: string,
  entries: readonly [pairId: string, symbol: string, label: string][]
): MemorySymbolDefinition[] =>
  entries.map(([pairId, symbol, label]) => ({ pairId, symbol, label, tint }));

export const MEMORY_MATCH_ITEMS: readonly MemorySymbolDefinition[] = [
  // Fruits & Veggies (22)
  ...makeGroup(TINT.fruits, [
    ['strawberry', '🍓', 'Strawberry'],
    ['apple', '🍎', 'Red Apple'],
    ['pear', '🍐', 'Pear'],
    ['tangerine', '🍊', 'Tangerine'],
    ['lemon', '🍋', 'Lemon'],
    ['banana', '🍌', 'Banana'],
    ['watermelon', '🍉', 'Watermelon'],
    ['grapes', '🍇', 'Grapes'],
    ['cherries', '🍒', 'Cherries'],
    ['peach', '🍑', 'Peach'],
    ['mango', '🥭', 'Mango'],
    ['pineapple', '🍍', 'Pineapple'],
    ['coconut', '🥥', 'Coconut'],
    ['kiwi', '🥝', 'Kiwi'],
    ['melon', '🍈', 'Melon'],
    ['blueberries', '🫐', 'Blueberries'],
    ['avocado', '🥑', 'Avocado'],
    ['tomato', '🍅', 'Tomato'],
    ['olive', '🫒', 'Olive'],
    ['corn', '🌽', 'Sweet Corn'],
    ['carrot', '🥕', 'Carrot'],
    ['bell-pepper', '🫑', 'Bell Pepper'],
  ]),

  // Cozy Foods & Treats (22)
  ...makeGroup(TINT.foods, [
    ['croissant', '🥐', 'Croissant'],
    ['pretzel', '🥨', 'Pretzel'],
    ['pancakes', '🥞', 'Pancakes'],
    ['waffle', '🧇', 'Waffle'],
    ['cheese', '🧀', 'Cheese'],
    ['pizza', '🍕', 'Pizza'],
    ['taco', '🌮', 'Taco'],
    ['sandwich', '🥪', 'Sandwich'],
    ['noodles', '🍜', 'Noodle Bowl'],
    ['dumpling', '🥟', 'Dumpling'],
    ['sushi', '🍣', 'Sushi'],
    ['ice-cream', '🍦', 'Ice Cream'],
    ['cupcake', '🧁', 'Cupcake'],
    ['cake', '🍰', 'Cake Slice'],
    ['cookie', '🍪', 'Cookie'],
    ['donut', '🍩', 'Donut'],
    ['chocolate', '🍫', 'Chocolate'],
    ['honey', '🍯', 'Honey Pot'],
    ['teapot', '🫖', 'Teapot'],
    ['warm-cup', '☕', 'Warm Cup'],
    ['juice-box', '🧃', 'Juice Box'],
    ['popcorn', '🍿', 'Popcorn'],
  ]),

  // Cute Animals (26)
  ...makeGroup(TINT.animals, [
    ['puppy', '🐶', 'Puppy'],
    ['kitten', '🐱', 'Kitten'],
    ['bunny', '🐰', 'Bunny'],
    ['fox', '🦊', 'Fox'],
    ['bear', '🐻', 'Bear'],
    ['panda', '🐼', 'Panda'],
    ['koala', '🐨', 'Koala'],
    ['tiger', '🐯', 'Tiger'],
    ['lion', '🦁', 'Lion'],
    ['cow', '🐮', 'Cow'],
    ['piglet', '🐷', 'Piglet'],
    ['frog', '🐸', 'Frog'],
    ['monkey', '🐵', 'Monkey'],
    ['chick', '🐥', 'Baby Chick'],
    ['penguin', '🐧', 'Penguin'],
    ['owl', '🦉', 'Owl'],
    ['duck', '🦆', 'Duck'],
    ['swan', '🦢', 'Swan'],
    ['turtle', '🐢', 'Turtle'],
    ['octopus', '🐙', 'Octopus'],
    ['dolphin', '🐬', 'Dolphin'],
    ['whale', '🐳', 'Whale'],
    ['butterfly', '🦋', 'Butterfly'],
    ['honeybee', '🐝', 'Honeybee'],
    ['ladybug', '🐞', 'Ladybug'],
    ['snail', '🐌', 'Snail'],
  ]),

  // Nature & Sky (20)
  ...makeGroup(TINT.nature, [
    ['blossom', '🌸', 'Cherry Blossom'],
    ['daisy', '🌼', 'Wild Daisy'],
    ['sunflower', '🌻', 'Sunflower'],
    ['tulip', '🌷', 'Tulip'],
    ['hibiscus', '🌺', 'Hibiscus'],
    ['lotus', '🪷', 'Lotus'],
    ['rose', '🌹', 'Rose'],
    ['clover', '🍀', 'Four-Leaf Clover'],
    ['leaf', '🌿', 'Botanical Leaf'],
    ['maple-leaf', '🍁', 'Maple Leaf'],
    ['cactus', '🌵', 'Cactus'],
    ['palm-tree', '🌴', 'Palm Tree'],
    ['mushroom', '🍄', 'Mushroom'],
    ['sun', '☀️', 'Sunshine'],
    ['moon', '🌙', 'Crescent Moon'],
    ['star', '⭐', 'Golden Star'],
    ['rainbow', '🌈', 'Rainbow'],
    ['cloud', '☁️', 'Soft Cloud'],
    ['snowflake', '❄️', 'Snowflake'],
    ['wave', '🌊', 'Ocean Wave'],
  ]),

  // Vehicles & Travel (18)
  ...makeGroup(TINT.vehicles, [
    ['car', '🚗', 'Car'],
    ['taxi', '🚕', 'Taxi'],
    ['bus', '🚌', 'Bus'],
    ['bicycle', '🚲', 'Bicycle'],
    ['scooter', '🛵', 'Scooter'],
    ['train', '🚂', 'Locomotive'],
    ['bullet-train', '🚄', 'High-Speed Train'],
    ['airplane', '✈️', 'Airplane'],
    ['rocket', '🚀', 'Rocket'],
    ['helicopter', '🚁', 'Helicopter'],
    ['sailboat', '⛵', 'Sailboat'],
    ['ship', '🚢', 'Ship'],
    ['canoe', '🛶', 'Canoe'],
    ['balloon', '🎈', 'Balloon'],
    ['parachute', '🪂', 'Parachute'],
    ['compass', '🧭', 'Compass'],
    ['tent', '⛺', 'Camping Tent'],
    ['island', '🏝️', 'Tropical Island'],
  ]),

  // Happy Smileys, Hearts & Sweet Touches (16)
  ...makeGroup(TINT.smileys, [
    ['smile', '😊', 'Warm Smile'],
    ['heart-eyes', '😍', 'Heart Eyes'],
    ['party-face', '🥳', 'Party Face'],
    ['cool-face', '😎', 'Cool Shades'],
    ['hug-face', '🤗', 'Warm Hug'],
    ['sleepy-face', '😴', 'Sleepy Face'],
    ['star-struck', '🤩', 'Star-Struck'],
    ['angel-smile', '😇', 'Peaceful Smile'],
    ['love-hearts', '🥰', 'Smiling Hearts'],
    ['heart-hands', '🫶', 'Heart Hands'],
    ['yellow-heart', '💛', 'Yellow Heart'],
    ['sparkling-heart', '💖', 'Sparkling Heart'],
    ['teddy-bear', '🧸', 'Teddy Bear'],
    ['ribbon', '🎀', 'Ribbon Bow'],
    ['crown', '👑', 'Crown'],
    ['sparkles', '✨', 'Sparkles'],
  ]),

  // Music, Art & Play (18)
  ...makeGroup(TINT.play, [
    ['music-note', '🎵', 'Music Note'],
    ['guitar', '🎸', 'Guitar'],
    ['piano', '🎹', 'Piano'],
    ['trumpet', '🎺', 'Trumpet'],
    ['violin', '🎻', 'Violin'],
    ['drum', '🥁', 'Drum'],
    ['palette', '🎨', 'Paint Palette'],
    ['crayon', '🖍️', 'Crayon'],
    ['books', '📚', 'Books'],
    ['kite', '🪁', 'Kite'],
    ['puzzle-piece', '🧩', 'Puzzle Piece'],
    ['game-die', '🎲', 'Game Die'],
    ['chess-pawn', '♟️', 'Chess Piece'],
    ['soccer', '⚽', 'Soccer Ball'],
    ['basketball', '🏀', 'Basketball'],
    ['tennis', '🎾', 'Tennis Ball'],
    ['trophy', '🏆', 'Trophy'],
    ['gift', '🎁', 'Gift Box'],
  ]),

  // Cozy Home & Everyday (16)
  ...makeGroup(TINT.cozy, [
    ['cozy-home', '🏡', 'Cozy Home'],
    ['sofa', '🛋️', 'Comfy Sofa'],
    ['potted-plant', '🪴', 'Potted Plant'],
    ['candle', '🕯️', 'Candle'],
    ['alarm-clock', '⏰', 'Alarm Clock'],
    ['key', '🔑', 'Golden Key'],
    ['umbrella', '☂️', 'Umbrella'],
    ['glasses', '👓', 'Glasses'],
    ['scarf', '🧣', 'Cozy Scarf'],
    ['socks', '🧦', 'Warm Socks'],
    ['backpack', '🎒', 'Backpack'],
    ['camera', '📷', 'Camera'],
    ['light-bulb', '💡', 'Light Bulb'],
    ['telescope', '🔭', 'Telescope'],
    ['magnet', '🧲', 'Magnet'],
    ['gem', '💎', 'Sparkling Gem'],
  ]),
];

export const MEMORY_MATCH_ITEM_BY_ID: ReadonlyMap<string, MemorySymbolDefinition> = new Map(
  MEMORY_MATCH_ITEMS.map((item) => [item.pairId, item])
);

export const MEMORY_MATCH_ALLOWED_IDS: ReadonlySet<string> = new Set(
  MEMORY_MATCH_ITEMS.map((item) => item.pairId)
);
