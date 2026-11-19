import { useMemo, useState } from 'react';
import {
  Heart,
  RotateCcw,
  Shuffle,
  Sparkles,
  Star,
} from 'lucide-react';
import {
  CURATED_BABY_WISHES,
  FIREFLY_DRIFT_SPOTS,
  JAR_STAR_SLOTS,
  MAX_WISH_LENGTH,
  WISH_MOODS,
  WISH_STAR_COLORS,
  sanitizeWishText,
  type WishMoodKey,
} from '../../utils/wishesJarData';

interface JarWishEntry {
  id: number;
  text: string;
  colorIndex: number;
  slotIndex: number;
}

const buildMiniStarPoints = (cx: number, cy: number, r: number): string => {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.45;
    pts.push(`${(cx + Math.cos(angle) * rad).toFixed(1)},${(cy + Math.sin(angle) * rad).toFixed(1)}`);
  }
  return pts.join(' ');
};

export default function WishesJarActivity() {
  const [wishes, setWishes] = useState<JarWishEntry[]>(() => [
    {
      id: 1,
      text: CURATED_BABY_WISHES[0].text,
      colorIndex: 0,
      slotIndex: 0,
    },
  ]);
  const [activeMood, setActiveMood] = useState<WishMoodKey>('warmth');
  const [selectedColorIndex, setSelectedColorIndex] = useState<number>(0);
  const [customWish, setCustomWish] = useState<string>('');
  const [caughtFireflyId, setCaughtFireflyId] = useState<string | null>(null);
  const [spotlightWishId, setSpotlightWishId] = useState<number | null>(1);
  const [nextId, setNextId] = useState<number>(2);

  const moodWishes = useMemo(
    () => CURATED_BABY_WISHES.filter((w) => w.mood === activeMood),
    [activeMood]
  );

  const spotlightWish = useMemo(
    () => wishes.find((w) => w.id === spotlightWishId) ?? wishes[wishes.length - 1] ?? null,
    [wishes, spotlightWishId]
  );

  const isJarFull = wishes.length >= JAR_STAR_SLOTS.length;

  const dropWishIntoJar = (wishText: string, colorIdx: number) => {
    const cleaned = sanitizeWishText(wishText);
    if (!cleaned || isJarFull) return;

    const usedSlots = new Set(wishes.map((w) => w.slotIndex));
    let slotIndex = wishes.length % JAR_STAR_SLOTS.length;
    for (let i = 0; i < JAR_STAR_SLOTS.length; i++) {
      if (!usedSlots.has(i)) {
        slotIndex = i;
        break;
      }
    }

    const entry: JarWishEntry = {
      id: nextId,
      text: cleaned,
      colorIndex: colorIdx % WISH_STAR_COLORS.length,
      slotIndex,
    };

    setWishes((prev) => [...prev, entry]);
    setSpotlightWishId(entry.id);
    setNextId((id) => id + 1);
    setCaughtFireflyId(null);
    setCustomWish('');
  };

  const handleCatchFirefly = (spotId: string, colorIndex: number) => {
    setCaughtFireflyId(spotId);
    setSelectedColorIndex(colorIndex);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    dropWishIntoJar(customWish, selectedColorIndex);
  };

  const handleSwirlJar = () => {
    if (wishes.length <= 1) return;
    const indices = wishes.map((_, idx) => idx);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = indices[i];
      indices[i] = indices[j];
      indices[j] = tmp;
    }
    setWishes((prev) =>
      prev.map((w, idx) => ({
        ...w,
        slotIndex: indices[idx],
      }))
    );
    const randomEntry = wishes[Math.floor(Math.random() * wishes.length)];
    if (randomEntry) setSpotlightWishId(randomEntry.id);
  };

  const jarWarmthOpacity = Math.min(0.42, 0.08 + wishes.length * 0.022);
  const selectedColor = WISH_STAR_COLORS[selectedColorIndex] ?? WISH_STAR_COLORS[0];

  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
      <div className="text-center">
        <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold text-amber-800 ring-1 ring-amber-200/80">
          <Heart size={10} />
          <span>Baby Bonding Keepsake</span>
        </div>
        <h2 className="text-lg font-bold text-gray-900">Wishes Jar for Baby</h2>
        <p className="mt-0.5 text-xs text-gray-500">
          Catch a drifting firefly or tap a blessing below to fill baby&apos;s glowing keepsake jar.
        </p>
      </div>

      {/* Interactive Twilight Jar Scene */}
      <div className="mt-4 overflow-hidden rounded-3xl border border-indigo-200/60 shadow-inner">
        <svg
          viewBox="0 0 360 272"
          className="block w-full select-none touch-manipulation"
          role="img"
          aria-label="Glowing glass keepsake jar filled with baby wish stars"
        >
          <defs>
            <linearGradient id="wishes-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1b1e49" />
              <stop offset="65%" stopColor="#322d68" />
              <stop offset="100%" stopColor="#4c3e7d" />
            </linearGradient>
            <radialGradient id="wishes-jar-glow" cx="50%" cy="62%" r="50%">
              <stop offset="0%" stopColor="#fde68a" stopOpacity={jarWarmthOpacity} />
              <stop offset="100%" stopColor="#fde68a" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="wishes-glass" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(255,255,255,0.22)" />
              <stop offset="22%" stopColor="rgba(255,255,255,0.06)" />
              <stop offset="78%" stopColor="rgba(255,255,255,0.05)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.20)" />
            </linearGradient>
          </defs>

          <rect x="0" y="0" width="360" height="272" fill="url(#wishes-sky)" />

          {/* Wooden Windowsill / Shelf */}
          <rect x="0" y="242" width="360" height="30" fill="#2c2146" />
          <line x1="0" y1="242" x2="360" y2="242" stroke="rgba(255,255,255,0.14)" strokeWidth="1.5" />

          {/* Soft Glowing Aura Around Jar */}
          <ellipse cx="180" cy="184" rx="108" ry="86" fill="url(#wishes-jar-glow)" />

          {/* Drifting Catchable Fireflies Outside the Jar */}
          {!isJarFull &&
            FIREFLY_DRIFT_SPOTS.map((spot) => {
              const color = WISH_STAR_COLORS[spot.colorIndex] ?? WISH_STAR_COLORS[0];
              const isCaught = caughtFireflyId === spot.id;
              return (
                <g
                  key={spot.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Catch ${color.label} firefly star`}
                  onClick={() => handleCatchFirefly(spot.id, spot.colorIndex)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleCatchFirefly(spot.id, spot.colorIndex);
                    }
                  }}
                  className="mindplay-motion-safe"
                  style={{
                    cursor: 'pointer',
                    outline: 'none',
                    animation: `mindplay-float ${spot.duration} ease-in-out ${spot.delay} infinite`,
                  }}
                >
                  <circle cx={spot.x} cy={spot.y} r="20" fill="transparent" />
                  <circle
                    cx={spot.x}
                    cy={spot.y}
                    r={isCaught ? '13' : '9'}
                    fill={color.glow}
                    opacity={isCaught ? 0.45 : 0.24}
                  />
                  <polygon
                    points={buildMiniStarPoints(spot.x, spot.y, isCaught ? 7.5 : 5.5)}
                    fill={color.fill}
                    stroke="#ffffff"
                    strokeWidth={isCaught ? '1.3' : '0.7'}
                  />
                </g>
              );
            })}

          {/* Glass Keepsake Jar Back & Cork */}
          {/* Cork stopper */}
          <rect x="148" y="42" width="64" height="22" rx="6" fill="#c79563" stroke="#8f633a" strokeWidth="1.4" />
          <line x1="156" y1="50" x2="204" y2="50" stroke="#dfb386" strokeWidth="1.2" opacity="0.65" />

          {/* Jar Neck */}
          <rect
            x="140"
            y="60"
            width="80"
            height="18"
            rx="6"
            fill="rgba(255,255,255,0.14)"
            stroke="rgba(255,255,255,0.45)"
            strokeWidth="1.6"
          />

          {/* Twine Ribbon */}
          <line x1="138" y1="73" x2="222" y2="73" stroke="#e7c697" strokeWidth="2.8" />
          <path d="M 180 73 Q 168 82 162 88 M 180 73 Q 192 82 198 88" stroke="#e7c697" strokeWidth="2" fill="none" />

          {/* Jar Body */}
          <path
            d="M 142 78 C 122 88 112 106 112 128 L 112 216 C 112 234 126 244 146 244 L 214 244 C 234 244 248 234 248 216 L 248 128 C 248 106 238 88 218 78 Z"
            fill="url(#wishes-glass)"
            stroke="rgba(255,255,255,0.52)"
            strokeWidth="2"
          />

          {/* Collected Glowing Wish Stars Inside the Jar */}
          {wishes.map((entry) => {
            const slot = JAR_STAR_SLOTS[entry.slotIndex] ?? JAR_STAR_SLOTS[0];
            const color = WISH_STAR_COLORS[entry.colorIndex] ?? WISH_STAR_COLORS[0];
            const isSpotlight = spotlightWish?.id === entry.id;
            return (
              <g
                key={entry.id}
                role="button"
                tabIndex={0}
                aria-label={`Read wish: ${entry.text}`}
                onClick={() => setSpotlightWishId(entry.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSpotlightWishId(entry.id);
                  }
                }}
                style={{ cursor: 'pointer', outline: 'none' }}
              >
                <circle
                  cx={slot.x}
                  cy={slot.y}
                  r={isSpotlight ? slot.size + 6 : slot.size + 2}
                  fill={color.glow}
                  opacity={isSpotlight ? 0.45 : 0.22}
                />
                <polygon
                  points={buildMiniStarPoints(slot.x, slot.y, isSpotlight ? slot.size + 1.5 : slot.size)}
                  fill={color.fill}
                  stroke="#ffffff"
                  strokeWidth={isSpotlight ? '1.5' : '0.8'}
                  transform={`rotate(${slot.rotation} ${slot.x} ${slot.y})`}
                />
              </g>
            );
          })}

          {/* Glass Specular Highlights */}
          <path
            d="M 124 126 L 124 212"
            stroke="rgba(255,255,255,0.28)"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          <path
            d="M 236 134 L 236 176"
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="2.2"
            strokeLinecap="round"
          />

          {/* Count Tag */}
          <g transform="translate(148, 248)">
            <text
              x="32"
              y="13"
              textAnchor="middle"
              fontSize="9.5"
              fontWeight="600"
              fill="rgba(254,243,199,0.85)"
            >
              {wishes.length} {wishes.length === 1 ? 'wish star' : 'wish stars'} glowing
            </text>
          </g>
        </svg>
      </div>

      {/* Spotlight Keepsake Ribbon */}
      {spotlightWish && (
        <div className="mt-3 rounded-2xl bg-amber-50/75 px-3.5 py-2.5 text-center ring-1 ring-amber-200/70">
          <div className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-700">
            <Star size={10} className="fill-amber-400 text-amber-500" />
            <span>Glowing in Baby&apos;s Jar</span>
          </div>
          <p className="mt-1 text-xs font-medium leading-relaxed text-amber-950">
            &ldquo;{spotlightWish.text}&rdquo;
          </p>
        </div>
      )}

      {/* Caught Firefly Cue + Star Shade Picker */}
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-gray-600">
          {caughtFireflyId ? 'Firefly caught! Pick a wish:' : 'Star glow color:'}
        </span>
        <div className="flex items-center gap-1.5" role="group" aria-label="Wish star color">
          {WISH_STAR_COLORS.map((color, idx) => {
            const isSelected = idx === selectedColorIndex;
            return (
              <button
                key={color.id}
                type="button"
                onClick={() => setSelectedColorIndex(idx)}
                aria-label={color.label}
                aria-pressed={isSelected}
                className={`h-6 w-6 rounded-full transition ${
                  isSelected ? 'scale-110 ring-2 ring-indigo-600 ring-offset-2' : 'ring-1 ring-black/10'
                }`}
                style={{ backgroundColor: color.fill }}
              />
            );
          })}
        </div>
      </div>

      {/* Mood Tabs */}
      <div className="mt-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Wish mood">
        {WISH_MOODS.map((m) => {
          const isActive = m.key === activeMood;
          return (
            <button
              key={m.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveMood(m.key)}
              className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Tap-to-Drop Curated Wishes */}
      <div className="mt-2.5 grid grid-cols-1 gap-1.5">
        {moodWishes.slice(0, 4).map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={isJarFull}
            onClick={() => dropWishIntoJar(item.text, selectedColorIndex)}
            className="flex items-center justify-between gap-2 rounded-2xl bg-gray-50 px-3 py-2 text-left text-xs text-gray-700 ring-1 ring-gray-200/70 transition hover:bg-amber-50/70 hover:ring-amber-200 active:scale-[0.99] disabled:opacity-45"
          >
            <span className="leading-snug">{item.text}</span>
            <Sparkles size={13} className="shrink-0 text-amber-500" />
          </button>
        ))}
      </div>

      {/* Optional Short Personal Wish Input */}
      <form onSubmit={handleCustomSubmit} className="mt-3 flex gap-2">
        <input
          type="text"
          value={customWish}
          onChange={(e) => setCustomWish(e.target.value.slice(0, MAX_WISH_LENGTH))}
          maxLength={MAX_WISH_LENGTH}
          disabled={isJarFull}
          placeholder="Or write a short wish for baby…"
          aria-label="Write a short wish for baby"
          className="min-w-0 flex-1 rounded-2xl border border-gray-200 bg-gray-50/70 px-3 py-2 text-xs text-gray-800 placeholder:text-gray-400 focus:border-indigo-400 focus:bg-white focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isJarFull || sanitizeWishText(customWish).length === 0}
          className={`shrink-0 rounded-2xl px-3.5 py-2 text-xs font-semibold transition active:scale-95 disabled:opacity-45 ${selectedColor.badgeBg} ${selectedColor.textClass} ring-1`}
        >
          Drop ★
        </button>
      </form>

      {isJarFull && (
        <p className="mt-2.5 text-center text-[11px] font-semibold text-amber-700">
          Your keepsake jar is brimming with 24 glowing wishes! Tap any star to read it or start a
          fresh jar.
        </p>
      )}

      {/* Jar Controls */}
      <div className="mt-3.5 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleSwirlJar}
          disabled={wishes.length <= 1}
          className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200/80 transition hover:bg-indigo-100 disabled:opacity-45"
        >
          <Shuffle size={13} />
          <span>Swirl stars</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setWishes([]);
            setSpotlightWishId(null);
            setCaughtFireflyId(null);
          }}
          disabled={wishes.length === 0}
          className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-200 disabled:opacity-45"
        >
          <RotateCcw size={13} />
          <span>Fresh jar</span>
        </button>
      </div>
    </div>
  );
}
