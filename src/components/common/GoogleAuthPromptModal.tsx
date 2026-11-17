import { useEffect, useState } from 'react';
import { Calendar, HardDrive, Info, Loader2 } from 'lucide-react';
import {
  getActiveGoogleAuthPrompt,
  subscribeToGoogleAuthPrompt,
  type ActiveGoogleAuthPrompt,
} from '../../auth/googleAuthPrompt';

const SLOW_CONNECT_CANCEL_MS = 5000;

export default function GoogleAuthPromptModal() {
  const [prompt, setPrompt] = useState<ActiveGoogleAuthPrompt | null>(() =>
    getActiveGoogleAuthPrompt(),
  );
  const [showSlowCancel, setShowSlowCancel] = useState(false);

  useEffect(() => {
    const syncPrompt = () => {
      setPrompt(getActiveGoogleAuthPrompt());
    };
    syncPrompt();
    return subscribeToGoogleAuthPrompt(syncPrompt);
  }, []);

  useEffect(() => {
    if (!prompt || prompt.status !== 'confirm') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        prompt.onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prompt]);

  useEffect(() => {
    if (!prompt || prompt.status !== 'connecting') {
      setShowSlowCancel(false);
      return;
    }
    const timer = setTimeout(() => {
      setShowSlowCancel(true);
    }, SLOW_CONNECT_CANCEL_MS);
    return () => clearTimeout(timer);
  }, [prompt]);

  if (!prompt) return null;

  const isCalendar = prompt.service === 'calendar';
  const isConnecting = prompt.status === 'connecting';

  const serviceName = isCalendar ? 'Google Calendar' : 'Google Drive';
  const description = isCalendar
    ? 'Expectant AI needs to verify your Google account to sync your appointments and reminders with Google Calendar.'
    : 'Expectant AI needs to verify your Google account to securely save and view files in your private Google Drive.';

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px] transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="google-auth-prompt-title"
      onClick={() => {
        if (!isConnecting) {
          prompt.onCancel();
        }
      }}
    >
      <div
        className="w-full max-w-sm rounded-[2rem] bg-white p-6 shadow-2xl ring-1 ring-slate-100 sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        {isConnecting ? (
          <div className="flex flex-col items-center py-3 text-center">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-blue-50/80 text-blue-600 ring-1 ring-blue-100">
              <Loader2
                className="absolute inset-0 h-full w-full animate-spin p-1 text-blue-500/30"
                strokeWidth={2.5}
              />
              {isCalendar ? <Calendar size={24} /> : <HardDrive size={24} />}
            </div>
            <h3
              id="google-auth-prompt-title"
              className="mt-5 text-base font-bold text-slate-900"
            >
              Connecting to {serviceName}...
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              Completing verification with Google. You&apos;ll be right back here in a moment.
            </p>
            {showSlowCancel && (
              <button
                type="button"
                onClick={prompt.onCancel}
                className="mt-5 rounded-full px-4 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                Taking too long? Cancel
              </button>
            )}
          </div>
        ) : (
          <div>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
              {isCalendar ? <Calendar size={26} /> : <HardDrive size={26} />}
            </div>

            <h3
              id="google-auth-prompt-title"
              className="mt-4 text-center text-lg font-bold text-slate-900"
            >
              Connect to {serviceName}
            </h3>

            <p className="mt-2 text-center text-sm leading-relaxed text-slate-600">
              {description}
            </p>

            <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-blue-50/60 p-3.5 ring-1 ring-blue-100/80">
              <Info size={16} className="mt-0.5 shrink-0 text-blue-600" />
              <p className="text-xs leading-relaxed text-slate-600">
                <span className="font-semibold text-slate-800">What to expect:</span>{' '}
                A Google window will briefly pop up and usually closes automatically in a second or two—no action needed unless Google asks you to confirm.
              </p>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={prompt.onCancel}
                className="flex-1 rounded-full bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={prompt.onContinue}
                className="flex-1 rounded-full bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
              >
                Continue
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
