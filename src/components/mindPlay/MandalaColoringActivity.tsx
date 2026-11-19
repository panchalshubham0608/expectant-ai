import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  LayoutGrid,
  Palette,
  RotateCcw,
  Shuffle,
  Sparkles,
  Undo2,
  X,
} from 'lucide-react';
import {
  MANDALA_DESIGNS,
  MANDALA_DESIGN_BY_ID,
  MANDALA_THEME_LABELS,
  buildPastelPresetForDesign,
  getAllowedRegionIdsForDesign,
  getRegionIdForLayer,
  type MandalaDesign,
  type MandalaTheme,
} from '../../utils/mandalaDesigns';
import { loadMandalaState, saveMandalaState } from '../../utils/mindPlayStorage';

interface MandalaColoringActivityProps {
  profileId: string;
}

interface PaletteColor {
  name: string;
  hex: string;
}

type PaletteId = 'pastels' | 'jewel' | 'earth' | 'ocean' | 'sunset';

interface ColorPaletteGroup {
  id: PaletteId;
  label: string;
  colors: readonly PaletteColor[];
}

const SOFT_WHITE: PaletteColor = { name: 'Soft White', hex: '#ffffff' };

// Hardcoded soothing & rich color allow-list for declarative SVG fill attributes
const COLOR_PALETTES: readonly ColorPaletteGroup[] = [
  {
    id: 'pastels',
    label: 'Pastels',
    colors: [
      { name: 'Sage', hex: '#6ee7b7' },
      { name: 'Teal Mist', hex: '#5eead4' },
      { name: 'Sky', hex: '#93c5fd' },
      { name: 'Periwinkle', hex: '#a5b4fc' },
      { name: 'Lavender', hex: '#c4b5fd' },
      { name: 'Lilac Pink', hex: '#f0abfc' },
      { name: 'Blush', hex: '#fda4af' },
      { name: 'Peach', hex: '#fdba74' },
      { name: 'Butter', hex: '#fde68a' },
      { name: 'Terracotta', hex: '#f87171' },
      { name: 'Deep Indigo', hex: '#818cf8' },
      SOFT_WHITE,
    ],
  },
  {
    id: 'jewel',
    label: 'Jewel',
    colors: [
      { name: 'Ruby', hex: '#e11d48' },
      { name: 'Rose Quartz', hex: '#ec4899' },
      { name: 'Amethyst', hex: '#9333ea' },
      { name: 'Royal Violet', hex: '#7c3aed' },
      { name: 'Sapphire', hex: '#2563eb' },
      { name: 'Peacock', hex: '#0891b2' },
      { name: 'Emerald', hex: '#059669' },
      { name: 'Jade', hex: '#10b981' },
      { name: 'Citrine', hex: '#eab308' },
      { name: 'Amber Gold', hex: '#f59e0b' },
      { name: 'Garnet', hex: '#be123c' },
      SOFT_WHITE,
    ],
  },
  {
    id: 'earth',
    label: 'Earth',
    colors: [
      { name: 'Terracotta Clay', hex: '#c2410c' },
      { name: 'Burnt Rust', hex: '#ea580c' },
      { name: 'Warm Ochre', hex: '#ca8a04' },
      { name: 'Warm Sand', hex: '#d6b892' },
      { name: 'Olive Leaf', hex: '#65a30d' },
      { name: 'Moss', hex: '#4d7c0f' },
      { name: 'Forest Pine', hex: '#15803d' },
      { name: 'Eucalyptus', hex: '#0f766e' },
      { name: 'Slate Blue', hex: '#475569' },
      { name: 'Dusty Rose', hex: '#d88c9a' },
      { name: 'Cocoa', hex: '#78350f' },
      SOFT_WHITE,
    ],
  },
  {
    id: 'ocean',
    label: 'Ocean',
    colors: [
      { name: 'Midnight', hex: '#1e3a8a' },
      { name: 'Twilight', hex: '#3730a3' },
      { name: 'Starlight', hex: '#6366f1' },
      { name: 'Cerulean', hex: '#0284c7' },
      { name: 'Ocean Blue', hex: '#0ea5e9' },
      { name: 'Aqua Sky', hex: '#38bdf8' },
      { name: 'Turquoise', hex: '#14b8a6' },
      { name: 'Seafoam', hex: '#2dd4bf' },
      { name: 'Ice Mist', hex: '#bae6fd' },
      { name: 'Moonlight', hex: '#e0e7ff' },
      { name: 'Reef Coral', hex: '#fb7185' },
      SOFT_WHITE,
    ],
  },
  {
    id: 'sunset',
    label: 'Sunset',
    colors: [
      { name: 'Mulberry', hex: '#86198f' },
      { name: 'Plum', hex: '#a21caf' },
      { name: 'Orchid', hex: '#d946ef' },
      { name: 'Berry', hex: '#db2777' },
      { name: 'Crimson Rose', hex: '#f43f5e' },
      { name: 'Tangerine', hex: '#f97316' },
      { name: 'Apricot', hex: '#fb923c' },
      { name: 'Marigold', hex: '#fbbf24' },
      { name: 'Sunbeam', hex: '#fde047' },
      { name: 'Champagne', hex: '#fef3c7' },
      { name: 'Peach Cream', hex: '#fed7aa' },
      SOFT_WHITE,
    ],
  },
] as const;

