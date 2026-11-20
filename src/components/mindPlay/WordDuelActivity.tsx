import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Delete,
  Eye,
  EyeOff,
  HelpCircle,
  Lightbulb,
  Lock,
  RefreshCw,
  Shuffle,
  Sparkles,
  Type,
  User,
  Users,
} from 'lucide-react';
import {
  MAX_WORD_GUESSES,
  WORD_LENGTH,
  computeKeyboardStates,
  evaluateWordGuess,
  isValidFiveLetterInput,
  pickRandomWord,
  pickSetterSuggestions,
  sanitizeFiveLetterWord,
  type LetterEval,
} from '../../utils/wordDuelEngine';

interface WordDuelActivityProps {
  sessionSolvedCount?: number;
  onBoardSolved?: () => void;
}

type WordMode = 'two-player' | 'solo';
type DuelPhase = 'setup' | 'guessing';

const KEYBOARD_ROWS: readonly (readonly string[])[] = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACK'],
] as const;

const EVAL_TILE_CLASS: Record<LetterEval, string> = {
  correct: 'bg-emerald-600 text-white border-emerald-600',
  present: 'bg-amber-500 text-white border-amber-500',
  absent: 'bg-slate-500 text-white border-slate-500',
};

const EVAL_KEY_CLASS: Record<LetterEval, string> = {
  correct: 'bg-emerald-600 text-white',
  present: 'bg-amber-500 text-white',
  absent: 'bg-slate-400 text-white/95',
};

