import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Heart,
  Music,
  Play,
  RotateCcw,
  Square,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { playMusicBoxTone } from '../../utils/gentleAudio';
import {
  AMBIENT_TWINKLE_STARS,
  CHIME_SCALES,
  CHIME_SCALE_BY_ID,
  CHIME_STARS,
  LULLABY_PRESETS,
  type ChimeScaleId,
  type ChimeStarNode,
} from '../../utils/lullabyChimesData';

interface ChimeBurst {
  id: number;
  x: number;
  y: number;
  glow: string;
}

const MAX_RECORDED_NOTES = 12;

const buildStarPoints = (cx: number, cy: number, outerR: number, innerR: number): string => {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    pts.push(`${(cx + Math.cos(angle) * r).toFixed(1)},${(cy + Math.sin(angle) * r).toFixed(1)}`);
  }
  return pts.join(' ');
};

const buildSparklePath = (cx: number, cy: number, r: number): string =>
  `M ${cx} ${cy - r} Q ${cx + r * 0.16} ${cy - r * 0.16} ${cx + r} ${cy} Q ${cx + r * 0.16} ${cy + r * 0.16} ${cx} ${cy + r} Q ${cx - r * 0.16} ${cy + r * 0.16} ${cx - r} ${cy} Q ${cx - r * 0.16} ${cy - r * 0.16} ${cx} ${cy - r} Z`;

