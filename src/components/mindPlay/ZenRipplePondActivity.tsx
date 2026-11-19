import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CloudRain,
  Flower2,
  Sparkles,
  Volume2,
  VolumeX,
  Waves,
} from 'lucide-react';
import { playWaterDropTone } from '../../utils/gentleAudio';
import {
  POND_LILY_PADS,
  POND_PEBBLES,
  POND_THEMES,
  POND_THEME_BY_ID,
  type PondThemeId,
} from '../../utils/zenPondData';

interface WaterRipple {
  id: number;
  x: number;
  y: number;
  maxRadius: number;
}

interface FloatingPetal {
  id: number;
  x: number;
  y: number;
  rotation: number;
  color: string;
}

const MAX_RIPPLES = 14;
const MAX_PETALS = 16;

export default function ZenRipplePondActivity() {
  const [themeId, setThemeId] = useState<PondThemeId>('morning-lotus');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isRainActive, setIsRainActive] = useState<boolean>(false);
  const [ripples, setRipples] = useState<WaterRipple[]>([]);
  const [petals, setPetals] = useState<FloatingPetal[]>(() => [
    { id: 1, x: 148, y: 120, rotation: 24, color: '#fbcfe8' },
    { id: 2, x: 214, y: 158, rotation: -38, color: '#fce7f3' },
    { id: 3, x: 162, y: 190, rotation: 62, color: '#fef3c7' },
  ]);

  const theme = POND_THEME_BY_ID[themeId];
  const svgRef = useRef<SVGSVGElement | null>(null);
  const isMutedRef = useRef<boolean>(isMuted);
  const themeRef = useRef(theme);
  const nextIdRef = useRef<number>(10);
  const lastDragRippleTimeRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const rippleTimersRef = useRef<number[]>([]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  useEffect(() => {
    const timers = rippleTimersRef.current;
    return () => {
      for (const t of timers) {
        window.clearTimeout(t);
      }
    };
  }, []);

  const spawnRipple = useCallback(
    (x: number, y: number, options: { playSound?: boolean; radius?: number } = {}) => {
      const clampedX = Math.max(18, Math.min(342, x));
      const clampedY = Math.max(18, Math.min(246, y));
      const id = nextIdRef.current++;
      const maxRadius = options.radius ?? 48 + Math.random() * 18;

      setRipples((prev) => [...prev.slice(-(MAX_RIPPLES - 1)), { id, x: clampedX, y: clampedY, maxRadius }]);

      const activeTheme = themeRef.current;
      if (options.playSound && !isMutedRef.current) {
        const noteIdx = Math.min(
          activeTheme.waterNotesHz.length - 1,
          Math.floor((clampedX / 360) * activeTheme.waterNotesHz.length)
        );
        const freq = activeTheme.waterNotesHz[noteIdx];
        if (typeof freq === 'number') {
          playWaterDropTone(freq, { volume: 0.075, duration: 1.0 });
        }
      }

      const timer = window.setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, 1750);
      rippleTimersRef.current.push(timer);
    },
    []
  );

  useEffect(() => {
    if (!isRainActive) return;
    const interval = window.setInterval(() => {
      const rx = 38 + Math.random() * 284;
      const ry = 36 + Math.random() * 192;
      spawnRipple(rx, ry, { playSound: false, radius: 36 + Math.random() * 16 });
    }, 950);

    return () => window.clearInterval(interval);
  }, [isRainActive, spawnRipple]);

  const toSvgCoords = (clientX: number, clientY: number): { x: number; y: number } | null => {
    if (!svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    return {
      x: ((clientX - rect.left) / rect.width) * 360,
      y: ((clientY - rect.top) / rect.height) * 264,
    };
  };

  const handlePondPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    isDraggingRef.current = true;
    const coords = toSvgCoords(e.clientX, e.clientY);
    if (!coords) return;
    lastDragRippleTimeRef.current = Date.now();
    spawnRipple(coords.x, coords.y, { playSound: true });
  };

  const handlePondPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDraggingRef.current) return;
    const now = Date.now();
    if (now - lastDragRippleTimeRef.current < 190) return;
    const coords = toSvgCoords(e.clientX, e.clientY);
    if (!coords) return;
    lastDragRippleTimeRef.current = now;
    spawnRipple(coords.x, coords.y, { playSound: false, radius: 38 });
  };

  const handleScatterPetals = () => {
    const added: FloatingPetal[] = Array.from({ length: 4 }, () => {
      const color =
        theme.petalColors[Math.floor(Math.random() * theme.petalColors.length)] ?? '#fbcfe8';
      return {
        id: nextIdRef.current++,
        x: 56 + Math.random() * 248,
        y: 44 + Math.random() * 176,
        rotation: Math.round(Math.random() * 360),
        color,
      };
    });
    setPetals((prev) => [...prev, ...added].slice(-MAX_PETALS));
    const first = added[0];
    if (first) {
      spawnRipple(first.x, first.y, { playSound: true, radius: 44 });
    }
  };

  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
      <div className="text-center">
        <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-cyan-50 px-2.5 py-0.5 text-[10px] font-semibold text-cyan-800 ring-1 ring-cyan-100">
          <Waves size={10} />
          <span>Calm Sensory Sanctuary</span>
        </div>
        <h2 className="text-lg font-bold text-gray-900">Zen Ripple Pond</h2>
        <p className="mt-0.5 text-xs text-gray-500">
          Tap or glide gently across the water to send soft ripples and drifting petals.
        </p>
      </div>

      {/* Pond Theme & Sound Toggle */}
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Pond theme">
          {POND_THEMES.map((t) => {
            const isActive = t.id === themeId;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setThemeId(t.id)}
                aria-pressed={isActive}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setIsMuted((m) => !m)}
          aria-pressed={isMuted}
          aria-label={isMuted ? 'Unmute water chimes' : 'Mute water chimes'}
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
            isMuted
              ? 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              : 'bg-cyan-50 text-cyan-800 ring-1 ring-cyan-200/80 hover:bg-cyan-100'
          }`}
        >
          {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
          <span>{isMuted ? 'Muted' : 'Chimes'}</span>
        </button>
      </div>

      {/* Interactive Serene SVG Pond */}
      <div className="mt-3.5 overflow-hidden rounded-3xl border border-cyan-200/60 shadow-inner">
        <svg
          ref={svgRef}
          viewBox="0 0 360 264"
          className="block w-full cursor-pointer select-none touch-none"
          role="img"
          aria-label="Interactive calm lotus pond — tap anywhere to create gentle water ripples"
          onPointerDown={handlePondPointerDown}
          onPointerMove={handlePondPointerMove}
          onPointerUp={() => {
            isDraggingRef.current = false;
          }}
          onPointerCancel={() => {
            isDraggingRef.current = false;
          }}
          onPointerLeave={() => {
            isDraggingRef.current = false;
          }}
        >
          <defs>
            <linearGradient id="zen-pond-water" x1="0" y1="0" x2="0.4" y2="1">
              <stop offset="0%" stopColor={theme.waterTop} />
              <stop offset="55%" stopColor={theme.waterMid} />
              <stop offset="100%" stopColor={theme.waterBottom} />
            </linearGradient>
          </defs>

          {/* Pond Water Surface */}
          <rect x="0" y="0" width="360" height="264" fill="url(#zen-pond-water)" />

          {/* Soft Submerged River Pebbles */}
          {POND_PEBBLES.map((peb, idx) => (
            <ellipse
              key={idx}
              cx={peb.x}
              cy={peb.y}
              rx={peb.rx}
              ry={peb.ry}
              fill={theme.pebbleFill}
              opacity={peb.opacity}
              transform={`rotate(${peb.rotation} ${peb.x} ${peb.y})`}
            />
          ))}

          {/* Gentle Gliding Koi Silhouettes Beneath the Water */}
          <g
            className="mindplay-motion-safe"
            opacity="0.52"
            style={{ animation: 'mindplay-koi-swim 14s ease-in-out infinite' }}
          >
            <g transform="translate(154, 134) rotate(-14)">
              <ellipse cx="0" cy="0" rx="14" ry="5.5" fill={theme.koiPrimary} />
              <ellipse cx="4" cy="-1" rx="6" ry="3.2" fill={theme.koiSecondary} opacity="0.85" />
              <path d="M -13 0 L -23 -6 L -20 0 L -23 6 Z" fill={theme.koiPrimary} />
            </g>
          </g>
          <g
            className="mindplay-motion-safe"
            opacity="0.42"
            style={{ animation: 'mindplay-koi-swim 18s ease-in-out 4s infinite reverse' }}
          >
            <g transform="translate(198, 178) rotate(162)">
              <ellipse cx="0" cy="0" rx="11" ry="4.5" fill={theme.koiSecondary} />
              <ellipse cx="3" cy="0" rx="5" ry="2.6" fill={theme.koiPrimary} opacity="0.8" />
              <path d="M -10 0 L -18 -5 L -16 0 L -18 5 Z" fill={theme.koiSecondary} />
            </g>
          </g>

          {/* Expanding Concentric Water Ripples */}
          {ripples.map((r) => (
            <g key={r.id} className="pointer-events-none">
              <g
                className="mindplay-motion-safe"
                style={{
                  transformOrigin: `${r.x}px ${r.y}px`,
                  animation: 'mindplay-ripple 1.65s ease-out forwards',
                }}
              >
                <circle
                  cx={r.x}
                  cy={r.y}
                  r={r.maxRadius}
                  fill="none"
                  stroke={theme.rippleStroke}
                  strokeWidth="1.8"
                />
                <circle
                  cx={r.x}
                  cy={r.y}
                  r={r.maxRadius * 0.65}
                  fill="none"
                  stroke={theme.rippleStroke}
                  strokeWidth="1.2"
                  opacity="0.7"
                />
                <circle
                  cx={r.x}
                  cy={r.y}
                  r={r.maxRadius * 0.34}
                  fill="none"
                  stroke={theme.rippleStroke}
                  strokeWidth="0.9"
                  opacity="0.5"
                />
              </g>
            </g>
          ))}

          {/* Floating Lotus Petals */}
          {petals.map((p) => (
            <g
              key={p.id}
              transform={`translate(${p.x}, ${p.y}) rotate(${p.rotation})`}
              className="pointer-events-none"
            >
              <path
                d="M 0 -6 C 4 -4 5 2 0 6 C -5 2 -4 -4 0 -6 Z"
                fill={p.color}
                opacity="0.9"
              />
            </g>
          ))}

          {/* Lily Pads & Lotus Blossoms */}
          {POND_LILY_PADS.map((pad) => (
            <g
              key={pad.id}
              transform={`translate(${pad.x}, ${pad.y}) rotate(${pad.rotation})`}
              className="pointer-events-none"
            >
              {/* Soft Shadow */}
              <ellipse cx="2" cy="4" rx={pad.rx} ry={pad.ry} fill="rgba(0,0,0,0.12)" />

              {/* Notched Lily Pad */}
              <path
                d={`M 0 0 L ${pad.rx} ${-pad.ry * 0.25} A ${pad.rx} ${pad.ry} 0 1 0 ${pad.rx * 0.92} ${pad.ry * 0.36} Z`}
                fill={pad.id === 'pad-1' || pad.id === 'pad-4' ? theme.padFill : theme.padHighlight}
              />
              {/* Delicate Leaf Veins */}
              <line x1="0" y1="0" x2={-pad.rx * 0.72} y2="0" stroke={theme.padVein} strokeWidth="0.9" opacity="0.55" />
              <line x1="0" y1="0" x2={-pad.rx * 0.45} y2={-pad.ry * 0.62} stroke={theme.padVein} strokeWidth="0.8" opacity="0.45" />
              <line x1="0" y1="0" x2={-pad.rx * 0.45} y2={pad.ry * 0.62} stroke={theme.padVein} strokeWidth="0.8" opacity="0.45" />

              {/* Blooming Lotus on Featured Pads */}
              {pad.hasLotus && (
                <g transform={`translate(-4, -2) scale(${pad.lotusScale ?? 1})`}>
                  {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                    <ellipse
                      key={deg}
                      cx="0"
                      cy="-9"
                      rx="4.2"
                      ry="8.5"
                      fill={theme.lotusOuter}
                      transform={`rotate(${deg})`}
                      opacity="0.95"
                    />
                  ))}
                  {[22, 82, 142, 202, 262, 322].map((deg) => (
                    <ellipse
                      key={deg}
                      cx="0"
                      cy="-6"
                      rx="3.2"
                      ry="6.2"
                      fill={theme.lotusInner}
                      transform={`rotate(${deg})`}
                    />
                  ))}
                  <circle cx="0" cy="0" r="4.2" fill={theme.lotusCenter} />
                </g>
              )}
            </g>
          ))}
        </svg>
      </div>

      <p className="mt-2.5 text-center text-[11px] font-medium text-gray-500">
        {isRainActive
          ? 'Soft raindrops are rippling across the pond. Breathe slowly and watch.'
          : 'Take a slow breath and tap anywhere on the water at your own pace.'}
      </p>

      {/* Pond Actions */}
      <div className="mt-3.5 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={handleScatterPetals}
          className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 ring-1 ring-rose-200/80 transition hover:bg-rose-100 active:scale-95"
        >
          <Flower2 size={13} />
          <span>Petals</span>
        </button>

        <button
          type="button"
          onClick={() => setIsRainActive((r) => !r)}
          aria-pressed={isRainActive}
          className={`inline-flex items-center justify-center gap-1.5 rounded-2xl px-3 py-2 text-xs font-semibold transition active:scale-95 ${
            isRainActive
              ? 'bg-cyan-600 text-white shadow-xs'
              : 'bg-cyan-50 text-cyan-800 ring-1 ring-cyan-200/80 hover:bg-cyan-100'
          }`}
        >
          <CloudRain size={13} />
          <span>{isRainActive ? 'Stop rain' : 'Soft rain'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setPetals([]);
            spawnRipple(180, 132, { playSound: true, radius: 64 });
          }}
          className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-200 active:scale-95"
        >
          <Sparkles size={13} />
          <span>Still water</span>
        </button>
      </div>
    </div>
  );
}
