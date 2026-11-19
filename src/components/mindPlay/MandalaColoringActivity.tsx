import { useEffect, useState } from 'react';
import { Palette, RotateCcw, Sparkles, Undo2 } from 'lucide-react';
import { loadMandalaState, saveMandalaState } from '../../utils/mindPlayStorage';

interface MandalaColoringActivityProps {
  profileId: string;
}

interface PaletteColor {
  name: string;
  hex: string;
}

// Hardcoded soothing color allow-list for declarative SVG fill attributes
const CALM_PALETTE: readonly PaletteColor[] = [
  { name: 'Sage', hex: '#6ee7b7' },
  { name: 'Teal Mist', hex: '#5eead4' },
  { name: 'Sky', hex: '#93c5fd' },
  { name: 'Lavender', hex: '#c4b5fd' },
  { name: 'Blush', hex: '#fda4af' },
  { name: 'Peach', hex: '#fdba74' },
  { name: 'Butter', hex: '#fde68a' },
  { name: 'Terracotta', hex: '#f87171' },
  { name: 'Deep Indigo', hex: '#818cf8' },
  { name: 'Soft White', hex: '#ffffff' },
] as const;

const ALLOWED_HEX_SET = new Set<string>(CALM_PALETTE.map((c) => c.hex));
const DEFAULT_FILL = '#ffffff';
const PETAL_INDICES = [0, 1, 2, 3, 4, 5, 6, 7] as const;

type RingKey = 'center' | 'inner' | 'mid' | 'outer' | 'dots' | 'halo';

const getRegionId = (ring: RingKey, idx?: number): string =>
  ring === 'center' ? 'center' : `${ring}-${idx}`;

const ALLOWED_REGION_IDS = new Set<string>([
  'center',
  ...(['inner', 'mid', 'outer', 'dots', 'halo'] as const).flatMap((ring) =>
    PETAL_INDICES.map((i) => getRegionId(ring, i))
  ),
]);

const PRESET_FILLS: Record<string, string> = {
  center: '#fde68a',
  ...Object.fromEntries(PETAL_INDICES.map((i) => [`inner-${i}`, i % 2 === 0 ? '#fda4af' : '#fdba74'])),
  ...Object.fromEntries(PETAL_INDICES.map((i) => [`mid-${i}`, i % 2 === 0 ? '#c4b5fd' : '#93c5fd'])),
  ...Object.fromEntries(PETAL_INDICES.map((i) => [`outer-${i}`, i % 2 === 0 ? '#6ee7b7' : '#5eead4'])),
  ...Object.fromEntries(PETAL_INDICES.map((i) => [`dots-${i}`, '#818cf8'])),
  ...Object.fromEntries(PETAL_INDICES.map((i) => [`halo-${i}`, '#fde68a'])),
};

