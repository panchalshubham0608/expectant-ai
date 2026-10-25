import { useState } from 'react';
import { BookOpen, Sparkles, X } from 'lucide-react';
import { getGeminiApiKey, saveSpiritualSlokaPreferences } from '../../services/profiles/profileService';
import { generateAndSaveDailyDigestForToday } from '../../services/dailyDigests/dailyDigestsGeneratorService';

interface SpiritualSlokaSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  profileId: string;
  initialContext?: string;
}

const MAX_CONTEXT_LENGTH = 500;

function SpiritualSlokaSettingsModalContent({
  onClose,
  userId,
  profileId,
  initialContext = '',
}: Omit<SpiritualSlokaSettingsDialogProps, 'isOpen'>) {
  const [context, setContext] = useState(initialContext);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedContext = context.trim();

    if (!trimmedContext) {
      setError('Please describe the spiritual theme or scripture preferences you would like.');
      return;
    }

    if (trimmedContext.length > MAX_CONTEXT_LENGTH) {
      setError(`Theme must be ${MAX_CONTEXT_LENGTH} characters or fewer.`);
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      await saveSpiritualSlokaPreferences(userId, profileId, {
        spiritualSlokaContext: trimmedContext,
      });

      const contextChanged = trimmedContext !== (initialContext || '').trim();

      if (contextChanged) {
        const apiKey = await getGeminiApiKey(userId, profileId).catch(() => undefined);
        // Trigger regeneration in the background so today's digest includes the updated sloka
        generateAndSaveDailyDigestForToday(
          userId,
          profileId,
          apiKey || undefined,
          false,
          ['spiritualSloka']
        ).catch(() => undefined);
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save spiritual sloka preferences.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisable = async () => {
    setIsSaving(true);
    setError('');
    try {
      await saveSpiritualSlokaPreferences(userId, profileId, {
        spiritualSlokaContext: '',
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable spiritual sloka generation.');
    } finally {
      setIsSaving(false);
    }
  };

  const isCurrentlyEnabled = Boolean(initialContext?.trim());

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="spiritual-sloka-settings-title"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <BookOpen size={20} />
            </div>
            <div>
              <h2 id="spiritual-sloka-settings-title" className="text-xl font-bold text-gray-900">
                Daily Spiritual Sloka
              </h2>
              <p className="text-xs text-gray-500">
                Personalize your daily spiritual verse &amp; reflection
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
              <label
                htmlFor="spiritualSlokaContext"
                className="block text-sm font-medium text-gray-700"
              >
                Spiritual theme &amp; context
              </label>
              <span className="text-xs text-gray-400">
                {context.length}/{MAX_CONTEXT_LENGTH}
              </span>
            </div>
            <textarea
              id="spiritualSlokaContext"
              rows={4}
              maxLength={MAX_CONTEXT_LENGTH}
              value={context}
              onChange={(e) => setContext(e.target.value)}
              className="mt-1.5 block w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
              placeholder="E.g., Uplifting verses focusing on inner peace, gratitude, equanimity, compassion, and positive bonding with the baby from my preferred spiritual texts..."
              required
            />
            <p className="mt-1.5 text-xs text-gray-500">
              Share your preferred spiritual texts, traditions, or themes like calm, courage,
              compassion, or mindfulness.
            </p>
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
                className="inline-flex items-center gap-1.5 rounded-full bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700 disabled:opacity-50"
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

export default function SpiritualSlokaSettingsDialog(props: SpiritualSlokaSettingsDialogProps) {
  if (!props.isOpen) return null;
  return (
    <SpiritualSlokaSettingsModalContent
      key={props.initialContext || ''}
      onClose={props.onClose}
      userId={props.userId}
      profileId={props.profileId}
      initialContext={props.initialContext}
    />
  );
}
