import { useState, useEffect } from 'react';
import { Baby, Sparkles, X } from 'lucide-react';
import { getGeminiApiKey, saveBabyNamePreferences } from '../../services/profiles/profileService';
import { generateAndSaveDailyDigestForToday } from '../../services/dailyDigests/dailyDigestsGeneratorService';

interface BabyNameSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  profileId: string;
  initialContext?: string;
  initialCount?: number;
}

const MAX_CONTEXT_LENGTH = 500;
const MIN_COUNT = 1;
const MAX_COUNT = 10;
const PRESET_COUNTS = [3, 5, 7];

export default function BabyNameSettingsDialog({
  isOpen,
  onClose,
  userId,
  profileId,
  initialContext = '',
  initialCount,
}: BabyNameSettingsDialogProps) {
  const [context, setContext] = useState(initialContext);
  const [count, setCount] = useState<number>(initialCount && initialCount > 0 ? initialCount : 3);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setContext(initialContext || '');
      setCount(initialCount && initialCount > 0 ? initialCount : 3);
      setError('');
    }
  }, [isOpen, initialContext, initialCount]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedContext = context.trim();

    if (!trimmedContext) {
      setError('Please describe the kind of baby names you would like to generate.');
      return;
    }

    if (trimmedContext.length > MAX_CONTEXT_LENGTH) {
      setError(`Context must be ${MAX_CONTEXT_LENGTH} characters or fewer.`);
      return;
    }

    const normalizedCount = Math.min(MAX_COUNT, Math.max(MIN_COUNT, Math.floor(Number(count) || 3)));

    setIsSaving(true);
    setError('');

    try {
      await saveBabyNamePreferences(userId, profileId, {
        babyNameContext: trimmedContext,
        babyNameCount: normalizedCount,
      });

      const contextChanged = trimmedContext !== (initialContext || '').trim();
      const countChanged = normalizedCount !== initialCount;

      if (contextChanged || countChanged) {
        const apiKey = await getGeminiApiKey(userId, profileId).catch(() => undefined);
        // Trigger regeneration in the background so today's names reflect the updated settings
        generateAndSaveDailyDigestForToday(userId, profileId, apiKey || undefined, false).catch(
          () => undefined
        );
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save baby name preferences.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisable = async () => {
    setIsSaving(true);
    setError('');
    try {
      await saveBabyNamePreferences(userId, profileId, {
        babyNameContext: '',
        babyNameCount: 0,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable baby name generation.');
    } finally {
      setIsSaving(false);
    }
  };

  const isCurrentlyEnabled = Boolean(initialContext?.trim() && initialCount && initialCount > 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="baby-name-settings-title"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
              <Baby size={20} />
            </div>
            <div>
              <h2 id="baby-name-settings-title" className="text-xl font-bold text-gray-900">
                Daily Baby Names
              </h2>
              <p className="text-xs text-gray-500">
                Personalize your daily AI baby name suggestions
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="mt-5 space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="babyNameContext" className="block text-sm font-medium text-gray-700">
                Name style &amp; context
              </label>
              <span className="text-xs text-gray-400">
                {context.length}/{MAX_CONTEXT_LENGTH}
              </span>
            </div>
            <textarea
              id="babyNameContext"
              rows={4}
              maxLength={MAX_CONTEXT_LENGTH}
              value={context}
              onChange={(e) => setContext(e.target.value)}
              className="mt-1.5 block w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              placeholder="E.g., Modern North Indian Sanskrit names inspired by the Bhagavad Gita or deities, short and easy to pronounce, both boy and girl names..."
              required
            />
            <p className="mt-1.5 text-xs text-gray-500">
              Share themes, starting letters, gender preference, or spiritual inspirations.
            </p>
          </div>

          <div>
            <label htmlFor="babyNameCount" className="block text-sm font-medium text-gray-700">
              Names per day (N)
            </label>
            <div className="mt-2 flex items-center gap-2">
              {PRESET_COUNTS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setCount(preset)}
                  className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                    count === preset
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {preset} / day
                </button>
              ))}
              <input
                id="babyNameCount"
                type="number"
                min={MIN_COUNT}
                max={MAX_COUNT}
                value={count}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!Number.isNaN(val)) {
                    setCount(Math.min(MAX_COUNT, Math.max(MIN_COUNT, val)));
                  }
                }}
                className="w-20 rounded-xl border border-gray-200 px-3 py-1.5 text-center text-sm font-medium text-gray-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                aria-label="Custom number of names per day"
              />
            </div>
            <p className="mt-1 text-xs text-gray-400">Choose between {MIN_COUNT} and {MAX_COUNT} names daily.</p>
          </div>

          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

          <div className="flex items-center justify-between gap-3 pt-3">
            {isCurrentlyEnabled ? (
              <button
                type="button"
                onClick={handleDisable}
                disabled={isSaving}
                className="rounded-full px-4 py-2 text-xs font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 disabled:opacity-50"
              >
                Turn off
              </button>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 rounded-full bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-50"
              >
                <Sparkles size={15} />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