export default function MandalaColoringActivity({ profileId }: MandalaColoringActivityProps) {
  const [initialState] = useState(() => {
    const saved = loadMandalaState(
      profileId,
      ALLOWED_HEX_SET,
      ALLOWED_REGION_IDS,
      CALM_PALETTE[0].hex
    );
    return (
      saved ?? {
        selectedColor: CALM_PALETTE[0].hex,
        symmetryMode: true,
        fills: {} as Record<string, string>,
      }
    );
  });

  const [selectedColor, setSelectedColor] = useState<string>(initialState.selectedColor);
  const [symmetryMode, setSymmetryMode] = useState<boolean>(initialState.symmetryMode);
  const [fills, setFills] = useState<Record<string, string>>(initialState.fills);
  const [history, setHistory] = useState<Record<string, string>[]>([]);

  useEffect(() => {
    saveMandalaState(profileId, { selectedColor, symmetryMode, fills });
  }, [profileId, selectedColor, symmetryMode, fills]);

  const applyColor = (ring: RingKey, idx?: number) => {
    const safeColor = ALLOWED_HEX_SET.has(selectedColor) ? selectedColor : DEFAULT_FILL;
    setHistory((prev) => [...prev.slice(-19), fills]);

    setFills((prev) => {
      const next = { ...prev };
      if (ring === 'center') {
        next.center = safeColor;
      } else if (symmetryMode) {
        for (const i of PETAL_INDICES) {
          next[getRegionId(ring, i)] = safeColor;
        }
      } else if (idx !== undefined) {
        next[getRegionId(ring, idx)] = safeColor;
      }
      return next;
    });
  };

  const handleUndo = () => {
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const previousState = prev[prev.length - 1];
      setFills(previousState);
      return prev.slice(0, -1);
    });
  };

  const handleClear = () => {
    setHistory((prev) => [...prev.slice(-19), fills]);
    setFills({});
  };

  const handleSoftPreset = () => {
    setHistory((prev) => [...prev.slice(-19), fills]);
    setFills(PRESET_FILLS);
  };

  const getFill = (id: string): string => {
    const color = fills[id];
    return color && ALLOWED_HEX_SET.has(color) ? color : DEFAULT_FILL;
  };

  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Calm Mandala Coloring</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Choose a soothing shade and tap petals to unwind creatively.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSymmetryMode((s) => !s)}
          aria-pressed={symmetryMode}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
            symmetryMode
              ? 'bg-violet-600 text-white shadow-sm'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Sparkles size={12} />
          <span>Symmetry: {symmetryMode ? 'On' : 'Off'}</span>
        </button>
      </div>

      {/* Color palette */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        {CALM_PALETTE.map((swatch) => {
          const isSelected = selectedColor === swatch.hex;
          return (
            <button
              key={swatch.name}
              type="button"
              onClick={() => setSelectedColor(swatch.hex)}
              aria-label={`Select color ${swatch.name}`}
              aria-pressed={isSelected}
              style={{ backgroundColor: swatch.hex }}
              className={`h-8 w-8 rounded-full border transition active:scale-95 ${
                isSelected
                  ? 'scale-110 border-gray-900 ring-2 ring-indigo-300 ring-offset-2'
                  : 'border-gray-300 hover:scale-105'
              }`}
            />
          );
        })}
      </div>

      {/* Declarative SVG Mandala */}
      <div className="mt-4 flex justify-center">
        <div className="w-full max-w-[300px] rounded-3xl bg-gradient-to-br from-slate-50 via-white to-violet-50/40 p-3 ring-1 ring-gray-100">
          <svg
            viewBox="0 0 320 320"
            className="h-auto w-full select-none"
            role="img"
            aria-label="Interactive calm coloring mandala"
          >
            {/* Outer halo petals (rotated by 22.5 deg) */}
            {PETAL_INDICES.map((i) => {
              const id = getRegionId('halo', i);
              const angle = i * 45 + 22.5;
              return (
                <path
                  key={id}
                  d="M 160 14 C 178 44 184 74 160 100 C 136 74 142 44 160 14 Z"
                  transform={`rotate(${angle} 160 160)`}
                  fill={getFill(id)}
                  stroke="#64748b"
                  strokeWidth="1.5"
                  className="cursor-pointer transition-colors duration-150 hover:opacity-90"
                  onClick={() => applyColor('halo', i)}
                />
              );
            })}

            {/* Outer lotus petals */}
            {PETAL_INDICES.map((i) => {
              const id = getRegionId('outer', i);
              const angle = i * 45;
              return (
                <path
                  key={id}
                  d="M 160 22 C 186 58 186 98 160 122 C 134 98 134 58 160 22 Z"
                  transform={`rotate(${angle} 160 160)`}
                  fill={getFill(id)}
                  stroke="#475569"
                  strokeWidth="1.6"
                  className="cursor-pointer transition-colors duration-150 hover:opacity-90"
                  onClick={() => applyColor('outer', i)}
                />
              );
            })}

            {/* Mid diamond petals (rotated by 22.5 deg) */}
            {PETAL_INDICES.map((i) => {
              const id = getRegionId('mid', i);
              const angle = i * 45 + 22.5;
              return (
                <path
                  key={id}
                  d="M 160 66 C 176 92 176 118 160 138 C 144 118 144 92 160 66 Z"
                  transform={`rotate(${angle} 160 160)`}
                  fill={getFill(id)}
                  stroke="#475569"
                  strokeWidth="1.5"
                  className="cursor-pointer transition-colors duration-150 hover:opacity-90"
                  onClick={() => applyColor('mid', i)}
                />
              );
            })}

            {/* Outer decorative dots */}
            {PETAL_INDICES.map((i) => {
              const id = getRegionId('dots', i);
              const angle = i * 45;
              return (
                <circle
                  key={id}
                  cx="160"
                  cy="62"
                  r="11"
                  transform={`rotate(${angle} 160 160)`}
                  fill={getFill(id)}
                  stroke="#475569"
                  strokeWidth="1.5"
                  className="cursor-pointer transition-colors duration-150 hover:opacity-90"
                  onClick={() => applyColor('dots', i)}
                />
              );
            })}

            {/* Inner petals */}
            {PETAL_INDICES.map((i) => {
              const id = getRegionId('inner', i);
              const angle = i * 45;
              return (
                <path
                  key={id}
                  d="M 160 98 C 174 116 174 138 160 154 C 146 138 146 116 160 98 Z"
                  transform={`rotate(${angle} 160 160)`}
                  fill={getFill(id)}
                  stroke="#334155"
                  strokeWidth="1.5"
                  className="cursor-pointer transition-colors duration-150 hover:opacity-90"
                  onClick={() => applyColor('inner', i)}
                />
              );
            })}

            {/* Center lotus core */}
            <circle
              cx="160"
              cy="160"
              r="24"
              fill={getFill('center')}
              stroke="#334155"
              strokeWidth="1.8"
              className="cursor-pointer transition-colors duration-150 hover:opacity-90"
              onClick={() => applyColor('center')}
            />
          </svg>
        </div>
      </div>

      {/* Bottom controls */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleUndo}
            disabled={history.length === 0}
            className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-200 disabled:opacity-45"
          >
            <Undo2 size={12} />
            <span>Undo</span>
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-200"
          >
            <RotateCcw size={12} />
            <span>Clear</span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleSoftPreset}
          className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-3.5 py-1.5 text-xs font-semibold text-violet-700 ring-1 ring-violet-200/70 transition hover:bg-violet-100"
        >
          <Palette size={12} />
          <span>Pastel inspiration</span>
        </button>
      </div>
    </div>
  );
}
