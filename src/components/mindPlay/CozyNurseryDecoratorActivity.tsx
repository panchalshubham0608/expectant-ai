import { useState } from 'react';
import { Heart, Shuffle, Sparkles, Undo2 } from 'lucide-react';
import {
  CORNER_OPTIONS,
  CRIB_OPTIONS,
  DEFAULT_NURSERY_CONFIG,
  GARLAND_OPTIONS,
  MOBILE_OPTIONS,
  NURSERY_CATEGORIES,
  NURSERY_PRESETS,
  PLUSH_OPTIONS,
  RUG_OPTIONS,
  WALL_OPTIONS,
  WINDOW_OPTIONS,
  buildRandomNurseryConfig,
  type NurseryCategoryKey,
  type NurseryConfig,
  type NurseryOptionItem,
} from '../../utils/nurseryOptions';

const BONDING_CAPTIONS = [
  'A quiet little corner dreamed up with love.',
  'Imagine bedtime stories and soft lullabies right here.',
  'Tap any part of the room — or the tabs below — to decorate at your own pace.',
  'Every cozy detail makes waiting for hello feel a little warmer.',
] as const;

export default function CozyNurseryDecoratorActivity() {
  const [config, setConfig] = useState<NurseryConfig>(DEFAULT_NURSERY_CONFIG);
  const [activeCategory, setActiveCategory] = useState<NurseryCategoryKey>('wall');
  const [history, setHistory] = useState<NurseryConfig[]>([]);
  const [presetIndex, setPresetIndex] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const applyConfig = (next: NurseryConfig, message: string | null = null) => {
    setHistory((prev) => [...prev.slice(-19), config]);
    setConfig(next);
    setToastMessage(message);
  };

  const handleSelectOption = (optionId: string) => {
    if (config[activeCategory] === optionId) return;
    applyConfig({ ...config, [activeCategory]: optionId } as NurseryConfig);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setConfig(previous);
    setToastMessage(null);
  };

  const handleSurpriseRoom = () => {
    applyConfig(buildRandomNurseryConfig(), 'Created a fresh cozy mix for you.');
  };

  const handleInspirePreset = () => {
    const preset = NURSERY_PRESETS[presetIndex % NURSERY_PRESETS.length];
    setPresetIndex((idx) => (idx + 1) % NURSERY_PRESETS.length);
    applyConfig(preset.config, `Styled with "${preset.name}" inspiration.`);
  };

  const activeOptions: readonly NurseryOptionItem<string>[] =
    activeCategory === 'wall'
      ? WALL_OPTIONS
      : activeCategory === 'window'
        ? WINDOW_OPTIONS
        : activeCategory === 'crib'
          ? CRIB_OPTIONS
          : activeCategory === 'mobile'
            ? MOBILE_OPTIONS
            : activeCategory === 'plush'
              ? PLUSH_OPTIONS
              : activeCategory === 'rug'
                ? RUG_OPTIONS
                : activeCategory === 'garland'
                  ? GARLAND_OPTIONS
                  : CORNER_OPTIONS;

  const caption =
    BONDING_CAPTIONS[(history.length + presetIndex) % BONDING_CAPTIONS.length];

  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
      <div className="text-center">
        <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-semibold text-rose-700 ring-1 ring-rose-100">
          <Heart size={10} />
          <span>Baby Bonding Sandbox</span>
        </div>
        <h2 className="text-lg font-bold text-gray-900">Cozy Nursery Decorator</h2>
        <p className="mt-0.5 text-xs text-gray-500">
          Tap the room or pick a category below to daydream baby&apos;s cozy corner.
        </p>
      </div>

      {/* Interactive Storybook SVG Nursery */}
      <div className="mt-4 overflow-hidden rounded-3xl border border-amber-100/90 bg-stone-50 shadow-inner">
        <NurserySceneSvg
          config={config}
          onPickCategory={(cat) => {
            setActiveCategory(cat);
            setToastMessage(null);
          }}
        />
      </div>

      <p className="mt-2.5 text-center text-[11px] font-medium text-gray-500">
        {toastMessage ?? caption}
      </p>

      {/* Category Pills */}
      <div
        className="mt-3.5 flex flex-wrap items-center justify-center gap-1.5"
        role="tablist"
        aria-label="Nursery room categories"
      >
        {NURSERY_CATEGORIES.map((cat) => {
          const isSelected = activeCategory === cat.key;
          return (
            <button
              key={cat.key}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => setActiveCategory(cat.key)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                isSelected
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200/80 hover:text-gray-900'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Options for Selected Category */}
      <div className="mt-3 rounded-2xl bg-gray-50/80 p-3 ring-1 ring-gray-100">
        <div className="grid grid-cols-3 gap-2">
          {activeOptions.map((option) => {
            const isSelected = config[activeCategory] === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => handleSelectOption(option.id)}
                aria-pressed={isSelected}
                className={`flex items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-semibold transition active:scale-[0.98] ${
                  isSelected
                    ? 'bg-white text-rose-700 shadow-sm ring-2 ring-rose-400'
                    : 'bg-white/80 text-gray-700 ring-1 ring-gray-200/70 hover:bg-white'
                }`}
              >
                <span
                  style={{ backgroundColor: option.swatch }}
                  className="h-4 w-4 shrink-0 rounded-full border border-black/10"
                  aria-hidden="true"
                />
                <span className="truncate">{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="mt-4 border-t border-gray-100 pt-4">
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={handleUndo}
            disabled={history.length === 0}
            className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-gray-100 px-3 py-2.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Undo2 size={14} />
            <span>Undo</span>
          </button>
          <button
            type="button"
            onClick={handleSurpriseRoom}
            className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-amber-50 px-3 py-2.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-200/80 transition hover:bg-amber-100 active:scale-[0.98]"
          >
            <Shuffle size={13} />
            <span>Mix room</span>
          </button>
          <button
            type="button"
            onClick={handleInspirePreset}
            className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-rose-500 px-3 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-600 active:scale-[0.98]"
          >
            <Sparkles size={13} />
            <span>Inspire</span>
          </button>
        </div>
      </div>
    </div>
  );
}

interface NurserySceneSvgProps {
  config: NurseryConfig;
  onPickCategory: (category: NurseryCategoryKey) => void;
}

function NurserySceneSvg({ config, onPickCategory }: NurserySceneSvgProps) {
  const wallSpec = WALL_OPTIONS.find((w) => w.id === config.wall) ?? WALL_OPTIONS[0];
  const cribSpec = CRIB_OPTIONS.find((c) => c.id === config.crib) ?? CRIB_OPTIONS[0];
  const isNight = config.window === 'starry-night';

  return (
    <svg
      viewBox="0 0 360 270"
      className="block h-auto w-full select-none"
      role="img"
      aria-label="Cozy baby nursery illustration"
    >
      <defs>
        <linearGradient id="floorWood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#efe0cc" />
          <stop offset="100%" stopColor="#e2cba9" />
        </linearGradient>
        <linearGradient id="skyMorning" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#bae6fd" />
          <stop offset="65%" stopColor="#fef3c7" />
          <stop offset="100%" stopColor="#fed7aa" />
        </linearGradient>
        <linearGradient id="skyDaydream" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7dd3fc" />
          <stop offset="100%" stopColor="#e0f2fe" />
        </linearGradient>
        <linearGradient id="skySunset" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c4b5fd" />
          <stop offset="52%" stopColor="#fda4af" />
          <stop offset="100%" stopColor="#fde68a" />
        </linearGradient>
        <linearGradient id="skyNight" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e1b4b" />
          <stop offset="100%" stopColor="#4338ca" />
        </linearGradient>
        <linearGradient id="skyRainbow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#93c5fd" />
          <stop offset="100%" stopColor="#f0f9ff" />
        </linearGradient>
        <clipPath id="windowArchClip">
          <path d="M 38 140 L 38 80 A 38 38 0 0 1 114 80 L 114 140 Z" />
        </clipPath>
      </defs>

      {/* Wall + Wainscoting (tap wall to customize) */}
      <g className="cursor-pointer" onClick={() => onPickCategory('wall')}>
        <rect x="0" y="0" width="360" height="172" fill={wallSpec.upperHex} />

        {/* Subtle wallpaper texture */}
        {wallSpec.pattern === 'stripes' &&
          Array.from({ length: 12 }, (_, i) => (
            <rect
              key={i}
              x={i * 30 + 8}
              y="0"
              width="8"
              height="172"
              fill={wallSpec.patternHex}
              opacity="0.45"
            />
          ))}
        {wallSpec.pattern === 'dots' &&
          [32, 82, 132, 182, 232, 282, 332].map((x, ix) =>
            [32, 74, 118, 152].map((y, iy) => (
              <circle
                key={`${ix}-${iy}`}
                cx={x + (iy % 2 === 0 ? 0 : 18)}
                cy={y}
                r="2.4"
                fill={wallSpec.patternHex}
                opacity="0.7"
              />
            ))
          )}
        {wallSpec.pattern === 'stars' &&
          [
            [24, 42],
            [148, 36],
            [212, 54],
            [276, 38],
            [334, 62],
            [158, 96],
            [298, 98],
            [326, 134],
            [22, 130],
          ].map(([cx, cy], idx) => (
            <path
              key={idx}
              d={`M ${cx} ${cy - 4} L ${cx + 1.4} ${cy - 1.4} L ${cx + 4} ${cy} L ${cx + 1.4} ${cy + 1.4} L ${cx} ${cy + 4} L ${cx - 1.4} ${cy + 1.4} L ${cx - 4} ${cy} L ${cx - 1.4} ${cy - 1.4} Z`}
              fill={wallSpec.patternHex}
              opacity="0.85"
            />
          ))}
        {wallSpec.pattern === 'clouds' &&
          [
            [156, 52],
            [284, 64],
            [324, 116],
            [228, 94],
          ].map(([cx, cy], idx) => (
            <g key={idx} fill={wallSpec.patternHex} opacity="0.65">
              <circle cx={cx} cy={cy} r="7" />
              <circle cx={cx + 8} cy={cy - 2} r="8" />
              <circle cx={cx + 16} cy={cy} r="6.5" />
              <rect x={cx} y={cy} width="16" height="7" rx="3" />
            </g>
          ))}
        {wallSpec.pattern === 'leaves' &&
          [
            [152, 46],
            [226, 62],
            [296, 48],
            [334, 98],
            [158, 108],
            [274, 108],
          ].map(([cx, cy], idx) => (
            <g key={idx} fill={wallSpec.patternHex} opacity="0.7">
              <ellipse cx={cx - 4} cy={cy} rx="5" ry="2.5" transform={`rotate(-30 ${cx - 4} ${cy})`} />
              <ellipse cx={cx + 4} cy={cy} rx="5" ry="2.5" transform={`rotate(30 ${cx + 4} ${cy})`} />
            </g>
          ))}
        {wallSpec.pattern === 'crescents' &&
          [
            [152, 46],
            [248, 56],
            [316, 48],
            [292, 102],
            [158, 112],
          ].map(([cx, cy], idx) => (
            <path
              key={idx}
              d={`M ${cx} ${cy - 5} A 5 5 0 1 0 ${cx} ${cy + 5} A 3.8 3.8 0 1 1 ${cx} ${cy - 5} Z`}
              fill={wallSpec.patternHex}
              opacity="0.85"
            />
          ))}

        {/* Wainscoting & trim */}
        <rect x="0" y="172" width="360" height="30" fill={wallSpec.lowerHex} />
        <rect x="0" y="169" width="360" height="4" fill={wallSpec.trimHex} />
        <rect x="0" y="199" width="360" height="4" fill={wallSpec.trimHex} />
      </g>

      {/* Hardwood Floor */}
      <rect x="0" y="203" width="360" height="67" fill="url(#floorWood)" />
      <line x1="0" y1="222" x2="360" y2="222" stroke="#d5bb97" strokeWidth="1" opacity="0.5" />
      <line x1="0" y1="244" x2="360" y2="244" stroke="#d5bb97" strokeWidth="1" opacity="0.5" />

      {/* Arched Window */}
      <g className="cursor-pointer" onClick={() => onPickCategory('window')}>
        {/* Outer arch trim */}
        <path
          d="M 33 144 L 33 80 A 43 43 0 0 1 119 80 L 119 144 Z"
          fill="#ffffff"
          stroke="#e2e8f0"
          strokeWidth="1.5"
        />

        {/* Sky inside arch */}
        <g clipPath="url(#windowArchClip)">
          <rect
            x="38"
            y="40"
            width="76"
            height="102"
            fill={
              config.window === 'morning-sun'
                ? 'url(#skyMorning)'
                : config.window === 'daydream-blue'
                  ? 'url(#skyDaydream)'
                  : config.window === 'peach-sunset'
                    ? 'url(#skySunset)'
                    : config.window === 'starry-night'
                      ? 'url(#skyNight)'
                      : 'url(#skyRainbow)'
            }
          />

          {config.window === 'morning-sun' && (
            <>
              <circle cx="88" cy="112" r="16" fill="#fde047" opacity="0.9" />
              <circle cx="88" cy="112" r="24" fill="#fef08a" opacity="0.35" />
              <g fill="#ffffff" opacity="0.88">
                <circle cx="56" cy="76" r="8" />
                <circle cx="65" cy="74" r="10" />
                <circle cx="74" cy="77" r="7" />
              </g>
            </>
          )}

          {config.window === 'daydream-blue' && (
            <>
              <g fill="#ffffff" opacity="0.92">
                <circle cx="55" cy="84" r="9" />
                <circle cx="65" cy="80" r="11" />
                <circle cx="76" cy="84" r="8" />
                <circle cx="94" cy="112" r="7" />
                <circle cx="102" cy="110" r="9" />
              </g>
              <path
                d="M 78 66 Q 82 62 86 66 Q 90 62 94 66"
                fill="none"
                stroke="#ffffff"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </>
          )}

          {config.window === 'peach-sunset' && (
            <>
              <circle cx="76" cy="122" r="18" fill="#fb923c" opacity="0.9" />
              <circle cx="76" cy="122" r="26" fill="#fed7aa" opacity="0.35" />
              <g fill="#fff7ed" opacity="0.7">
                <ellipse cx="56" cy="82" rx="14" ry="5" />
                <ellipse cx="96" cy="96" rx="12" ry="4" />
              </g>
            </>
          )}

          {config.window === 'starry-night' && (
            <>
              <path
                d="M 88 64 A 11 11 0 1 0 88 86 A 8.5 8.5 0 1 1 88 64 Z"
                fill="#fef08a"
              />
              {[
                [54, 68],
                [66, 92],
                [98, 98],
                [52, 112],
                [82, 118],
                [62, 56],
              ].map(([sx, sy], i) => (
                <circle key={i} cx={sx} cy={sy} r={i % 2 === 0 ? 1.8 : 1.2} fill="#fef9c3" />
              ))}
            </>
          )}

          {config.window === 'rainbow-sky' && (
            <>
              <path
                d="M 42 126 A 34 34 0 0 1 110 126"
                fill="none"
                stroke="#fda4af"
                strokeWidth="5"
              />
              <path
                d="M 47 126 A 29 29 0 0 1 105 126"
                fill="none"
                stroke="#fde68a"
                strokeWidth="5"
              />
              <path
                d="M 52 126 A 24 24 0 0 1 100 126"
                fill="none"
                stroke="#a7f3d0"
                strokeWidth="5"
              />
              <path
                d="M 57 126 A 19 19 0 0 1 95 126"
                fill="none"
                stroke="#bfdbfe"
                strokeWidth="5"
              />
              <g fill="#ffffff">
                <circle cx="48" cy="128" r="8" />
                <circle cx="58" cy="130" r="7" />
                <circle cx="102" cy="128" r="8" />
                <circle cx="94" cy="130" r="7" />
              </g>
            </>
          )}

          {/* Window panes */}
          <line x1="76" y1="40" x2="76" y2="142" stroke="#ffffff" strokeWidth="2.5" />
          <line x1="36" y1="98" x2="116" y2="98" stroke="#ffffff" strokeWidth="2.5" />
        </g>

        {/* Soft sheer curtains */}
        <path
          d="M 33 78 Q 48 106 37 142 L 32 142 Z"
          fill="#ffffff"
          opacity="0.72"
        />
        <path
          d="M 119 78 Q 104 106 115 142 L 120 142 Z"
          fill="#ffffff"
          opacity="0.72"
        />

        {/* Window sill */}
        <rect x="28" y="141" width="96" height="6" rx="3" fill="#ffffff" stroke="#e2e8f0" />
      </g>

      {/* Soft sunbeam on morning/rainbow skies */}
      {(config.window === 'morning-sun' || config.window === 'rainbow-sky') && (
        <polygon
          points="38,144 114,144 166,225 48,225"
          fill="#fef9c3"
          opacity="0.18"
          className="pointer-events-none"
        />
      )}

      {/* Top Wall Garland */}
      {config.garland !== 'none' && (
        <g className="cursor-pointer" onClick={() => onPickCategory('garland')}>
          <path
            d="M 8 18 Q 92 42 180 20 Q 268 42 352 18"
            fill="none"
            stroke={config.garland === 'leaf-vine' ? '#65a30d' : '#94a3b8'}
            strokeWidth={config.garland === 'leaf-vine' ? 2 : 1.3}
          />
          {config.garland === 'warm-lights' &&
            [
              [34, 24],
              [66, 29],
              [100, 30],
              [136, 26],
              [180, 20],
              [224, 26],
              [260, 30],
              [294, 29],
              [326, 24],
            ].map(([lx, ly], i) => (
              <g key={i}>
                <circle cx={lx} cy={ly + 4} r="8" fill="#fde047" opacity="0.28" />
                <circle cx={lx} cy={ly + 4} r="3.2" fill="#fef08a" stroke="#f59e0b" strokeWidth="0.7" />
              </g>
            ))}

          {config.garland === 'pastel-bunting' &&
            [
              [32, 24, '#fda4af'],
              [64, 29, '#fde68a'],
              [96, 30, '#a7f3d0'],
              [128, 27, '#bfdbfe'],
              [160, 22, '#ddd6fe'],
              [200, 22, '#fda4af'],
              [232, 27, '#fde68a'],
              [264, 30, '#a7f3d0'],
              [296, 29, '#bfdbfe'],
              [328, 24, '#ddd6fe'],
            ].map(([bx, by, fill], i) => (
              <polygon
                key={i}
                points={`${Number(bx) - 10},${by} ${Number(bx) + 10},${by} ${bx},${Number(by) + 15}`}
                fill={String(fill)}
              />
            ))}

          {config.garland === 'star-garland' &&
            [
              [44, 26],
              [92, 30],
              [142, 25],
              [218, 25],
              [268, 30],
              [316, 26],
            ].map(([sx, sy], i) => (
              <g key={i}>
                <line x1={sx} y1={sy} x2={sx} y2={sy + 11} stroke="#cbd5e1" strokeWidth="1" />
                <path
                  d={`M ${sx} ${sy + 7} L ${sx + 2} ${sy + 11} L ${sx + 6} ${sy + 12} L ${sx + 2.5} ${sy + 14.5} L ${sx + 3.5} ${sy + 18.5} L ${sx} ${sy + 16} L ${sx - 3.5} ${sy + 18.5} L ${sx - 2.5} ${sy + 14.5} L ${sx - 6} ${sy + 12} L ${sx - 2} ${sy + 11} Z`}
                  fill="#fcd34d"
                />
              </g>
            ))}

          {config.garland === 'leaf-vine' &&
            [
              [36, 24],
              [70, 29],
              [106, 30],
              [142, 25],
              [180, 20],
              [218, 25],
              [254, 30],
              [290, 29],
              [324, 24],
            ].map(([vx, vy], i) => (
              <g key={i} fill={i % 2 === 0 ? '#86efac' : '#4ade80'}>
                <ellipse cx={vx - 4} cy={vy + 4} rx="5" ry="2.6" transform={`rotate(-35 ${vx - 4} ${vy + 4})`} />
                <ellipse cx={vx + 4} cy={vy + 4} rx="5" ry="2.6" transform={`rotate(35 ${vx + 4} ${vy + 4})`} />
              </g>
            ))}
        </g>
      )}

      {/* Floor Rug */}
      <g className="cursor-pointer" onClick={() => onPickCategory('rug')}>
        {config.rug === 'braided-cream' && (
          <>
            <ellipse cx="180" cy="238" rx="112" ry="21" fill="#f7efe2" stroke="#dccab0" strokeWidth="2" />
            <ellipse cx="180" cy="238" rx="92" ry="15" fill="none" stroke="#e4d4be" strokeWidth="2" />
            <ellipse cx="180" cy="238" rx="68" ry="10" fill="none" stroke="#eadcc8" strokeWidth="1.5" />
          </>
        )}
        {config.rug === 'rainbow-arch' && (
          <>
            <ellipse cx="180" cy="238" rx="108" ry="20" fill="#fda4af" />
            <ellipse cx="180" cy="238" rx="90" ry="16" fill="#fde68a" />
            <ellipse cx="180" cy="238" rx="72" ry="12" fill="#a7f3d0" />
            <ellipse cx="180" cy="238" rx="54" ry="8.5" fill="#bfdbfe" />
            <ellipse cx="180" cy="238" rx="34" ry="5" fill="#fffbeb" />
          </>
        )}
        {config.rug === 'cloud-fluff' && (
          <g fill="#ffffff" stroke="#e2e8f0" strokeWidth="1.5">
            <ellipse cx="114" cy="238" rx="36" ry="15" />
            <ellipse cx="180" cy="236" rx="54" ry="20" />
            <ellipse cx="244" cy="238" rx="36" ry="15" />
            <ellipse cx="146" cy="244" rx="40" ry="14" stroke="none" />
            <ellipse cx="212" cy="244" rx="40" ry="14" stroke="none" />
          </g>
        )}
        {config.rug === 'star-medallion' && (
          <>
            <ellipse cx="180" cy="238" rx="108" ry="20" fill="#e0e7ff" stroke="#a5b4fc" strokeWidth="2" />
            <ellipse cx="180" cy="238" rx="86" ry="14" fill="#eef2ff" />
            <path
              d="M 180 228 L 185 235 L 198 238 L 185 241 L 180 248 L 175 241 L 162 238 L 175 235 Z"
              fill="#fcd34d"
            />
          </>
        )}
        {config.rug === 'sage-woven' && (
          <>
            <rect x="74" y="220" width="212" height="36" rx="10" fill="#d1fae5" stroke="#86efac" strokeWidth="2" />
            <line x1="88" y1="229" x2="272" y2="229" stroke="#a7f3d0" strokeWidth="2" />
            <line x1="88" y1="247" x2="272" y2="247" stroke="#a7f3d0" strokeWidth="2" />
            {[224, 232, 240, 248, 254].map((fy) => (
              <g key={fy} stroke="#f5f5f4" strokeWidth="2" strokeLinecap="round">
                <line x1="68" y1={fy} x2="74" y2={fy} />
                <line x1="286" y1={fy} x2="292" y2={fy} />
              </g>
            ))}
          </>
        )}
      </g>

      {/* Optional Canopy behind Crib */}
      {cribSpec.hasCanopy && (
        <g className="cursor-pointer" onClick={() => onPickCategory('crib')}>
          <path
            d="M 190 46 Q 134 74 114 196 L 144 196 Q 154 118 190 66 Q 226 118 236 196 L 266 196 Q 246 74 190 46 Z"
            fill="#ede9fe"
            opacity="0.72"
            stroke="#ddd6fe"
            strokeWidth="1.2"
          />
          <circle cx="190" cy="46" r="6" fill="#c4b5fd" />
        </g>
      )}

      {/* Hanging Crib Mobile */}
      <g className="cursor-pointer" onClick={() => onPickCategory('mobile')}>
        <path
          d="M 190 132 L 190 78 Q 190 66 202 66"
          fill="none"
          stroke="#b8834b"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <line x1="164" y1="74" x2="216" y2="74" stroke="#d6a56c" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="168" y1="74" x2="168" y2="96" stroke="#cbd5e1" strokeWidth="1.1" />
        <line x1="190" y1="74" x2="190" y2="104" stroke="#cbd5e1" strokeWidth="1.1" />
        <line x1="212" y1="74" x2="212" y2="94" stroke="#cbd5e1" strokeWidth="1.1" />

        {config.mobile === 'moon-stars' && (
          <>
            <path d="M 192 98 A 8 8 0 1 0 192 114 A 6 6 0 1 1 192 98 Z" fill="#fde047" />
            <circle cx="168" cy="99" r="4.5" fill="#fbbf24" />
            <circle cx="212" cy="97" r="4.5" fill="#a5b4fc" />
          </>
        )}
        {config.mobile === 'fluffy-clouds' && (
          <>
            <g fill="#ffffff" stroke="#bae6fd" strokeWidth="1">
              <circle cx="164" cy="98" r="5" />
              <circle cx="170" cy="97" r="6" />
              <circle cx="186" cy="106" r="5.5" />
              <circle cx="193" cy="105" r="6.5" />
              <circle cx="209" cy="96" r="5" />
              <circle cx="215" cy="95" r="5.5" />
            </g>
          </>
        )}
        {config.mobile === 'little-birds' && (
          <>
            <ellipse cx="168" cy="98" rx="6" ry="4" fill="#6ee7b7" />
            <ellipse cx="190" cy="106" rx="6.5" ry="4.5" fill="#93c5fd" />
            <ellipse cx="212" cy="96" rx="6" ry="4" fill="#fda4af" />
          </>
        )}
        {config.mobile === 'soft-hearts' && (
          <>
            {[
              [168, 98, '#fda4af'],
              [190, 106, '#fdba74'],
              [212, 96, '#c4b5fd'],
            ].map(([hx, hy, fill], i) => (
              <path
                key={i}
                d={`M ${hx} ${Number(hy) + 5} C ${Number(hx) - 8} ${hy} ${Number(hx) - 6} ${Number(hy) - 6} ${hx} ${Number(hy) - 2} C ${Number(hx) + 6} ${Number(hy) - 6} ${Number(hx) + 8} ${hy} ${hx} ${Number(hy) + 5} Z`}
                fill={String(fill)}
              />
            ))}
          </>
        )}
        {config.mobile === 'hot-air' && (
          <>
            {[
              [168, 96, '#fda4af'],
              [190, 104, '#93c5fd'],
              [212, 94, '#fde68a'],
            ].map(([bx, by, fill], i) => (
              <g key={i}>
                <circle cx={Number(bx)} cy={Number(by)} r="6.5" fill={String(fill)} />
                <rect x={Number(bx) - 2.5} y={Number(by) + 7.5} width="5" height="3.5" rx="1" fill="#d6a56c" />
              </g>
            ))}
          </>
        )}
      </g>

      {/* Centerpiece Baby Crib */}
      <g className="cursor-pointer" onClick={() => onPickCategory('crib')}>
        {/* Soft shadow */}
        <ellipse cx="190" cy="224" rx="66" ry="7" fill="#000000" opacity="0.06" />

        {/* Back rail */}
        <rect
          x="126"
          y="134"
          width="128"
          height="58"
          rx="10"
          fill={cribSpec.frameHex}
          stroke={cribSpec.frameDarkHex}
          strokeWidth="1.5"
        />

        {/* Mattress & Pillow */}
        <rect x="131" y="168" width="118" height="22" rx="6" fill="#ffffff" />
        <ellipse cx="152" cy="169" rx="15" ry="7.5" fill={cribSpec.pillowHex} />

        {/* Cozy Quilted Blanket */}
        <path
          d="M 164 164 Q 204 158 248 166 L 248 190 L 162 190 Z"
          fill={cribSpec.blanketHex}
        />
        <path
          d="M 164 164 Q 204 158 248 166 L 248 172 Q 204 164 164 170 Z"
          fill={cribSpec.blanketTrimHex}
        />

        {/* Front wooden crib slats */}
        <rect
          x="126"
          y="150"
          width="128"
          height="7"
          rx="3"
          fill={cribSpec.frameHex}
          stroke={cribSpec.frameDarkHex}
          strokeWidth="1.2"
        />
        {[140, 154, 168, 182, 196, 210, 224, 238].map((sx) => (
          <rect
            key={sx}
            x={sx}
            y="156"
            width="4.5"
            height="42"
            rx="2"
            fill={cribSpec.frameHex}
            stroke={cribSpec.frameDarkHex}
            strokeWidth="0.8"
          />
        ))}

        {/* Crib side posts & bottom rail */}
        <rect
          x="122"
          y="130"
          width="9"
          height="94"
          rx="4"
          fill={cribSpec.frameHex}
          stroke={cribSpec.frameDarkHex}
          strokeWidth="1.3"
        />
        <rect
          x="249"
          y="130"
          width="9"
          height="94"
          rx="4"
          fill={cribSpec.frameHex}
          stroke={cribSpec.frameDarkHex}
          strokeWidth="1.3"
        />
        <rect
          x="124"
          y="194"
          width="132"
          height="11"
          rx="4"
          fill={cribSpec.frameHex}
          stroke={cribSpec.frameDarkHex}
          strokeWidth="1.3"
        />
      </g>

      {/* Cuddly Plush Friend sitting on the rug */}
      <g className="cursor-pointer" onClick={() => onPickCategory('plush')}>
        <ellipse cx="76" cy="226" rx="20" ry="5" fill="#000000" opacity="0.07" />

        {config.plush === 'teddy' && (
          <g>
            <circle cx="64" cy="186" r="6" fill="#c68b59" />
            <circle cx="88" cy="186" r="6" fill="#c68b59" />
            <ellipse cx="76" cy="212" rx="16" ry="15" fill="#c68b59" />
            <ellipse cx="76" cy="214" rx="9" ry="9" fill="#f3dcc4" />
            <circle cx="76" cy="194" r="13" fill="#c68b59" />
            <ellipse cx="76" cy="197" rx="6" ry="4.5" fill="#f3dcc4" />
            <circle cx="76" cy="195.5" r="2" fill="#5c3d2e" />
            <circle cx="71" cy="191.5" r="1.4" fill="#3b261d" />
            <circle cx="81" cy="191.5" r="1.4" fill="#3b261d" />
            <circle cx="67" cy="196" r="2.2" fill="#fda4af" opacity="0.65" />
            <circle cx="85" cy="196" r="2.2" fill="#fda4af" opacity="0.65" />
            <ellipse cx="63" cy="221" rx="6" ry="4.5" fill="#b47846" />
            <ellipse cx="89" cy="221" rx="6" ry="4.5" fill="#b47846" />
          </g>
        )}

        {config.plush === 'bunny' && (
          <g>
            <ellipse cx="69" cy="176" rx="4.5" ry="13" fill="#ffffff" stroke="#e2e8f0" />
            <ellipse cx="69" cy="177" rx="2.2" ry="8" fill="#fbcfe8" />
            <ellipse cx="83" cy="176" rx="4.5" ry="13" fill="#ffffff" stroke="#e2e8f0" />
            <ellipse cx="83" cy="177" rx="2.2" ry="8" fill="#fbcfe8" />
            <ellipse cx="76" cy="212" rx="15" ry="14" fill="#ffffff" stroke="#e2e8f0" />
            <circle cx="76" cy="195" r="12.5" fill="#ffffff" stroke="#e2e8f0" />
            <circle cx="71.5" cy="193" r="1.4" fill="#334155" />
            <circle cx="80.5" cy="193" r="1.4" fill="#334155" />
            <circle cx="76" cy="196.5" r="1.8" fill="#f472b6" />
            <circle cx="68" cy="197" r="2.2" fill="#fda4af" opacity="0.6" />
            <circle cx="84" cy="197" r="2.2" fill="#fda4af" opacity="0.6" />
          </g>
        )}

        {config.plush === 'elephant' && (
          <g>
            <ellipse cx="59" cy="195" rx="9" ry="12" fill="#cbd5e1" />
            <ellipse cx="59" cy="195" rx="5" ry="7.5" fill="#fbcfe8" opacity="0.7" />
            <ellipse cx="93" cy="195" rx="9" ry="12" fill="#cbd5e1" />
            <ellipse cx="93" cy="195" rx="5" ry="7.5" fill="#fbcfe8" opacity="0.7" />
            <ellipse cx="76" cy="213" rx="16" ry="14" fill="#94a3b8" />
            <circle cx="76" cy="195" r="13" fill="#94a3b8" />
            <path d="M 76 198 Q 76 211 83 209" fill="none" stroke="#94a3b8" strokeWidth="5.5" strokeLinecap="round" />
            <circle cx="71" cy="192" r="1.5" fill="#1e293b" />
            <circle cx="81" cy="192" r="1.5" fill="#1e293b" />
            <circle cx="67.5" cy="196.5" r="2" fill="#fda4af" opacity="0.65" />
            <circle cx="84.5" cy="196.5" r="2" fill="#fda4af" opacity="0.65" />
          </g>
        )}

        {config.plush === 'fox' && (
          <g>
            <polygon points="64,191 67,178 74,187" fill="#fb923c" />
            <polygon points="88,191 85,178 78,187" fill="#fb923c" />
            <ellipse cx="92" cy="218" rx="12" ry="6" fill="#fb923c" />
            <ellipse cx="99" cy="218" rx="5" ry="4" fill="#fff7ed" />
            <ellipse cx="76" cy="213" rx="15" ry="13" fill="#fb923c" />
            <ellipse cx="76" cy="215" rx="8" ry="8" fill="#fff7ed" />
            <ellipse cx="76" cy="195" rx="13" ry="11" fill="#fb923c" />
            <path d="M 64 196 Q 76 206 88 196 L 84 203 Q 76 208 68 203 Z" fill="#fff7ed" />
            <circle cx="76" cy="199" r="2" fill="#431407" />
            <circle cx="71" cy="193" r="1.4" fill="#431407" />
            <circle cx="81" cy="193" r="1.4" fill="#431407" />
          </g>
        )}

        {config.plush === 'giraffe' && (
          <g>
            <line x1="71" y1="176" x2="70" y2="169" stroke="#d97706" strokeWidth="2" />
            <circle cx="70" cy="169" r="2.2" fill="#b45309" />
            <line x1="81" y1="176" x2="82" y2="169" stroke="#d97706" strokeWidth="2" />
            <circle cx="82" cy="169" r="2.2" fill="#b45309" />
            <rect x="70" y="186" width="12" height="20" rx="5" fill="#fcd34d" />
            <ellipse cx="76" cy="215" rx="15" ry="12" fill="#fcd34d" />
            <circle cx="72" cy="214" r="3" fill="#d97706" opacity="0.6" />
            <circle cx="82" cy="218" r="2.5" fill="#d97706" opacity="0.6" />
            <circle cx="76" cy="182" r="10.5" fill="#fcd34d" />
            <ellipse cx="76" cy="186" rx="6.5" ry="4.5" fill="#fef3c7" />
            <circle cx="72" cy="180" r="1.4" fill="#451a03" />
            <circle cx="80" cy="180" r="1.4" fill="#451a03" />
          </g>
        )}

        {config.plush === 'whale' && (
          <g>
            <path d="M 96 214 Q 108 206 105 218 Q 108 224 96 220 Z" fill="#38bdf8" />
            <ellipse cx="76" cy="213" rx="22" ry="14" fill="#7dd3fc" />
            <path d="M 56 218 Q 76 227 94 218 Q 76 229 56 218 Z" fill="#e0f2fe" />
            <circle cx="67" cy="211" r="1.8" fill="#0f172a" />
            <circle cx="72" cy="215" r="2.3" fill="#fda4af" opacity="0.7" />
            <path d="M 60 216 Q 64 220 70 217" fill="none" stroke="#0369a1" strokeWidth="1.4" strokeLinecap="round" />
          </g>
        )}
      </g>

      {/* Right Corner Cozy Accent */}
      <g className="cursor-pointer" onClick={() => onPickCategory('corner')}>
        {config.corner === 'rocking-chair' && (
          <g>
            <path d="M 272 224 Q 306 234 342 222" fill="none" stroke="#b8834b" strokeWidth="4" strokeLinecap="round" />
            <line x1="286" y1="202" x2="282" y2="224" stroke="#b8834b" strokeWidth="3.5" />
            <line x1="324" y1="202" x2="328" y2="224" stroke="#b8834b" strokeWidth="3.5" />
            <rect x="278" y="192" width="54" height="12" rx="6" fill="#d6a56c" />
            <rect x="316" y="142" width="14" height="54" rx="7" fill="#d6a56c" transform="rotate(8 322 170)" />
            <ellipse cx="302" cy="189" rx="18" ry="6" fill="#fef3c7" />
            <path d="M 314 152 Q 332 162 326 196 L 314 196 Z" fill="#fbcfe8" />
          </g>
        )}

        {config.corner === 'bookshelf' && (
          <g>
            <rect x="278" y="138" width="60" height="86" rx="7" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
            <rect x="283" y="168" width="50" height="4" rx="2" fill="#e2e8f0" />
            <rect x="283" y="196" width="50" height="4" rx="2" fill="#e2e8f0" />
            {/* Books top shelf */}
            <rect x="286" y="146" width="8" height="22" rx="2" fill="#fda4af" />
            <rect x="295" y="149" width="7" height="19" rx="2" fill="#93c5fd" />
            <rect x="303" y="145" width="9" height="23" rx="2" fill="#fde68a" />
            <rect x="313" y="150" width="8" height="18" rx="2" fill="#a7f3d0" />
            {/* Books middle shelf */}
            <rect x="287" y="176" width="9" height="20" rx="2" fill="#c4b5fd" />
            <rect x="297" y="179" width="8" height="17" rx="2" fill="#fdba74" />
            <rect x="306" y="175" width="8" height="21" rx="2" fill="#7dd3fc" />
            {/* Basket bottom shelf */}
            <rect x="288" y="204" width="40" height="15" rx="4" fill="#e7d3b8" />
          </g>
        )}

        {config.corner === 'moon-lamp' && (
          <g>
            <circle cx="312" cy="134" r="30" fill="#fef08a" opacity={isNight ? '0.42' : '0.24'} />
            <ellipse cx="312" cy="224" rx="16" ry="4.5" fill="#b8834b" />
            <line x1="312" y1="150" x2="312" y2="224" stroke="#b8834b" strokeWidth="3.5" />
            <path
              d="M 316 118 A 16 16 0 1 0 316 150 A 12 12 0 1 1 316 118 Z"
              fill="#fde047"
              stroke="#f59e0b"
              strokeWidth="1"
            />
          </g>
        )}

        {config.corner === 'potted-olive' && (
          <g>
            <path d="M 294 196 L 328 196 L 322 224 L 300 224 Z" fill="#ea8c55" />
            <rect x="291" y="192" width="40" height="6" rx="3" fill="#d97742" />
            <path d="M 311 192 Q 308 164 312 138" fill="none" stroke="#78350f" strokeWidth="3" />
            {[
              [301, 168, -32],
              [321, 170, 32],
              [298, 152, -28],
              [324, 154, 28],
              [304, 138, -22],
              [320, 140, 22],
              [312, 130, 0],
            ].map(([lx, ly, rot], i) => (
              <ellipse
                key={i}
                cx={lx}
                cy={ly}
                rx="11"
                ry="5.5"
                fill={i % 2 === 0 ? '#65a30d' : '#4ade80'}
                transform={`rotate(${rot} ${lx} ${ly})`}
              />
            ))}
          </g>
        )}

        {config.corner === 'toy-basket' && (
          <g>
            <rect x="288" y="182" width="16" height="16" rx="3" fill="#93c5fd" transform="rotate(-10 296 190)" />
            <rect x="306" y="180" width="16" height="16" rx="3" fill="#fde68a" transform="rotate(8 314 188)" />
            <ellipse cx="324" cy="190" rx="8" ry="12" fill="#fda4af" />
            <path d="M 282 192 L 336 192 L 330 224 L 288 224 Z" fill="#e7d3b8" stroke="#c8ab84" strokeWidth="1.5" />
            <line x1="285" y1="204" x2="333" y2="204" stroke="#c8ab84" strokeWidth="1.5" />
            <line x1="287" y1="214" x2="331" y2="214" stroke="#c8ab84" strokeWidth="1.5" />
          </g>
        )}
      </g>

      {/* Soft ambient moonlight wash when Starry Night sky is active */}
      {isNight && (
        <rect
          x="0"
          y="0"
          width="360"
          height="270"
          fill="#1e1b4b"
          opacity="0.12"
          className="pointer-events-none"
        />
      )}
    </svg>
  );
}