const ALL_PALETTE_COLORS: readonly PaletteColor[] = COLOR_PALETTES.flatMap((p) => p.colors);
const ALLOWED_HEX_SET = new Set<string>(ALL_PALETTE_COLORS.map((c) => c.hex));
const DEFAULT_FILL = '#ffffff';
const DEFAULT_COLOR = COLOR_PALETTES[0].colors[0].hex;
const DEFAULT_DESIGN_ID = MANDALA_DESIGNS[0].id;

const findPaletteForHex = (hex: string): PaletteId => {
  const match = COLOR_PALETTES.find((palette) =>
    palette.colors.some((color) => color.hex === hex && color.hex !== SOFT_WHITE.hex)
  );
  return match ? match.id : 'pastels';
};

type GalleryFilter = 'all' | MandalaTheme | 'colored';

const GALLERY_FILTERS: { key: GalleryFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'geometry', label: 'Geometry' },
  { key: 'stained-glass', label: 'Stained Glass' },
  { key: 'celestial', label: 'Celestial' },
  { key: 'waves', label: 'Waves' },
  { key: 'botanical', label: 'Botanical' },
  { key: 'colored', label: 'My Art' },
];

const getRegionIdsForDesignId = (designId: string): ReadonlySet<string> | null => {
  const design = MANDALA_DESIGN_BY_ID.get(designId);
  return design ? getAllowedRegionIdsForDesign(design) : null;
};

