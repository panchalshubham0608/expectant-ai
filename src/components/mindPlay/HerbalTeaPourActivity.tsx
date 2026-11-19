import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  Lightbulb,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Undo2,
} from 'lucide-react';
import {
  TEA_COLOR_BY_ID,
  TEA_JAR_CAPACITY,
  applyTeaPour,
  canPourJar,
  findTeaPourHint,
  generateTeaPourPuzzle,
  getTeaPourTierForSolvedCount,
  hasAnyValidTeaPour,
  isJarComplete,
  isTeaPourSolved,
  type TeaJar,
  type TeaPourDifficulty,
  type TeaPourMove,
} from '../../utils/teaPourGenerator';

interface HerbalTeaPourActivityProps {
  sessionSolvedCount?: number;
  onBoardSolved?: () => void;
}

const DIFFICULTY_OPTIONS: readonly TeaPourDifficulty[] = [4, 5, 6, 7, 8] as const;

const cloneJars = (jars: readonly TeaJar[]): TeaJar[] => jars.map((jar) => [...jar]);

export default function HerbalTeaPourActivity({
  sessionSolvedCount = 0,
  onBoardSolved,
}: HerbalTeaPourActivityProps) {
  const [initialState] = useState(() => {
    const tier = getTeaPourTierForSolvedCount(sessionSolvedCount);
    const generated = generateTeaPourPuzzle(tier.difficulty, tier.strictMix);
    return {
      difficulty: tier.difficulty,
      initialJars: cloneJars(generated),
      jars: cloneJars(generated),
    };
  });

  const [difficulty, setDifficulty] = useState<TeaPourDifficulty>(initialState.difficulty);
  const [initialJars, setInitialJars] = useState<TeaJar[]>(initialState.initialJars);
  const [jars, setJars] = useState<TeaJar[]>(initialState.jars);
  const [selectedJarIdx, setSelectedJarIdx] = useState<number | null>(null);
  const [history, setHistory] = useState<TeaJar[][]>([]);
  const [hintMove, setHintMove] = useState<TeaPourMove | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [lastTierLevel, setLastTierLevel] = useState<number>(
    () => getTeaPourTierForSolvedCount(sessionSolvedCount).level
  );

  const solvedReportedRef = useRef(false);

  const sessionTier = getTeaPourTierForSolvedCount(sessionSolvedCount);
  const isSolved = useMemo(() => isTeaPourSolved(jars), [jars]);
  const completedJarsCount = useMemo(
    () => jars.filter((jar) => isJarComplete(jar)).length,
    [jars]
  );
  const noMovesLeft = useMemo(
    () => !isSolved && !hasAnyValidTeaPour(jars),
    [isSolved, jars]
  );

  useEffect(() => {
    if (isSolved && !solvedReportedRef.current) {
      solvedReportedRef.current = true;
      onBoardSolved?.();
    }
  }, [isSolved, onBoardSolved]);

  const startNewPuzzle = (
    nextDifficulty: TeaPourDifficulty,
    strictMix: boolean = sessionTier.strictMix,
    notice: string | null = null
  ) => {
    const generated = generateTeaPourPuzzle(nextDifficulty, strictMix);
    solvedReportedRef.current = false;
    setDifficulty(nextDifficulty);
    setInitialJars(cloneJars(generated));
    setJars(cloneJars(generated));
    setSelectedJarIdx(null);
    setHistory([]);
    setHintMove(null);
    setStatusMessage(notice);
  };

  const handlePourFreshMix = () => {
    const tier = getTeaPourTierForSolvedCount(sessionSolvedCount);
    const steppedUp = tier.level > lastTierLevel;
    setLastTierLevel(tier.level);
    const notice = steppedUp
      ? `Stepped up to ${tier.label} (${tier.difficulty} shades) — choose any blend size above anytime.`
      : null;
    startNewPuzzle(tier.difficulty, tier.strictMix, notice);
  };

  const handleRestartCurrent = () => {
    setHistory((prev) => [...prev.slice(-29), cloneJars(jars)]);
    setJars(cloneJars(initialJars));
    setSelectedJarIdx(null);
    setHintMove(null);
    setStatusMessage('Reset this blend back to the beginning.');
  };

  const handleJarTap = (jarIdx: number) => {
    if (isSolved) return;
    setStatusMessage(null);

    if (selectedJarIdx === null) {
      if (jars[jarIdx].length === 0) return;
      setSelectedJarIdx(jarIdx);
      return;
    }

    if (selectedJarIdx === jarIdx) {
      setSelectedJarIdx(null);
      return;
    }

    if (canPourJar(jars, selectedJarIdx, jarIdx)) {
      const applied = applyTeaPour(jars, selectedJarIdx, jarIdx);
      if (applied) {
        setHistory((prev) => [...prev.slice(-29), cloneJars(jars)]);
        setJars(applied.nextJars);
        setSelectedJarIdx(null);
        setHintMove(null);
      }
      return;
    }

    // Gentle UX: if tapping another non-empty jar that can't receive this pour,
    // smoothly lift that jar instead of showing a jarring error.
    if (jars[jarIdx].length > 0) {
      setSelectedJarIdx(jarIdx);
    } else {
      setSelectedJarIdx(null);
    }
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setJars(previous);
    setSelectedJarIdx(null);
    setHintMove(null);
    setStatusMessage(null);
  };

  const handleHint = () => {
    if (isSolved) return;
    const move = findTeaPourHint(jars);
    if (move) {
      setHintMove(move);
      setSelectedJarIdx(move.from);
      const topColorId = jars[move.from][jars[move.from].length - 1];
      const spec = topColorId ? TEA_COLOR_BY_ID.get(topColorId) : undefined;
      setStatusMessage(
        spec
          ? `Try pouring ${spec.label.toLowerCase()} into the highlighted jar.`
          : 'Try pouring from the lifted jar into the highlighted jar.'
      );
    } else {
      setHintMove(null);
      setStatusMessage('This mix got tangled — tap Undo a step or Restart to try again.');
    }
  };

  const isChangedFromInitial = useMemo(
    () => JSON.stringify(jars) !== JSON.stringify(initialJars),
    [jars, initialJars]
  );

  const isCompactJars = difficulty >= 7;

  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
      <div className="text-center">
        <div className="inline-flex items-center gap-1.5">
          <h2 className="text-lg font-bold text-gray-900">Watercolor Tea Pour</h2>
        </div>
        <p className="mt-0.5 text-xs text-gray-500">
          Gently pour matching herbal &amp; watercolor shades until every glass holds one pure color.
        </p>
      </div>

      {/* Difficulty Selector (4 to 8 shades) + Optional Restart */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <div className="inline-flex rounded-2xl bg-gray-100 p-1" role="group" aria-label="Number of shades">
          {DIFFICULTY_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                if (option !== difficulty) startNewPuzzle(option, option >= 6);
              }}
              className={`rounded-xl px-2.5 py-1.5 text-xs font-semibold transition ${
                difficulty === option
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        {isChangedFromInitial && !isSolved && (
          <button
            type="button"
            onClick={handleRestartCurrent}
            className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-200 hover:text-gray-900"
          >
            <RotateCcw size={12} />
            <span>Restart</span>
          </button>
        )}
      </div>

      {/* How to play */}
      <div className="mt-3 rounded-2xl bg-teal-50/70 px-3.5 py-2.5 text-[11px] leading-relaxed text-teal-900/90 ring-1 ring-teal-100">
        <span className="font-bold text-teal-950">How to play: </span>
        Tap a glass to lift it, then tap another glass to pour matching top shades into open space.
      </div>

      {/* Calm Progress Dots */}
      <div className="mt-3 flex items-center justify-between px-1 text-xs">
        <span className="font-medium text-gray-500">
          Blends completed:{' '}
          <strong className="text-gray-800">
            {completedJarsCount} of {difficulty}
          </strong>
        </span>
        <div className="flex items-center gap-1.5" aria-hidden="true">
          {Array.from({ length: difficulty }, (_, i) => (
            <span
              key={i}
              className={`h-2.5 w-2.5 rounded-full transition ${
                i < completedJarsCount ? 'scale-110 bg-teal-500' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Glass Jars Layout (flex-wrap centered for clean rows across 6 to 10 jars) */}
      <div
        className={`mt-5 flex flex-wrap items-end justify-center py-2 ${
          isCompactJars ? 'gap-x-2.5 gap-y-5' : 'gap-x-4 gap-y-6'
        }`}
      >
        {jars.map((jar, jarIdx) => {
          const isSelected = selectedJarIdx === jarIdx;
          const isComplete = isJarComplete(jar);
          const isHintFrom = hintMove?.from === jarIdx;
          const isHintTo = hintMove?.to === jarIdx;
          const isValidTarget =
            selectedJarIdx !== null &&
            selectedJarIdx !== jarIdx &&
            canPourJar(jars, selectedJarIdx, jarIdx);

          const topSpec =
            jar.length > 0 ? TEA_COLOR_BY_ID.get(jar[jar.length - 1]) : undefined;

          return (
            <button
              key={jarIdx}
              type="button"
              onClick={() => handleJarTap(jarIdx)}
              aria-label={`Glass ${jarIdx + 1}, ${
                jar.length === 0
                  ? 'empty'
                  : `${jar.length} of ${TEA_JAR_CAPACITY} layers, top is ${topSpec?.label ?? 'colored'}`
              }${isSelected ? ', selected' : ''}${isComplete ? ', completed' : ''}`}
              aria-pressed={isSelected}
              className={`group relative flex flex-col items-center focus:outline-none ${
                difficulty === 4
                  ? 'w-[28%]'
                  : difficulty <= 6
                    ? 'w-[21%]'
                    : 'w-[17%] min-w-[50px]'
              }`}
            >
              {/* Floating status badge above jar rim */}
              <div className="mb-1.5 flex h-5 items-center justify-center">
                {isComplete ? (
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200">
                    <Check size={12} strokeWidth={2.8} />
                  </span>
                ) : isHintFrom ? (
                  <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800 ring-1 ring-amber-300">
                    Lift
                  </span>
                ) : isHintTo ? (
                  <span className="whitespace-nowrap rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-xs">
                    Here
                  </span>
                ) : null}
              </div>

              {/* Glass rim */}
              <div
                className={`relative flex flex-col items-center transition-transform duration-200 ${
                  isSelected ? '-translate-y-2.5' : 'group-hover:-translate-y-0.5'
                }`}
              >
                <div
                  className={`h-1.5 rounded-full transition-colors ${
                    difficulty === 4
                      ? 'w-14 sm:w-16'
                      : isCompactJars
                        ? 'w-11 sm:w-12'
                        : 'w-12 sm:w-14'
                  } ${
                    isSelected
                      ? 'bg-teal-400'
                      : isHintTo || isHintFrom
                        ? 'bg-amber-400'
                        : isComplete
                          ? 'bg-emerald-300'
                          : 'bg-slate-200'
                  }`}
                />

                {/* Glass vessel */}
                <div
                  className={`relative -mt-0.5 flex flex-col-reverse justify-start overflow-hidden rounded-b-[1.35rem] rounded-t-sm border-2 bg-gradient-to-b from-white via-slate-50/60 to-slate-100/80 p-1 shadow-inner transition-all ${
                    difficulty === 4
                      ? 'h-32 w-[3.25rem] sm:w-14'
                      : isCompactJars
                        ? 'h-28 w-10 sm:w-11'
                        : 'h-30 w-11 sm:w-12'
                  } ${
                    isSelected
                      ? 'border-teal-500 shadow-md ring-2 ring-teal-200'
                      : isHintTo || isHintFrom
                        ? 'border-amber-400 ring-2 ring-amber-200'
                        : isValidTarget
                          ? 'border-teal-300'
                          : isComplete
                            ? 'border-emerald-300'
                            : 'border-slate-200/90'
                  }`}
                >
                  {/* Specular glass reflection */}
                  <div
                    className="pointer-events-none absolute inset-y-1.5 left-1.5 z-10 w-1.5 rounded-full bg-white/45"
                    aria-hidden="true"
                  />

                  {/* Liquid layers from bottom (index 0) up */}
                  {jar.map((colorId, layerIdx) => {
                    const spec = TEA_COLOR_BY_ID.get(colorId);
                    const isBottom = layerIdx === 0;
                    const isTopOfLiquid = layerIdx === jar.length - 1;
                    return (
                      <div
                        key={layerIdx}
                        style={{ backgroundColor: spec?.hex ?? '#cbd5e1' }}
                        className={`h-1/4 w-full transition-all duration-200 ${
                          isBottom ? 'rounded-b-[0.95rem]' : ''
                        } ${
                          isTopOfLiquid
                            ? 'rounded-t-xs border-t-2 border-white/50'
                            : 'border-t border-white/25'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Status / No-Moves / Celebration Banner */}
      {isSolved ? (
        <div
          role="status"
          className="mt-4 rounded-2xl bg-emerald-50 p-4 text-center ring-1 ring-emerald-200/70"
        >
          <div className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-800">
            <Sparkles size={15} className="text-emerald-600" />
            <span>Every soothing blend sorted!</span>
          </div>
          <p className="mt-1 text-xs text-emerald-700/90">
            {sessionTier.level > lastTierLevel
              ? `Ready for ${sessionTier.label} (${sessionTier.difficulty} shades) next!`
              : 'Lovely calm focus — enjoy a fresh watercolor mix whenever you like.'}
          </p>
        </div>
      ) : noMovesLeft ? (
        <div
          role="status"
          className="mt-4 rounded-2xl bg-amber-50 px-3.5 py-2.5 text-center text-xs font-medium text-amber-800 ring-1 ring-amber-200/70"
        >
          No pours left from here — tap <strong>Undo</strong> to step back or{' '}
          <strong>Restart</strong> to try this mix again.
        </div>
      ) : (
        statusMessage && (
          <div
            role="status"
            className="mt-4 rounded-2xl bg-amber-50 px-3.5 py-2.5 text-center text-xs font-medium text-amber-800 ring-1 ring-amber-200/70"
          >
            {statusMessage}
          </div>
        )
      )}

      {/* Bottom Action Bar */}
      <div className="mt-5 border-t border-gray-100 pt-4">
        {!isSolved ? (
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
              onClick={handleHint}
              className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-amber-50 px-3 py-2.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-200/70 transition hover:bg-amber-100 active:scale-[0.98]"
            >
              <Lightbulb size={14} />
              <span>Hint</span>
            </button>
            <button
              type="button"
              onClick={() => startNewPuzzle(difficulty, sessionTier.strictMix)}
              className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-teal-600 px-3 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-teal-700 active:scale-[0.98]"
            >
              <RefreshCw size={13} />
              <span>New mix</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handlePourFreshMix}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 active:scale-[0.99]"
          >
            <span>
              {sessionTier.level > lastTierLevel
                ? `Pour next level (${sessionTier.difficulty} shades)`
                : 'Pour a fresh mix'}
            </span>
            <ArrowRight size={15} />
          </button>
        )}
      </div>
    </div>
  );
}