export default function LullabyStarChimesActivity() {
  const [scaleId, setScaleId] = useState<ChimeScaleId>('starlight');
  const [isMuted, setIsMuted] = useState(false);
  const [litStarIndex, setLitStarIndex] = useState<number | null>(null);
  const [bursts, setBursts] = useState<ChimeBurst[]>([]);
  const [recordedNotes, setRecordedNotes] = useState<number[]>([]);
  const [playingLullabyId, setPlayingLullabyId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>(
    'Tap any glowing star to play a soft lullaby — every note harmonizes.'
  );

  const scale = CHIME_SCALE_BY_ID[scaleId];
  const isMutedRef = useRef(isMuted);
  const scaleRef = useRef(scale);
  const burstIdRef = useRef(1);
  const playbackTimersRef = useRef<number[]>([]);
  const burstTimersRef = useRef<number[]>([]);
  const litTimerRef = useRef<number | null>(null);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  const stopPlayback = useCallback(() => {
    for (const timer of playbackTimersRef.current) {
      window.clearTimeout(timer);
    }
    playbackTimersRef.current = [];
    setPlayingLullabyId(null);
  }, []);

  useEffect(() => {
    const burstTimers = burstTimersRef.current;
    return () => {
      stopPlayback();
      if (litTimerRef.current !== null) {
        window.clearTimeout(litTimerRef.current);
      }
      for (const timer of burstTimers) {
        window.clearTimeout(timer);
      }
    };
  }, [stopPlayback]);

  const triggerChimeVisualAndSound = useCallback((starIndex: number) => {
    const star = CHIME_STARS[starIndex];
    if (!star) return;

    const activeScale = scaleRef.current;
    const freq = activeScale.frequencies[starIndex];
    if (!isMutedRef.current && typeof freq === 'number') {
      playMusicBoxTone(freq, { volume: 0.11, duration: 1.5 });
    }

    setLitStarIndex(starIndex);
    if (litTimerRef.current !== null) {
      window.clearTimeout(litTimerRef.current);
    }
    litTimerRef.current = window.setTimeout(() => {
      setLitStarIndex((curr) => (curr === starIndex ? null : curr));
    }, 420);

    const burstId = burstIdRef.current++;
    setBursts((prev) => [...prev.slice(-8), { id: burstId, x: star.x, y: star.y, glow: star.glow }]);

    const timer = window.setTimeout(() => {
      setBursts((prev) => prev.filter((b) => b.id !== burstId));
    }, 900);
    burstTimersRef.current.push(timer);
  }, []);

  const handleTapStar = (star: ChimeStarNode) => {
    if (playingLullabyId !== null) {
      stopPlayback();
    }
    triggerChimeVisualAndSound(star.index);
    setRecordedNotes((prev) => [...prev.slice(-(MAX_RECORDED_NOTES - 1)), star.index]);
    const label = scale.noteLabels[star.index] ?? '';
    setStatusMessage(
      isMuted
        ? `Glowing star ${label} (sound muted — tap speaker to hear chimes).`
        : `Soft chime ${label} drifting across the night sky.`
    );
  };

  const handlePlayLullaby = (presetId: string) => {
    if (playingLullabyId === presetId) {
      stopPlayback();
      setStatusMessage('Paused lullaby. Tap any star to play your own.');
      return;
    }

    const preset = LULLABY_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    stopPlayback();
    setPlayingLullabyId(preset.id);
    setStatusMessage(`Playing "${preset.name}" — ${preset.tagline.toLowerCase()}.`);

    let maxDelay = 0;
    for (const step of preset.steps) {
      if (step.delayMs > maxDelay) maxDelay = step.delayMs;
      const timer = window.setTimeout(() => {
        triggerChimeVisualAndSound(step.starIndex);
      }, step.delayMs);
      playbackTimersRef.current.push(timer);
    }

    const doneTimer = window.setTimeout(() => {
      setPlayingLullabyId(null);
      setStatusMessage('Lullaby finished. Tap the stars or pick another melody.');
    }, maxDelay + 900);
    playbackTimersRef.current.push(doneTimer);
  };

  const handleReplayMyMelody = () => {
    if (recordedNotes.length === 0) return;
    if (playingLullabyId === 'custom') {
      stopPlayback();
      return;
    }

    stopPlayback();
    setPlayingLullabyId('custom');
    setStatusMessage('Replaying your gentle melody for baby…');

    const notesSnapshot = [...recordedNotes];
    notesSnapshot.forEach((starIndex, idx) => {
      const timer = window.setTimeout(() => {
        triggerChimeVisualAndSound(starIndex);
      }, idx * 480);
      playbackTimersRef.current.push(timer);
    });

    const doneTimer = window.setTimeout(() => {
      setPlayingLullabyId(null);
      setStatusMessage('What a sweet little tune. Add more stars anytime.');
    }, notesSnapshot.length * 480 + 600);
    playbackTimersRef.current.push(doneTimer);
  };

  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
      <div className="text-center">
        <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-semibold text-indigo-700 ring-1 ring-indigo-100">
          <Heart size={10} />
          <span>Baby Bonding Music Box</span>
        </div>
        <h2 className="text-lg font-bold text-gray-900">Lullaby Star Chimes</h2>
        <p className="mt-0.5 text-xs text-gray-500">
          Tap the glowing stars or play a gentle cradle tune — impossible to hit a wrong note.
        </p>
      </div>

      {/* Scale Mood & Mute Row */}
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Chime scale">
          {CHIME_SCALES.map((s) => {
            const isActive = s.id === scaleId;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setScaleId(s.id)}
                aria-pressed={isActive}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setIsMuted((m) => !m)}
          aria-pressed={isMuted}
          aria-label={isMuted ? 'Unmute star chimes' : 'Mute star chimes'}
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
            isMuted
              ? 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              : 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200/80 hover:bg-indigo-100'
          }`}
        >
          {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
          <span>{isMuted ? 'Muted' : 'Sound on'}</span>
        </button>
      </div>

      {/* Interactive Twilight Music-Box Sky */}
      <div className="mt-3.5 overflow-hidden rounded-3xl border border-indigo-200/70 shadow-inner">
        <svg
          viewBox="0 0 360 246"
          className="block w-full select-none touch-manipulation"
          role="img"
          aria-label="Twilight sky with 9 glowing star chimes"
        >
          <defs>
            <linearGradient id="lullaby-sky-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={scale.skyTop} />
              <stop offset="58%" stopColor={scale.skyMid} />
              <stop offset="100%" stopColor={scale.skyBottom} />
            </linearGradient>
            <radialGradient id="lullaby-moon-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fef9c3" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#fef9c3" stopOpacity="0" />
            </radialGradient>
          </defs>

          <rect x="0" y="0" width="360" height="246" fill="url(#lullaby-sky-grad)" />

          {/* Ambient Twinkling Stars */}
          {AMBIENT_TWINKLE_STARS.map((st, idx) => (
            <circle
              key={idx}
              cx={st.x}
              cy={st.y}
              r={st.r}
              fill="#fef9c3"
              className="mindplay-motion-safe"
              style={{
                animation: `mindplay-twinkle 3.2s ease-in-out ${st.delay} infinite`,
              }}
            />
          ))}

          {/* Subtle Constellation Harp Strings */}
          <polyline
            points={CHIME_STARS.map((s) => `${s.x},${s.y}`).join(' ')}
            fill="none"
            stroke="rgba(255,255,255,0.14)"
            strokeWidth="1.2"
            strokeDasharray="3 4"
          />

          {/* Soft Rolling Twilight Hills */}
          <path
            d="M 0 218 Q 92 184 190 212 T 360 202 L 360 246 L 0 246 Z"
            fill={scale.hillBack}
          />
          <path
            d="M 0 232 Q 116 206 238 228 T 360 218 L 360 246 L 0 246 Z"
            fill={scale.hillFront}
          />

          {/* Soft Moon Aura behind Star 3 */}
          <circle cx="158" cy="86" r="46" fill="url(#lullaby-moon-glow)" />

          {/* Expanding Chime Halos */}
          {bursts.map((b) => (
            <g
              key={b.id}
              style={{
                transformOrigin: `${b.x}px ${b.y}px`,
                animation: 'mindplay-halo 880ms ease-out forwards',
              }}
              className="mindplay-motion-safe pointer-events-none"
            >
              <circle
                cx={b.x}
                cy={b.y}
                r="22"
                fill="none"
                stroke={b.glow}
                strokeWidth="2.4"
              />
              <circle
                cx={b.x}
                cy={b.y}
                r="14"
                fill={b.glow}
                opacity="0.22"
              />
            </g>
          ))}

          {/* Interactive Star Chimes */}
          {CHIME_STARS.map((star) => {
            const isLit = litStarIndex === star.index;
            const noteLabel = scale.noteLabels[star.index] ?? '';
            return (
              <g
                key={star.index}
                role="button"
                tabIndex={0}
                aria-label={`Play chime ${noteLabel}`}
                onPointerDown={(e) => {
                  e.preventDefault();
                  handleTapStar(star);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleTapStar(star);
                  }
                }}
                style={{ cursor: 'pointer', outline: 'none' }}
              >
                {/* Generous invisible hit area */}
                <circle cx={star.x} cy={star.y} r="25" fill="transparent" />

                {/* Soft Outer Halo */}
                <circle
                  cx={star.x}
                  cy={star.y}
                  r={isLit ? star.radius + 9 : star.radius + 3}
                  fill={star.glow}
                  opacity={isLit ? 0.34 : 0.16}
                  style={{ transition: 'all 180ms ease-out' }}
                />

                {/* Star / Moon / Sparkle Shape */}
                {star.shape === 'star' && (
                  <polygon
                    points={buildStarPoints(
                      star.x,
                      star.y,
                      isLit ? star.radius + 2 : star.radius - 2,
                      isLit ? star.radius * 0.52 : star.radius * 0.44
                    )}
                    fill={star.fill}
                    stroke="#ffffff"
                    strokeWidth={isLit ? '1.8' : '0.9'}
                  />
                )}
                {star.shape === 'sparkle' && (
                  <path
                    d={buildSparklePath(
                      star.x,
                      star.y,
                      isLit ? star.radius + 3 : star.radius - 1
                    )}
                    fill={star.fill}
                    stroke="#ffffff"
                    strokeWidth={isLit ? '1.8' : '0.9'}
                  />
                )}
                {star.shape === 'moon' && (
                  <g>
                    <circle
                      cx={star.x}
                      cy={star.y}
                      r={isLit ? star.radius : star.radius - 2}
                      fill={star.fill}
                      stroke="#ffffff"
                      strokeWidth={isLit ? '1.8' : '0.9'}
                    />
                    <circle
                      cx={star.x + 6}
                      cy={star.y - 4}
                      r={star.radius - 5}
                      fill={scale.skyMid}
                    />
                  </g>
                )}
                {star.shape === 'gem' && (
                  <polygon
                    points={`${star.x},${star.y - (isLit ? 15 : 13)} ${star.x + (isLit ? 12 : 10)},${star.y} ${star.x},${star.y + (isLit ? 15 : 13)} ${star.x - (isLit ? 12 : 10)},${star.y}`}
                    fill={star.fill}
                    stroke="#ffffff"
                    strokeWidth={isLit ? '1.8' : '0.9'}
                  />
                )}

                {/* Tiny Note Caption */}
                <text
                  x={star.x}
                  y={star.y + star.radius + 13}
                  textAnchor="middle"
                  fontSize="8.5"
                  fontWeight="600"
                  fill="rgba(255,255,255,0.72)"
                  style={{ pointerEvents: 'none' }}
                >
                  {noteLabel}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <p className="mt-2.5 text-center text-[11px] font-medium text-gray-500">
        {statusMessage}
      </p>

      {/* Built-in Lullaby Presets */}
      <div className="mt-3.5">
        <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-gray-600">
          <Music size={12} className="text-indigo-500" />
          <span>Gentle Lullabies</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {LULLABY_PRESETS.map((preset) => {
            const isPlaying = playingLullabyId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handlePlayLullaby(preset.id)}
                className={`flex items-center justify-between gap-2 rounded-2xl px-3 py-2 text-left text-xs font-semibold transition active:scale-[0.98] ${
                  isPlaying
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-indigo-50/70 text-indigo-900 ring-1 ring-indigo-100 hover:bg-indigo-100/80'
                }`}
              >
                <span className="truncate">{preset.name}</span>
                {isPlaying ? (
                  <Square size={12} className="shrink-0 fill-current" />
                ) : (
                  <Play size={12} className="shrink-0 fill-current" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Replay Your Own Melody Bar */}
      <div className="mt-3.5 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleReplayMyMelody}
          disabled={recordedNotes.length === 0}
          className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 ring-1 ring-violet-200/80 transition hover:bg-violet-100 disabled:opacity-45"
        >
          {playingLullabyId === 'custom' ? <Square size={13} /> : <Play size={13} />}
          <span>
            {playingLullabyId === 'custom'
              ? 'Stop replay'
              : `Replay tune${recordedNotes.length > 0 ? ` (${recordedNotes.length})` : ''}`}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            stopPlayback();
            setRecordedNotes([]);
            setStatusMessage('Cleared your melody ribbon. Tap any star to begin anew.');
          }}
          disabled={recordedNotes.length === 0 && playingLullabyId === null}
          className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-200 disabled:opacity-45"
        >
          <RotateCcw size={13} />
          <span>Clear tune</span>
        </button>
      </div>
    </div>
  );
}
