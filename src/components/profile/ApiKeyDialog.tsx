import { useState, useEffect } from 'react';
import { getGeminiApiKey, saveGeminiApiKey } from '../../features/profiles/profileService';

interface ApiKeyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  profileId: string;
}

export default function ApiKeyDialog({ isOpen, onClose, userId, profileId }: ApiKeyDialogProps) {
  const [apiKey, setApiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && userId) {
      const fetchApiKey = async () => {
        try {
          const key = await getGeminiApiKey(userId, profileId);
          if (key) {
            setApiKey(key);
          }
        } catch (err) {
          console.error('Failed to fetch API key:', err);
        }
      };
      fetchApiKey();
    }
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');

    try {
      await saveGeminiApiKey(userId, profileId, apiKey);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save API key.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-bold text-gray-900">Gemini API Key</h2>
        <p className="mt-2 text-sm text-gray-500">
          Enter your Gemini API key to enable AI features. This will be stored securely in Firestore.
        </p>

        <form onSubmit={handleSave} className="mt-6 space-y-4">
          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700">
              API Key
            </label>
            <input
              type="password"
              id="apiKey"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-2 text-sm shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              placeholder="AIzaSy..."
              required
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-full bg-green-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}