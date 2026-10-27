import { useState } from 'react';
import { Heart, Send, X } from 'lucide-react';
import { isCustomMessageWithin24Hours, saveCustomMessage } from '../../services/profiles/profileService';

interface CustomMessageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  profileId: string;
  initialMessage?: string;
  initialUpdatedAt?: string;
  initialDismissed?: boolean;
}

const MAX_MESSAGE_LENGTH = 1000;

function CustomMessageModalContent({
  onClose,
  userId,
  profileId,
  initialMessage = '',
  initialUpdatedAt,
  initialDismissed = false,
}: Omit<CustomMessageDialogProps, 'isOpen'>) {
  const [isActiveMessage] = useState(
    () => isCustomMessageWithin24Hours(initialUpdatedAt) && Boolean(initialMessage.trim()),
  );
  const [initialDismissedState] = useState(() => Boolean(initialDismissed));
  const [message, setMessage] = useState(() => (isActiveMessage ? initialMessage : ''));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      setError('Please write a message before sending.');
      return;
    }

    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      setError(`Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.`);
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      await saveCustomMessage(userId, profileId, trimmedMessage);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save custom message.');
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    setIsSaving(true);
    setError('');
    try {
      await saveCustomMessage(userId, profileId, '');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear custom message.');
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="custom-message-dialog-title"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-pink-50 text-pink-600">
              <Heart size={20} />
            </div>
            <div>
              <h2 id="custom-message-dialog-title" className="text-xl font-bold text-gray-900">
                Custom Message
              </h2>
              <p className="text-xs text-gray-500">
                Send a special note for the homepage
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
          {isActiveMessage && (
            <div className="rounded-2xl bg-pink-50/70 px-3.5 py-2.5 text-xs text-pink-800 ring-1 ring-pink-100">
              {initialDismissedState
                ? 'Your recent message was dismissed. Saving a new or updated note will display it on the homepage again.'
                : 'A message is currently active on the homepage. You can update or clear it below.'}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="customMessageInput" className="block text-sm font-medium text-gray-700">
                Your message
              </label>
              <span className="text-xs text-gray-400">
                {message.length}/{MAX_MESSAGE_LENGTH}
              </span>
            </div>
            <textarea
              id="customMessageInput"
              rows={4}
              maxLength={MAX_MESSAGE_LENGTH}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-1.5 block w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-pink-600 focus:ring-2 focus:ring-pink-100"
              placeholder="Write something sweet, encouraging, or thoughtful to brighten her day..."
              required
            />
            <p className="mt-1.5 text-xs text-gray-500">
              This note appears on the homepage for 24 hours and can be dismissed once read.
            </p>
          </div>

          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

          <div className="flex items-center justify-between gap-3 pt-3">
            {isActiveMessage ? (
              <button
                type="button"
                onClick={handleClear}
                disabled={isSaving}
                className="rounded-full px-4 py-2 text-xs font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 disabled:opacity-50"
              >
                Clear message
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
                className="inline-flex items-center gap-1.5 rounded-full bg-pink-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-pink-700 disabled:opacity-50"
              >
                <Send size={14} />
                {isSaving ? 'Sending...' : 'Send note'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CustomMessageDialog(props: CustomMessageDialogProps) {
  if (!props.isOpen) return null;
  return (
    <CustomMessageModalContent
      onClose={props.onClose}
      userId={props.userId}
      profileId={props.profileId}
      initialMessage={props.initialMessage}
      initialUpdatedAt={props.initialUpdatedAt}
      initialDismissed={props.initialDismissed}
    />
  );
}