export default function MandalaColoringActivity({ profileId }: MandalaColoringActivityProps) {
  const [initialState] = useState(() => {
    const saved = loadMandalaState(
      profileId,
      ALLOWED_HEX_SET,
      getRegionIdsForDesignId,
      DEFAULT_DESIGN_ID,
      DEFAULT_COLOR
    );
    return (
      saved ?? {
        designId: DEFAULT_DESIGN_ID,
        selectedColor: DEFAULT_COLOR,
        symmetryMode: true,
        fillsByDesign: {} as Record<string, Record<string, string>>,
      }
    );
  });

  const [designId, setDesignId] = useState<string>(initialState.designId);
  const [selectedColor, setSelectedColor] = useState<string>(initialState.selectedColor);
  const [activePaletteId, setActivePaletteId] = useState<PaletteId>(() =>
    findPaletteForHex(initialState.selectedColor)
  );
  const [symmetryMode, setSymmetryMode] = useState<boolean>(initialState.symmetryMode);
  const [fillsByDesign, setFillsByDesign] = useState<Record<string, Record<string, string>>>(
    initialState.fillsByDesign
  );
  const [historyByDesign, setHistoryByDesign] = useState<
    Record<string, Record<string, string>[]>
  >({});
  const [inspireShift, setInspireShift] = useState<number>(0);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [galleryFilter, setGalleryFilter] = useState<GalleryFilter>('all');

  const activeDesign = MANDALA_DESIGN_BY_ID.get(designId) ?? MANDALA_DESIGNS[0];
  const activePalette =
    COLOR_PALETTES.find((p) => p.id === activePaletteId) ?? COLOR_PALETTES[0];
  const fills = useMemo(
    () => fillsByDesign[activeDesign.id] ?? {},
    [fillsByDesign, activeDesign.id]
  );
  const history = historyByDesign[activeDesign.id] ?? [];

  useEffect(() => {
    saveMandalaState(profileId, {
      designId: activeDesign.id,
      selectedColor,
      symmetryMode,
      fillsByDesign,
    });
  }, [profileId, activeDesign.id, selectedColor, symmetryMode, fillsByDesign]);

  useEffect(() => {
    if (!isGalleryOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsGalleryOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isGalleryOpen]);

  const updateActiveFills = (nextFills: Record<string, string>) => {
    const id = activeDesign.id;
    setHistoryByDesign((prev) => ({
      ...prev,
      [id]: [...(prev[id] ?? []).slice(-19), fills],
    }));
    setFillsByDesign((prev) => {
      const next = { ...prev };
      if (Object.keys(nextFills).length === 0) {
        delete next[id];
      } else {
        next[id] = nextFills;
      }
      return next;
    });
  };

  const applyColor = (layerKey: string, idx: number, count: number) => {
    const safeColor = ALLOWED_HEX_SET.has(selectedColor) ? selectedColor : DEFAULT_FILL;
    const next = { ...fills };

    if (count === 1) {
      next[getRegionIdForLayer(layerKey, 0, 1)] = safeColor;
    } else if (symmetryMode) {
      for (let i = 0; i < count; i++) {
        next[getRegionIdForLayer(layerKey, i, count)] = safeColor;
      }
    } else {
      next[getRegionIdForLayer(layerKey, idx, count)] = safeColor;
    }

    updateActiveFills(next);
  };

  const handleUndo = () => {
    const id = activeDesign.id;
    setHistoryByDesign((prev) => {
      const stack = prev[id] ?? [];
      if (stack.length === 0) return prev;
      const previousState = stack[stack.length - 1];
      setFillsByDesign((current) => {
        const next = { ...current };
        if (Object.keys(previousState).length === 0) {
          delete next[id];
        } else {
          next[id] = previousState;
        }
        return next;
      });
      return { ...prev, [id]: stack.slice(0, -1) };
    });
  };

  const handleClear = () => {
    if (Object.keys(fills).length === 0) return;
    updateActiveFills({});
  };

  const handleInspirePreset = () => {
    const chromaticHexes = activePalette.colors
      .filter((c) => c.hex !== SOFT_WHITE.hex)
      .map((c) => c.hex);
    updateActiveFills(buildPastelPresetForDesign(activeDesign, chromaticHexes, inspireShift));
    setInspireShift((prev) => prev + 1);
  };

  const handleRandomDesign = () => {
    const others = MANDALA_DESIGNS.filter((d) => d.id !== activeDesign.id);
    if (others.length === 0) return;
    const picked = others[Math.floor(Math.random() * others.length)];
    setDesignId(picked.id);
  };

  const galleryDesigns = useMemo(() => {
    if (galleryFilter === 'all') return MANDALA_DESIGNS;
    if (galleryFilter === 'colored') {
      return MANDALA_DESIGNS.filter((d) => {
        const saved = fillsByDesign[d.id];
        return Boolean(saved && Object.keys(saved).length > 0);
      });
    }
    return MANDALA_DESIGNS.filter((d) => d.theme === galleryFilter);
  }, [galleryFilter, fillsByDesign]);

  return (
    <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-gray-100 sm:p-5">
      <div className="text-center">
        <h2 className="text-lg font-bold text-gray-900">Calm Mandala Coloring</h2>
        <p className="mt-0.5 text-xs text-gray-500">
          Pick a shade below and tap any shape to unwind creatively.
        </p>
      </div>

      {/* Clear Fill Mode Toggle */}
      <div className="mt-3.5 flex flex-col items-center">
        <div
          className="grid w-full max-w-[300px] grid-cols-2 gap-1 rounded-2xl bg-gray-100/90 p-1"
          role="group"
          aria-label="Coloring mode"
        >
          <button
            type="button"
            onClick={() => setSymmetryMode(true)}
            aria-pressed={symmetryMode}
            className={`inline-flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition ${
              symmetryMode
                ? 'bg-white text-violet-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Sparkles size={12} />
            <span>Fill whole ring</span>
          </button>
          <button
            type="button"
            onClick={() => setSymmetryMode(false)}
            aria-pressed={!symmetryMode}
            className={`inline-flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition ${
              !symmetryMode
                ? 'bg-white text-violet-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span>Single shape</span>
          </button>
        </div>
        <p className="mt-1.5 text-center text-[11px] text-gray-400">
          {symmetryMode
            ? 'Tapping a shape colors every matching shape in that ring together.'
            : 'Tapping a shape colors only that individual piece.'}
        </p>
      </div>

      {/* Mandala Art Stage */}
      <div className="mt-4 flex flex-col items-center">
        <div className="mb-2.5 flex flex-wrap items-center justify-center gap-2 text-center">
          <h3 className="text-sm font-bold text-gray-900">{activeDesign.name}</h3>
          <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-[10px] font-semibold text-violet-700 ring-1 ring-violet-100">
            {MANDALA_THEME_LABELS[activeDesign.theme]}
          </span>
        </div>

        <div className="w-full max-w-[310px] rounded-3xl bg-gradient-to-br from-slate-50 via-white to-violet-50/40 p-3 ring-1 ring-gray-100">
          <MandalaSvg
            design={activeDesign}
            fills={fills}
            interactive
            onSelectRegion={applyColor}
          />
        </div>

        <div className="mt-3.5 grid w-full grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleRandomDesign}
            className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-violet-50/80 px-3 py-2.5 text-xs font-semibold text-violet-700 ring-1 ring-violet-100 transition hover:bg-violet-100 active:scale-[0.98]"
            aria-label="Surprise me with another mandala design"
          >
            <Shuffle size={13} />
            <span>Surprise me</span>
          </button>
          <button
            type="button"
            onClick={() => setIsGalleryOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-violet-600 px-3 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-700 active:scale-[0.98]"
          >
            <LayoutGrid size={13} />
            <span>Browse gallery</span>
          </button>
        </div>
      </div>

      {/* Multi-Palette Color Selector */}
      <div className="mt-4 rounded-2xl bg-gray-50/80 p-3 ring-1 ring-gray-100">
        <div
          className="flex flex-wrap items-center justify-center gap-1"
          role="tablist"
          aria-label="Color palette collections"
        >
          {COLOR_PALETTES.map((palette) => {
            const isActive = palette.id === activePaletteId;
            return (
              <button
                key={palette.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => {
                  setActivePaletteId(palette.id);
                  if (!palette.colors.some((c) => c.hex === selectedColor)) {
                    setSelectedColor(palette.colors[0].hex);
                  }
                }}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                  isActive
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'bg-white text-gray-600 ring-1 ring-gray-200/80 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {palette.label}
              </button>
            );
          })}
        </div>

        <div className="mt-3 grid grid-cols-6 justify-items-center gap-x-2 gap-y-2.5">
          {activePalette.colors.map((swatch) => {
            const isSelected = selectedColor === swatch.hex;
            const isWhite = swatch.hex === SOFT_WHITE.hex;
            return (
              <button
                key={`${activePalette.id}-${swatch.name}`}
                type="button"
                onClick={() => setSelectedColor(swatch.hex)}
                title={swatch.name}
                aria-label={`Select color ${swatch.name}`}
                aria-pressed={isSelected}
                style={{ backgroundColor: swatch.hex }}
                className={`h-8 w-8 rounded-full border transition active:scale-95 ${
                  isSelected
                    ? 'scale-110 border-gray-900 ring-2 ring-violet-400 ring-offset-2'
                    : isWhite
                      ? 'border-dashed border-gray-400 hover:scale-105'
                      : 'border-black/10 hover:scale-105'
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* Revamped bottom action bar */}
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
            onClick={handleClear}
            disabled={Object.keys(fills).length === 0}
            className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-200/70 transition hover:bg-rose-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <RotateCcw size={13} />
            <span>Clear</span>
          </button>
          <button
            type="button"
            onClick={handleInspirePreset}
            className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-violet-600 px-3 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-700 active:scale-[0.98]"
          >
            <Palette size={14} />
            <span>Inspire</span>
          </button>
        </div>
      </div>

      {/* Browse 100 Designs Modal (portaled to document.body so it sits cleanly above BottomNav) */}
      {isGalleryOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Choose a mandala design"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setIsGalleryOpen(false);
              }
            }}
          >
            <div className="flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-2xl sm:rounded-3xl">
              <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Mandala Designs</h3>
                  <p className="text-xs text-gray-500">
                    Pick any pattern to color at your own pace
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsGalleryOpen(false)}
                  className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-200"
                  aria-label="Close design gallery"
                >
                  <X size={14} />
                  <span>Close</span>
                </button>
              </div>

              {/* Theme filter pills */}
              <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-gray-100 bg-gray-50/70 px-5 py-2.5">
                {GALLERY_FILTERS.map((f) => {
                  const isSelected = galleryFilter === f.key;
                  return (
                    <button
                      key={String(f.key)}
                      type="button"
                      onClick={() => setGalleryFilter(f.key)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                        isSelected
                          ? 'bg-violet-600 text-white shadow-sm'
                          : 'bg-white text-gray-600 ring-1 ring-gray-200/80 hover:bg-gray-100'
                      }`}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>

              {/* Thumbnail Grid */}
              <div className="min-h-0 flex-1 overflow-y-auto p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
                {galleryDesigns.length === 0 ? (
                  <div className="py-10 text-center text-xs text-gray-500">
                    No colored designs yet — tap any mandala and start shading to see your art here.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
                    {galleryDesigns.map((design) => {
                      const savedFills = fillsByDesign[design.id] ?? {};
                      const isCurrent = design.id === activeDesign.id;
                      const hasArt = Object.keys(savedFills).length > 0;

                      return (
                        <button
                          key={design.id}
                          type="button"
                          onClick={() => {
                            setDesignId(design.id);
                            setIsGalleryOpen(false);
                          }}
                          className={`flex flex-col items-center rounded-2xl p-2 text-center transition active:scale-95 ${
                            isCurrent
                              ? 'bg-violet-50 ring-2 ring-violet-500'
                              : 'bg-gray-50/80 ring-1 ring-gray-200/70 hover:bg-violet-50/40 hover:ring-violet-200'
                          }`}
                        >
                          <div className="w-full max-w-[84px]">
                            <MandalaSvg design={design} fills={savedFills} interactive={false} />
                          </div>
                          <span className="mt-1 line-clamp-1 text-[10px] font-semibold text-gray-800">
                            {design.name}
                          </span>
                          {hasArt && (
                            <span className="mt-0.5 rounded-full bg-emerald-100 px-1.5 py-0.2 text-[9px] font-semibold text-emerald-700">
                              Colored
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

interface MandalaSvgProps {
  design: MandalaDesign;
  fills: Record<string, string>;
  interactive: boolean;
  onSelectRegion?: (layerKey: string, idx: number, count: number) => void;
}

function MandalaSvg({ design, fills, interactive, onSelectRegion }: MandalaSvgProps) {
  const getFill = (regionId: string): string => {
    const hex = fills[regionId];
    return hex && ALLOWED_HEX_SET.has(hex) ? hex : DEFAULT_FILL;
  };

  return (
    <svg
      viewBox="0 0 320 320"
      className="h-auto w-full select-none"
      role="img"
      aria-label={`${design.name} mandala design`}
    >
      {design.layers.map((layer) => {
        const stepDeg = 360 / layer.count;
        return Array.from({ length: layer.count }, (_, idx) => {
          const regionId = getRegionIdForLayer(layer.layerKey, idx, layer.count);
          const angle = idx * stepDeg + layer.offsetDeg;
          const transform = layer.count > 1 ? `rotate(${angle} 160 160)` : undefined;
          const fill = getFill(regionId);
          const commonClass = interactive
            ? 'cursor-pointer transition-colors duration-150 hover:opacity-90'
            : undefined;
          const handleClick = interactive
            ? () => onSelectRegion?.(layer.layerKey, idx, layer.count)
            : undefined;

          if (layer.kind === 'circle') {
            return (
              <circle
                key={regionId}
                cx={layer.cx}
                cy={layer.cy}
                r={layer.r}
                transform={transform}
                fill={fill}
                stroke={layer.strokeColor}
                strokeWidth={interactive ? layer.strokeWidth : layer.strokeWidth * 1.3}
                className={commonClass}
                onClick={handleClick}
              />
            );
          }

          return (
            <path
              key={regionId}
              d={layer.d}
              transform={transform}
              fill={fill}
              stroke={layer.strokeColor}
              strokeWidth={interactive ? layer.strokeWidth : layer.strokeWidth * 1.3}
              className={commonClass}
              onClick={handleClick}
            />
          );
        });
      })}
    </svg>
  );
}
