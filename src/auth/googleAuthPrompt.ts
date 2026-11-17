export type GoogleAuthService = 'drive' | 'calendar';

export type GoogleAuthPromptStatus = 'confirm' | 'connecting';

export interface ActiveGoogleAuthPrompt {
  service: GoogleAuthService;
  status: GoogleAuthPromptStatus;
  onContinue: () => void;
  onCancel: () => void;
}

interface QueuedAuthEntry {
  service: GoogleAuthService;
  status: GoogleAuthPromptStatus;
  onContinue: () => void;
  onCancel: () => void;
  cancelSilently: () => void;
}

const requestQueue: QueuedAuthEntry[] = [];
const promptListeners = new Set<() => void>();

const notifyPromptListeners = (): void => {
  promptListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Ignore listener errors
    }
  });
};

const removeEntry = (entry: QueuedAuthEntry): void => {
  const index = requestQueue.indexOf(entry);
  if (index !== -1) {
    requestQueue.splice(index, 1);
    notifyPromptListeners();
  }
};

export const getActiveGoogleAuthPrompt = (): ActiveGoogleAuthPrompt | null => {
  const current = requestQueue[0];
  if (!current) return null;
  return {
    service: current.service,
    status: current.status,
    onContinue: current.onContinue,
    onCancel: current.onCancel,
  };
};

export const subscribeToGoogleAuthPrompt = (
  listener: () => void,
): (() => void) => {
  promptListeners.add(listener);
  return () => {
    promptListeners.delete(listener);
  };
};

export const cancelAllGoogleAuthPrompts = (): void => {
  const pending = requestQueue.splice(0, requestQueue.length);
  if (pending.length === 0) return;
  for (const entry of pending) {
    entry.cancelSilently();
  }
  notifyPromptListeners();
};

const getCancelledMessage = (service: GoogleAuthService): string =>
  service === 'calendar'
    ? 'Google Calendar connection was cancelled.'
    : 'Google Drive connection was cancelled.';

/**
 * Displays a confirmation modal explaining what is about to happen before
 * invoking a Google OAuth popup. `executePopup` is called synchronously inside
 * the Continue button's click handler so browser popup blockers allow it.
 */
export const requestGooglePopupAuth = <T,>(
  service: GoogleAuthService,
  executePopup: () => Promise<T>,
): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    let settled = false;

    const settleResolve = (value: T): void => {
      if (settled) return;
      settled = true;
      removeEntry(entry);
      resolve(value);
    };

    const settleReject = (error: unknown): void => {
      if (settled) return;
      settled = true;
      removeEntry(entry);
      reject(error);
    };

    const entry: QueuedAuthEntry = {
      service,
      status: 'confirm',
      onContinue: () => {
        if (settled || entry.status !== 'confirm') return;

        // Update modal state to connecting before launching the popup
        entry.status = 'connecting';
        notifyPromptListeners();

        // Invoke executePopup synchronously inside the user's click gesture
        let popupPromise: Promise<T>;
        try {
          popupPromise = executePopup();
        } catch (syncError) {
          settleReject(syncError);
          return;
        }

        popupPromise.then(settleResolve, settleReject);
      },
      onCancel: () => {
        settleReject(new Error(getCancelledMessage(service)));
      },
      cancelSilently: () => {
        if (settled) return;
        settled = true;
        reject(new Error(getCancelledMessage(service)));
      },
    };

    requestQueue.push(entry);
    notifyPromptListeners();
  });
