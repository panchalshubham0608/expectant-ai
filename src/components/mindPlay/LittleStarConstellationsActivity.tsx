import { useRef, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Heart,
  Lightbulb,
  RefreshCw,
  Undo2,
} from 'lucide-react';
import {
  CONSTELLATION_TIERS,
  getConstellationTierForSolvedCount,
  pickConstellation,
  type ConstellationPuzzle,
  type ConstellationTierKey,
} from '../../utils/constellationData';

interface LittleStarConstellationsActivityProps {
  sessionSolvedCount?: number;
  onBoardSolved?: () => void;
}

const SKY_DUST: readonly { x: number; y: number; r: number }[] = [
  { x: 26, y: 34, r: 1.2 },
  { x: 64, y: 24, r: 1.0 },
  { x: 118, y: 32, r: 1.3 },
  { x: 248, y: 28, r: 1.1 },
  { x: 324, y: 38, r: 1.4 },
  { x: 340, y: 92, r: 1.0 },
  { x: 22, y: 128, r: 1.2 },
  { x: 332, y: 176, r: 1.2 },
  { x: 34, y: 236, r: 1.3 },
  { x: 112, y: 248, r: 1.0 },
  { x: 268, y: 244, r: 1.1 },
  { x: 326, y: 238, r: 1.3 },
];