export default function WordDuelActivity({
  onBoardSolved,
}: WordDuelActivityProps) {
  const [mode, setMode] = useState<WordMode>('two-player');
  const [phase, setPhase] = useState<DuelPhase>('setup');
  const [setterPlayer, setSetterPlayer] = useState<1 | 2>(1);
  const [secretInput, setSecretInput] = useState<string>('');
  const [showSecretInput, setShowSecretInput] = useState<boolean>(false);
  const [suggestions, setSuggestions] = useState<string[]>(() => pickSetterSuggestions(4));

  const [targetWord, setTargetWord] = useState<string>(() => pickRandomWord());
  const [guesses, setGuesses] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState<string>('');
  const [hintBanner, setHintBanner] = useState<string | null>(null);
  const [scores, setScores] = useState<{ p1: number; p2: number }>({ p1: 0, p2: 0 });
  const [showRules, setShowRules] = useState(false);

  const usedWordsRef = useRef<Set<string>>(new Set());
  const solvedReportedRef = useRef<boolean>(false);

  const guesserPlayer: 1 | 2 = setterPlayer === 1 ? 2 : 1;

  const isWon = guesses.includes(targetWord);
  const isLost = !isWon && guesses.length >= MAX_WORD_GUESSES;
  const isRoundOver = phase === 'guessing' && (isWon || isLost);

  const keyboardStates = useMemo(
    () => (phase === 'guessing' ? computeKeyboardStates(guesses, targetWord) : {}),
    [phase, guesses, targetWord]
  );

  const startSoloRound = () => {
    const nextWord = pickRandomWord(usedWordsRef.current);
    usedWordsRef.current.add(nextWord);
    setMode('solo');
    setPhase('guessing');
    setTargetWord(nextWord);
    setGuesses([]);
    setCurrentGuess('');
    setHintBanner(null);
    solvedReportedRef.current = false;
  };

  const startDuelSetup = (nextSetter: 1 | 2, resetScores = false) => {
    setMode('two-player');
    setPhase('setup');
    setSetterPlayer(nextSetter);
    setSecretInput('');
    setShowSecretInput(false);
    setSuggestions(pickSetterSuggestions(4, usedWordsRef.current));
    setGuesses([]);
    setCurrentGuess('');
    setHintBanner(null);
    solvedReportedRef.current = false;
    if (resetScores) {
      setScores({ p1: 0, p2: 0 });
    }
  };

  const handleLockSecretWord = (wordToLock?: string) => {
    const cleaned = sanitizeFiveLetterWord(wordToLock ?? secretInput);
    if (!isValidFiveLetterInput(cleaned)) return;
    usedWordsRef.current.add(cleaned);
    setTargetWord(cleaned);
    setSecretInput('');
    setShowSecretInput(false);
    setGuesses([]);
    setCurrentGuess('');
    setHintBanner(null);
    setPhase('guessing');
  };

  const submitGuess = useCallback(() => {
    if (phase !== 'guessing' || isRoundOver) return;
    if (currentGuess.length !== WORD_LENGTH) return;

    const nextGuesses = [...guesses, currentGuess];
    setGuesses(nextGuesses);
    setCurrentGuess('');

    if (currentGuess === targetWord) {
      if (mode === 'two-player') {
        setScores((prev) =>
          guesserPlayer === 1
            ? { ...prev, p1: prev.p1 + 1 }
            : { ...prev, p2: prev.p2 + 1 }
        );
      } else if (!solvedReportedRef.current) {
        solvedReportedRef.current = true;
        onBoardSolved?.();
      }
    }
  }, [phase, isRoundOver, currentGuess, guesses, targetWord, mode, guesserPlayer, onBoardSolved]);

  const handleKeyPress = useCallback(
    (key: string) => {
      if (phase !== 'guessing' || isRoundOver) return;

      if (key === 'ENTER') {
        submitGuess();
        return;
      }
      if (key === 'BACK') {
        setCurrentGuess((prev) => prev.slice(0, -1));
        return;
      }
      if (/^[A-Z]$/.test(key)) {
        setCurrentGuess((prev) => (prev.length < WORD_LENGTH ? prev + key : prev));
      }
    },
    [phase, isRoundOver, submitGuess]
  );

  useEffect(() => {
    if (phase !== 'guessing' || isRoundOver) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        handleKeyPress('ENTER');
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleKeyPress('BACK');
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        handleKeyPress(e.key.toUpperCase());
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, isRoundOver, handleKeyPress]);

  const handleSoloHint = () => {
    if (isRoundOver) return;
    // Find first letter position not yet guessed accurately
    for (let pos = 0; pos < WORD_LENGTH; pos++) {
      const alreadyFound = guesses.some((g) => g[pos] === targetWord[pos]);
      if (!alreadyFound) {
        setHintBanner(`Gentle hint: letter #${pos + 1} is "${targetWord[pos]}".`);
        return;
      }
    }
  };

  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
      <div className="text-center">
        <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-0.5 text-[10px] font-semibold text-violet-700 ring-1 ring-violet-100">
          <Type size={10} />
          <span>5-Letter Word Deduction</span>
        </div>
        <h2 className="text-lg font-bold text-gray-900">Wordle Duel</h2>
        <p className="mt-0.5 text-xs text-gray-500">
          {mode === 'two-player'
            ? 'Pick a secret 5-letter word and pass the phone — 6 tries to crack it.'
            : 'Crack the hidden 5-letter word in 6 calm tries.'}
        </p>
      </div>

      {/* Mode Switch */}
      <div className="mt-3.5 grid grid-cols-2 gap-1.5 rounded-2xl bg-gray-100/90 p-1">
        <button
          type="button"
          onClick={() => startDuelSetup(1, true)}
          aria-pressed={mode === 'two-player'}
          className={`inline-flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition ${
            mode === 'two-player'
              ? 'bg-white text-indigo-700 shadow-xs'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Users size={13} />
          <span>2 Players</span>
        </button>
        <button
          type="button"
          onClick={startSoloRound}
          aria-pressed={mode === 'solo'}
          className={`inline-flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition ${
            mode === 'solo'
              ? 'bg-white text-indigo-700 shadow-xs'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <User size={13} />
          <span>Solo Classic</span>
        </button>
      </div>

      {/* Rules Toggle */}
      <div className="mt-2.5 flex items-center justify-between gap-2 px-0.5">
        <span className="text-[11px] font-medium text-gray-400">5 letters · 6 tries</span>
        <button
          type="button"
          onClick={() => setShowRules((v) => !v)}
          aria-expanded={showRules}
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
            showRules
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <HelpCircle size={12} />
          <span>Rules</span>
        </button>
      </div>

      {showRules && (
        <div className="mt-2.5 space-y-1 rounded-2xl bg-violet-50/75 p-3 text-xs leading-relaxed text-violet-950 ring-1 ring-violet-200/70">
          <p>
            <strong>Goal:</strong> Crack the hidden <strong>5-letter word</strong> within{' '}
            <strong>6 tries</strong>. In 2-Player mode, one player locks a secret word and passes
            the phone.
          </p>
          <p>
            <strong>Color clues:</strong> <span className="font-semibold text-emerald-700">Green</span>{' '}
            = right letter in the right spot ·{' '}
            <span className="font-semibold text-amber-700">Amber</span> = right letter in another
            spot · <span className="font-semibold text-slate-600">Gray</span> = not in the word.
          </p>
        </div>
      )}

      {/* 2-Player Score Row */}
      {mode === 'two-player' && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div
            className={`flex items-center justify-between rounded-2xl px-3 py-1.5 text-xs font-bold ${
              (phase === 'setup' && setterPlayer === 1) ||
              (phase === 'guessing' && guesserPlayer === 1)
                ? 'bg-indigo-50 text-indigo-800 ring-1 ring-indigo-300'
                : 'bg-gray-50 text-gray-700 ring-1 ring-gray-200/70'
            }`}
          >
            <span>Player 1</span>
            <span>{scores.p1}</span>
          </div>
          <div
            className={`flex items-center justify-between rounded-2xl px-3 py-1.5 text-xs font-bold ${
              (phase === 'setup' && setterPlayer === 2) ||
              (phase === 'guessing' && guesserPlayer === 2)
                ? 'bg-violet-50 text-violet-800 ring-1 ring-violet-300'
                : 'bg-gray-50 text-gray-700 ring-1 ring-gray-200/70'
            }`}
          >
            <span>Player 2</span>
            <span>{scores.p2}</span>
          </div>
        </div>
      )}

      {/* PHASE 1: 2-Player Secret Word Setup */}
      {mode === 'two-player' && phase === 'setup' ? (
        <div className="mt-4 space-y-3.5 rounded-3xl bg-indigo-50/60 p-4 ring-1 ring-indigo-100">
          <div className="text-center">
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 shadow-xs">
              <Lock size={10} />
              <span>Player {setterPlayer}&apos;s Turn to Pick</span>
            </span>
            <p className="mt-1.5 text-xs text-indigo-950">
              Choose a quick 5-letter word below or type your own, then pass the phone to{' '}
              <strong>Player {guesserPlayer}</strong>.
            </p>
          </div>

          {/* Quick-Pick Suggestions */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-indigo-900/80">
                Tap a ready-made word:
              </span>
              <button
                type="button"
                onClick={() => setSuggestions(pickSetterSuggestions(4, usedWordsRef.current))}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 hover:underline"
              >
                <Shuffle size={11} />
                <span>More ideas</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {suggestions.map((word) => (
                <button
                  key={word}
                  type="button"
                  onClick={() => handleLockSecretWord(word)}
                  className="rounded-2xl bg-white py-2.5 text-center text-xs font-bold tracking-[0.2em] text-indigo-900 shadow-xs ring-1 ring-indigo-200/80 transition hover:bg-indigo-600 hover:text-white active:scale-95"
                >
                  {word}
                </button>
              ))}
            </div>
          </div>

          {/* Or Type Custom 5-Letter Word */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLockSecretWord();
            }}
            className="space-y-2 border-t border-indigo-200/60 pt-3"
          >
            <label
              htmlFor="word-duel-secret"
              className="block text-[11px] font-semibold text-indigo-900/80"
            >
              Or enter your own 5-letter word:
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  id="word-duel-secret"
                  type={showSecretInput ? 'text' : 'password'}
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={WORD_LENGTH}
                  value={secretInput}
                  onChange={(e) => setSecretInput(sanitizeFiveLetterWord(e.target.value))}
                  placeholder="5 letters (A–Z)"
                  className="w-full rounded-2xl border border-indigo-200 bg-white px-3.5 py-2.5 pr-10 text-sm font-bold uppercase tracking-[0.2em] text-gray-900 placeholder:text-xs placeholder:font-normal placeholder:tracking-normal placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowSecretInput((v) => !v)}
                  aria-label={showSecretInput ? 'Hide secret word' : 'Show secret word'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showSecretInput ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={!isValidFiveLetterInput(secretInput)}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-2xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-45"
            >
              <span>Lock word &amp; pass to Player {guesserPlayer}</span>
              <ArrowRight size={14} />
            </button>
          </form>
        </div>
      ) : (
        /* PHASE 2: Guessing Board */
        <div className="mt-4">
          {mode === 'two-player' && !isRoundOver && (
            <p className="mb-2.5 text-center text-[11px] font-semibold text-indigo-700">
              Player {guesserPlayer} is guessing Player {setterPlayer}&apos;s secret word
            </p>
          )}

          {/* Color Legend */}
          <div className="mb-3 flex flex-wrap items-center justify-center gap-3 text-[10px] font-semibold text-gray-500">
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-xs bg-emerald-600" />
              Right spot
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-xs bg-amber-500" />
              Wrong spot
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-xs bg-slate-500" />
              Not in word
            </span>
          </div>

          {/* 6x5 Letter Grid */}
          <div className="mx-auto grid max-w-[268px] grid-rows-6 gap-1.5">
            {Array.from({ length: MAX_WORD_GUESSES }, (_, rowIdx) => {
              const submitted = guesses[rowIdx];
              const isActiveRow = !isRoundOver && rowIdx === guesses.length;
              const evals = submitted ? evaluateWordGuess(submitted, targetWord) : null;

              return (
                <div key={rowIdx} className="grid grid-cols-5 gap-1.5">
                  {Array.from({ length: WORD_LENGTH }, (_, colIdx) => {
                    const ch = submitted
                      ? submitted[colIdx]
                      : isActiveRow
                        ? currentGuess[colIdx] ?? ''
                        : '';
                    const tileEval = evals ? evals[colIdx] : null;

                    return (
                      <div
                        key={colIdx}
                        className={`flex aspect-square items-center justify-center rounded-xl border-2 text-lg font-bold uppercase transition ${
                          tileEval
                            ? EVAL_TILE_CLASS[tileEval]
                            : ch
                              ? 'border-indigo-400 bg-white text-gray-900'
                              : 'border-gray-200 bg-gray-50/70 text-gray-400'
                        }`}
                      >
                        {ch}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {hintBanner && !isRoundOver && (
            <p className="mt-2.5 text-center text-xs font-semibold text-amber-700">
              {hintBanner}
            </p>
          )}

          {/* Round Result Banner */}
          {isRoundOver ? (
            <div className="mt-4 rounded-2xl bg-gradient-to-br from-emerald-50 via-white to-indigo-50/70 p-4 text-center ring-1 ring-emerald-200/70">
              <div className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-900">
                <Sparkles size={15} className="text-indigo-600" />
                <span>
                  {isWon
                    ? mode === 'two-player'
                      ? `Player ${guesserPlayer} cracked "${targetWord}" in ${guesses.length}!`
                      : `Solved "${targetWord}" in ${guesses.length} ${guesses.length === 1 ? 'try' : 'tries'}!`
                    : `The word was "${targetWord}"`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (mode === 'two-player') {
                    startDuelSetup(guesserPlayer, false);
                  } else {
                    startSoloRound();
                  }
                }}
                className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-2xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-[0.99]"
              >
                <span>
                  {mode === 'two-player'
                    ? `Swap roles — Player ${guesserPlayer} picks next`
                    : 'Next word'}
                </span>
                <ArrowRight size={14} />
              </button>
            </div>
          ) : (
            <>
              {/* On-Screen QWERTY Keyboard */}
              <div className="mt-4 space-y-1.5 select-none">
                {KEYBOARD_ROWS.map((row, rIdx) => (
                  <div key={rIdx} className="flex justify-center gap-1">
                    {row.map((key) => {
                      const isEnter = key === 'ENTER';
                      const isBack = key === 'BACK';
                      const state = !isEnter && !isBack ? keyboardStates[key] : undefined;

                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => handleKeyPress(key)}
                          disabled={isEnter && currentGuess.length < WORD_LENGTH}
                          aria-label={isBack ? 'Backspace' : isEnter ? 'Submit guess' : key}
                          className={`flex h-10 items-center justify-center rounded-xl text-xs font-bold transition active:scale-95 ${
                            isEnter
                              ? 'px-2.5 text-[10px] bg-indigo-600 text-white disabled:bg-gray-200 disabled:text-gray-400'
                              : isBack
                                ? 'px-2.5 bg-gray-200 text-gray-700 hover:bg-gray-300'
                                : state
                                  ? `min-w-0 flex-1 ${EVAL_KEY_CLASS[state]}`
                                  : 'min-w-0 flex-1 bg-gray-100 text-gray-800 hover:bg-gray-200'
                          }`}
                        >
                          {isBack ? <Delete size={14} /> : isEnter ? 'GO' : key}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Bottom Utility Bar */}
              <div className="mt-3 grid grid-cols-2 gap-2">
                {mode === 'solo' ? (
                  <button
                    type="button"
                    onClick={handleSoloHint}
                    className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 ring-1 ring-amber-200/80 transition hover:bg-amber-100"
                  >
                    <Lightbulb size={13} />
                    <span>Hint</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => startDuelSetup(setterPlayer, false)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-200"
                  >
                    <Lock size={13} />
                    <span>Pick another word</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (mode === 'solo') startSoloRound();
                    else startDuelSetup(guesserPlayer, false);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200/80 transition hover:bg-indigo-100"
                >
                  <RefreshCw size={13} />
                  <span>{mode === 'solo' ? 'New word' : 'Swap roles'}</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
