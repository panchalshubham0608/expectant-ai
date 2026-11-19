import { useEffect, useState } from 'react';
import { Pause, Play, RotateCcw, Wind } from 'lucide-react';

type RhythmKey = 'gentle' | 'deep';

interface BreathingPhase {
  label: string;
  cue: string;
  seconds: number;
  scaleClass: string;
}

const RHYTHMS: Record<RhythmKey, { name: string; subtitle: string; phases: BreathingPhase[] }> = {
  gentle: {
    name: 'Gentle Wave (4–2–4)',
    subtitle: 'Easy, comfortable rhythm for any trimester',
    phases: [
      {
        label: 'Breathe In',
        cue: 'Draw a soft, slow breath in through your nose',
        seconds: 4,
        scaleClass: 'scale-110',
      },
      {
        label: 'Soft Pause',
        cue: 'Let your shoulders drop and soften',
        seconds: 2,
        scaleClass: 'scale-110',
      },
      {
        label: 'Breathe Out',
        cue: 'Exhale gently and rest a warm hand on your belly',
        seconds: 4,
        scaleClass: 'scale-75',
      },
    ],
  },
  deep: {
    name: 'Deep Calm (4–4–6)',
    subtitle: 'Longer exhale to help settle mind and body',
    phases: [
      {
        label: 'Breathe In',
        cue: 'Inhale steadily and comfortably through your nose',
        seconds: 4,
        scaleClass: 'scale-115',
      },
      {
        label: 'Gentle Hold',
        cue: 'Feel a quiet moment of stillness',
        seconds: 4,
        scaleClass: 'scale-115',
      },
      {
        label: 'Slow Exhale',
        cue: 'Release the breath slowly and peacefully',
        seconds: 6,
        scaleClass: 'scale-75',
      },
    ],
  },
};

export default function CalmBreathingActivity() {
  const [rhythmKey, setRhythmKey] = useState<RhythmKey>('gentle');
  const [isRunning, setIsRunning] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(RHYTHMS.gentle.phases[0].seconds);
  const [completedCycles, setCompletedCycles] = useState(0);

  const rhythm = RHYTHMS[rhythmKey];
  const currentPhase = rhythm.phases[phaseIndex];

  useEffect(() => {
    if (!isRunning) return;

    const interval = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev > 1) return prev - 1;

        const nextPhaseIdx = (phaseIndex + 1) % rhythm.phases.length;
        setPhaseIndex(nextPhaseIdx);
        if (nextPhaseIdx === 0) {
          setCompletedCycles((c) => c + 1);
        }
        return rhythm.phases[nextPhaseIdx].seconds;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isRunning, phaseIndex, rhythm]);

  const handleChangeRhythm = (nextKey: RhythmKey) => {
    setIsRunning(false);
    setRhythmKey(nextKey);
    setPhaseIndex(0);
    setSecondsLeft(RHYTHMS[nextKey].phases[0].seconds);
    setCompletedCycles(0);
  };

  const handleReset = () => {
    setIsRunning(false);
    setPhaseIndex(0);
    setSecondsLeft(rhythm.phases[0].seconds);
    setCompletedCycles(0);
  };

  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Guided Calm Breathing</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            A quiet 2-minute pause to relax your shoulders and breathe peacefully.
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700">
          <Wind size={12} />
          {completedCycles} {completedCycles === 1 ? 'cycle' : 'cycles'}
        </span>
      </div>

      {/* Rhythm selector */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        {(['gentle', 'deep'] as const).map((key) => {
          const item = RHYTHMS[key];
          const isSelected = rhythmKey === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => handleChangeRhythm(key)}
              className={`rounded-2xl p-3 text-left transition ${
                isSelected
                  ? 'bg-sky-50 text-sky-950 ring-2 ring-sky-300'
                  : 'bg-gray-50 text-gray-700 ring-1 ring-gray-200/70 hover:bg-gray-100'
              }`}
            >
              <p className="text-xs font-bold">{item.name}</p>
              <p className="mt-0.5 text-[11px] text-gray-500">{item.subtitle}</p>
            </button>
          );
        })}
      </div>

      {/* Breathing Orb */}
      <div className="my-6 flex flex-col items-center justify-center">
        <div className="relative flex h-44 w-44 items-center justify-center">
          <div
            className={`absolute inset-4 rounded-full bg-gradient-to-br from-sky-200/70 via-teal-200/60 to-indigo-200/70 blur-md transition-transform duration-1000 ease-in-out ${
              isRunning ? currentPhase.scaleClass : 'scale-90'
            }`}
          />
          <div
            className={`relative flex h-32 w-32 flex-col items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-teal-600 text-white shadow-md transition-transform duration-1000 ease-in-out ${
              isRunning ? currentPhase.scaleClass : 'scale-95'
            }`}
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-sky-100">
              {isRunning ? currentPhase.label : 'Ready'}
            </span>
            <span className="mt-0.5 text-3xl font-bold tabular-nums">
              {isRunning ? secondsLeft : rhythm.phases[0].seconds}
            </span>
          </div>
        </div>

        <p className="mt-3 max-w-xs text-center text-xs font-medium leading-relaxed text-gray-600">
          {isRunning
            ? currentPhase.cue
            : 'Sit comfortably, soften your jaw, and tap Start whenever you are ready.'}
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-2.5">
        <button
          type="button"
          onClick={() => setIsRunning((r) => !r)}
          className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-700"
        >
          {isRunning ? <Pause size={14} /> : <Play size={14} />}
          <span>{isRunning ? 'Pause' : 'Start breathing'}</span>
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-4 py-2.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-200"
        >
          <RotateCcw size={13} />
          <span>Reset</span>
        </button>
      </div>

      <p className="mt-4 text-center text-[11px] text-gray-400">
        Breathe naturally and never strain—pause anytime if you feel lightheaded.
      </p>
    </div>
  );
}