export default function LittleStarConstellationsActivity({
  sessionSolvedCount = 0,
  onBoardSolved,
}: LittleStarConstellationsActivityProps) {
  const initialTier = getConstellationTierForSolvedCount(sessionSolvedCount);
  const [tierKey, setTierKey] = useState<ConstellationTierKey>(initialTier.tierKey);
  const [puzzle, setPuzzle] = useState<ConstellationPuzzle>(() =>
    pickConstellation(initialTier.tierKey)
  );
  // Number of stars connected in sequence: 0 means none yet; puzzle.stars.length means all connected
  const [connectedCount, setConnectedCount] = useState<number>(1);
  const [isClosedCompleted, setIsClosedCompleted] = useState<boolean>(false);
  const [hintPulse, setHintPulse] = useState<boolean>(false);
  const [lastTierLevel, setLastTierLevel] = useState<number>(initialTier.level);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const solvedReportedRef = useRef<boolean>(false);

  const sessionTier = getConstellationTierForSolvedCount(sessionSolvedCount);
  const totalStars = puzzle.stars.length;
  const isSolved = puzzle.closed ? isClosedCompleted : connectedCount >= totalStars;

  // Next star index expected to connect
  const nextExpectedIndex = isSolved
    ? null
    : connectedCount < totalStars
      ? connectedCount
      : puzzle.closed
        ? 0
        : null;

  const startPuzzle = (nextTierKey: ConstellationTierKey, excludeId?: string) => {
    const picked = pickConstellation(nextTierKey, excludeId);
    setTierKey(nextTierKey);
    setPuzzle(picked);
    setConnectedCount(1);
    setIsClosedCompleted(false);
    setHintPulse(false);
    solvedReportedRef.current = false;
  };

  const handleAdvanceStar = (starIdx: number) => {
    if (isSolved || nextExpectedIndex === null) return;
    if (starIdx !== nextExpectedIndex) return;

    setHintPulse(false);

    if (connectedCount < totalStars) {
      const nextCount = connectedCount + 1;
      setConnectedCount(nextCount);
      if (!puzzle.closed && nextCount >= totalStars && !solvedReportedRef.current) {
        solvedReportedRef.current = true;
        onBoardSolved?.();
      }
    } else if (puzzle.closed && starIdx === 0) {
      setIsClosedCompleted(true);
      if (!solvedReportedRef.current) {
        solvedReportedRef.current = true;
        onBoardSolved?.();
      }
    }
  };

  const handleSvgPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDraggingRef.current || isSolved || nextExpectedIndex === null || !svgRef.current) {
      return;
    }
    const rect = svgRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const svgX = ((e.clientX - rect.left) / rect.width) * 360;
    const svgY = ((e.clientY - rect.top) / rect.height) * 264;

    const target = puzzle.stars[nextExpectedIndex];
    if (!target) return;
    if (Math.hypot(svgX - target.x, svgY - target.y) <= 24) {
      handleAdvanceStar(nextExpectedIndex);
    }
  };

  const handleUndo = () => {
    if (isClosedCompleted) {
      setIsClosedCompleted(false);
      return;
    }
    if (connectedCount > 1) {
      setConnectedCount((c) => c - 1);
      setHintPulse(false);
    }
  };

  const handleNextConstellation = () => {
    const targetTier =
      sessionTier.level > lastTierLevel ? sessionTier.tierKey : tierKey;
    setLastTierLevel(sessionTier.level);
    startPuzzle(targetTier, puzzle.id);
  };

  const hideFutureNumbers = sessionTier.hideFutureNumbers && tierKey === 'detailed';

  // Build connected polyline path
  const connectedPoints = puzzle.stars
    .slice(0, connectedCount)
    .map((s) => `${s.x},${s.y}`);
  if (isClosedCompleted && puzzle.stars.length > 0) {
    connectedPoints.push(`${puzzle.stars[0].x},${puzzle.stars[0].y}`);
  }

  const totalSteps = puzzle.closed ? totalStars : totalStars - 1;
  const completedSteps = isClosedCompleted ? totalStars : Math.max(0, connectedCount - 1);

  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
      <div className="text-center">
        <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-semibold text-indigo-700 ring-1 ring-indigo-100">
          <Heart size={10} />
          <span>Baby Bonding Sky</span>
        </div>
        <h2 className="text-lg font-bold text-gray-900">Little Star Constellations</h2>
        <p className="mt-0.5 text-xs text-gray-500">
          Tap or trace from star to star in order to reveal a sweet constellation for baby.
        </p>
      </div>

      {/* Tier Selector & Progress */}
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5" role="group" aria-label="Constellation detail">
          {CONSTELLATION_TIERS.map((t) => {
            const isActive = t.key === tierKey;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => startPuzzle(t.key, puzzle.id)}
                aria-pressed={isActive}
                className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
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

        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700">
          {completedSteps} / {totalSteps} lines
        </span>
      </div>

      {/* Interactive Twilight Constellation Sky */}
      <div className="mt-3.5 overflow-hidden rounded-3xl border border-indigo-200/70 shadow-inner">
        <svg
          ref={svgRef}
          viewBox="0 0 360 264"
          className="block w-full select-none touch-none"
          role="img"
          aria-label="Star constellation canvas"
          onPointerDown={() => {
            isDraggingRef.current = true;
          }}
          onPointerMove={handleSvgPointerMove}
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
            <linearGradient id="constellation-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#13183b" />
              <stop offset="60%" stopColor="#1f2559" />
              <stop offset="100%" stopColor="#353272" />
            </linearGradient>
          </defs>

          <rect x="0" y="0" width="360" height="264" fill="url(#constellation-sky)" />

          {/* Background Star Dust */}
          {SKY_DUST.map((d, idx) => (
            <circle key={idx} cx={d.x} cy={d.y} r={d.r} fill="#e0e7ff" opacity="0.4" />
          ))}

          {/* Revealed Soft Silhouette Glow When Solved */}
          {isSolved && (
            <polygon
              points={puzzle.stars.map((s) => `${s.x},${s.y}`).join(' ')}
              fill={puzzle.revealTint}
              opacity="0.2"
            />
          )}

          {/* Subtle Faint Guide Line to Next Star when Hint Active */}
          {hintPulse && nextExpectedIndex !== null && connectedCount > 0 && (
            <line
              x1={puzzle.stars[connectedCount - 1].x}
              y1={puzzle.stars[connectedCount - 1].y}
              x2={puzzle.stars[nextExpectedIndex].x}
              y2={puzzle.stars[nextExpectedIndex].y}
              stroke="#fde68a"
              strokeWidth="2"
              strokeDasharray="4 4"
              opacity="0.85"
            />
          )}

          {/* Connected Starlight Beams */}
          {connectedPoints.length >= 2 && (
            <>
              <polyline
                points={connectedPoints.join(' ')}
                fill="none"
                stroke={isSolved ? puzzle.revealTint : '#fde68a'}
                strokeWidth={isSolved ? '5' : '4'}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.28"
              />
              <polyline
                points={connectedPoints.join(' ')}
                fill="none"
                stroke={isSolved ? '#ffffff' : '#fef08a'}
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}

          {/* Extra Decorative Sparkles on Reveal */}
          {isSolved &&
            puzzle.accentSparkles?.map((sp, idx) => (
              <g key={idx}>
                <circle cx={sp.x} cy={sp.y} r="6" fill={puzzle.revealTint} opacity="0.35" />
                <circle cx={sp.x} cy={sp.y} r="2.8" fill="#ffffff" />
              </g>
            ))}

          {/* Constellation Stars */}
          {puzzle.stars.map((star, idx) => {
            const isConnected = idx < connectedCount;
            const isNext = idx === nextExpectedIndex;
            const isClosingTarget = isNext && idx === 0 && connectedCount >= totalStars;
            const showNumber =
              !isSolved &&
              (!hideFutureNumbers || isNext || isConnected || idx === nextExpectedIndex);

            return (
              <g
                key={idx}
                role="button"
                tabIndex={0}
                aria-label={
                  isClosingTarget
                    ? 'Connect back to star 1 to complete constellation'
                    : `Star ${idx + 1}`
                }
                onPointerDown={(e) => {
                  e.stopPropagation();
                  isDraggingRef.current = true;
                  handleAdvanceStar(idx);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleAdvanceStar(idx);
                  }
                }}
                style={{ cursor: isNext ? 'pointer' : 'default', outline: 'none' }}
              >
                {/* Generous tap area */}
                <circle cx={star.x} cy={star.y} r="22" fill="transparent" />

                {/* Pulsing Guide Halo for Next Star */}
                {isNext && (
                  <circle
                    cx={star.x}
                    cy={star.y}
                    r={hintPulse ? '18' : '14'}
                    fill="none"
                    stroke="#fde68a"
                    strokeWidth={hintPulse ? '2.4' : '1.6'}
                    opacity="0.85"
                    className="mindplay-motion-safe"
                    style={{ animation: 'mindplay-twinkle 1.6s ease-in-out infinite' }}
                  />
                )}

                {/* Star Core */}
                <circle
                  cx={star.x}
                  cy={star.y}
                  r={isNext ? '7.5' : isConnected ? '6.5' : '5'}
                  fill={
                    isSolved
                      ? puzzle.revealTint
                      : isNext
                        ? '#fde68a'
                        : isConnected
                          ? '#fef9c3'
                          : '#94a3b8'
                  }
                  stroke={isConnected || isNext ? '#ffffff' : 'rgba(255,255,255,0.4)'}
                  strokeWidth="1.4"
                />

                {/* Star Number Label */}
                {showNumber && (
                  <text
                    x={star.x}
                    y={star.y - 12}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="700"
                    fill={isNext ? '#fde68a' : isConnected ? '#e0e7ff' : 'rgba(224,231,255,0.68)'}
                    style={{ pointerEvents: 'none' }}
                  >
                    {isClosingTarget ? 'Finish ★' : idx + 1}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Solved Dedication Banner */}
      {isSolved ? (
        <div className="mt-4 rounded-2xl bg-gradient-to-br from-indigo-50 via-violet-50/70 to-amber-50/60 p-4 text-center ring-1 ring-indigo-200/70">
          <div className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-900">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>
              {puzzle.emoji} {puzzle.name}
            </span>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-indigo-800/90">
            &ldquo;{puzzle.dedication}&rdquo;
          </p>
          <button
            type="button"
            onClick={handleNextConstellation}
            className="mt-3.5 inline-flex w-full items-center justify-center gap-1.5 rounded-2xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-[0.99]"
          >
            <span>
              {sessionTier.level > lastTierLevel
                ? `Step up to ${sessionTier.label} sky`
                : 'Next constellation'}
            </span>
            <ArrowRight size={14} />
          </button>
        </div>
      ) : (
        <p className="mt-2.5 text-center text-[11px] font-medium text-gray-500">
          {nextExpectedIndex === 0 && connectedCount >= totalStars
            ? 'Tap star 1 to close the glowing constellation!'
            : `Connect to star ${(nextExpectedIndex ?? 0) + 1} next.`}
        </p>
      )}

      {/* Action Controls */}
      <div className="mt-3.5 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={handleUndo}
          disabled={connectedCount <= 1 && !isClosedCompleted}
          className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-200 disabled:opacity-45"
        >
          <Undo2 size={13} />
          <span>Undo</span>
        </button>

        <button
          type="button"
          onClick={() => setHintPulse(true)}
          disabled={isSolved}
          className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 ring-1 ring-amber-200/80 transition hover:bg-amber-100 disabled:opacity-45"
        >
          <Lightbulb size={13} />
          <span>Hint</span>
        </button>

        <button
          type="button"
          onClick={() => startPuzzle(tierKey, puzzle.id)}
          className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200/80 transition hover:bg-indigo-100"
        >
          <RefreshCw size={13} />
          <span>New sky</span>
        </button>
      </div>
    </div>
  );
}
