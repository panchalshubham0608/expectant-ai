import { useState } from 'react';
import { HeartHandshake, Sparkles, X } from 'lucide-react';
import { getGeminiApiKey, saveBabyTalkPreferences } from '../../services/profiles/profileService';
import { generateAndSaveDailyDigestForToday } from '../../services/dailyDigests/dailyDigestsGeneratorService';

interface BabyTalkSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  profileId: string;
  initialEnabled?: boolean;
  initialContext?: string;
}

const MAX_CONTEXT_LENGTH = 1000;

function BabyTalkSettingsModalContent({
  onClose,
  userId,
  profileId,
  initialEnabled = false,
  initialContext = '',
}: Omit<BabyTalkSettingsDialogProps, 'isOpen'>) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [context, setContext] = useState(initialContext);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedContext = context.trim();

    if (trimmedContext.length > MAX_CONTEXT_LENGTH) {
      setError(`Notes must be ${MAX_CONTEXT_LENGTH} characters or fewer.`);
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      await saveBabyTalkPreferences(userId, profileId, {
        babyTalkEnabled: enabled,
        babyTalkContext: trimmedContext,
      });

      const enabledChanged = enabled !== Boolean(initialEnabled);
      const contextChanged = trimmedContext !== (initialContext || '').trim();

      if (enabled && (enabledChanged || contextChanged)) {
        const apiKey = await getGeminiApiKey(userId, profileId).catch(() => undefined);
        generateAndSaveDailyDigestForToday(
          userId,
          profileId,
          apiKey || undefined,
          false,
          ['babyTalk']
        ).catch(() => undefined);
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save preferences.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="baby-talk-settings-title"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <HeartHandshake size={20} />
            </div>
            <div>
              <h2 id="baby-talk-settings-title" className="text-xl font-bold text-gray-900">
                Talking to the Womb
              </h2>
              <p className="text-xs text-gray-500">
                Daily bonding prompts &amp; soothing read-aloud messages
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
          <div className="flex items-center justify-between rounded-2xl bg-rose-50/60 px-4 py-3.5 ring-1 ring-rose-100">
            <div>
              <p className="text-sm font-semibold text-gray-900">Enable daily womb talk ideas</p>
              <p className="text-xs text-gray-500">
                Include a daily conversation prompt &amp; script in your digest
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              onClick={() => setEnabled((prev) => !prev)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                enabled ? 'bg-rose-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="babyTalkContext" className="block text-sm font-medium text-gray-700">
                Personalization notes <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <span className="text-xs text-gray-400">
                {context.length}/{MAX_CONTEXT_LENGTH}
              </span>
            </div>
            <textarea
              id="babyTalkContext"
              rows={3}
              maxLength={MAX_CONTEXT_LENGTH}
              value={context}
              onChange={(e) => setContext(e.target.value)}
              className="mt-1.5 block w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-rose-600 focus:ring-2 focus:ring-rose-100"
              placeholder="E.g., Include both mom and dad moments, bedtime stories, family values, or gentle gratitude reflections..."
            />
            <p className="mt-1.5 text-xs text-gray-500">
              Leave blank for general stage-appropriate womb bonding prompts, or add your own vibe.
            </p>
          </div>

          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-3">
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
              className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-50"
            >
              <Sparkles size={15} />
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function BabyTalkSettingsDialog(props: BabyTalkSettingsDialogProps) {
  if (!props.isOpen) return null;
  return (
    <BabyTalkSettingsModalContent
      key={`${String(props.initialEnabled)}:${props.initialContext || ''}`}
      onClose={props.onClose}
      userId={props.userId}
      profileId={props.profileId}
      initialEnabled={props.initialEnabled}
      initialContext={props.initialContext}
    />
  );
}
