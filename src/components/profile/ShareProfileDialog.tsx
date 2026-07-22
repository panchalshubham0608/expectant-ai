import React, { useState } from 'react';
import { X } from 'lucide-react';
import { shareProfile, unshareProfile } from '../../features/profiles/profileService';
import type { Profile } from '../../features/profiles/types';

type ShareProfileDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  profileId: string;
  profile?: Profile | null;
};

export default function ShareProfileDialog({ isOpen, onClose, profileId, profile }: ShareProfileDialogProps) {
  const [shareEmail, setShareEmail] = useState('');
  const [shareSuccess, setShareSuccess] = useState('');
  const [shareError, setShareError] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [isUnsharing, setIsUnsharing] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileId || !shareEmail) return;
    setIsSharing(true);
    setShareSuccess('');
    setShareError('');
    try {
      await shareProfile(profileId, shareEmail.trim());
      setShareSuccess(`Profile shared successfully with ${shareEmail.trim()}!`);
      setShareEmail('');
    } catch (err) {
      setShareError(err instanceof Error ? err.message : 'Failed to share profile.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleUnshare = async (email: string) => {
    setIsUnsharing(email);
    setShareSuccess('');
    setShareError('');
    try {
      await unshareProfile(profileId, email);
      setShareSuccess(`Access removed for ${email}.`);
    } catch (err) {
      setShareError(err instanceof Error ? err.message : 'Failed to unshare profile.');
    } finally {
      setIsUnsharing(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900">Share profile</h3>
        <p className="mt-1 text-sm text-gray-500">
          Enter the email address to share this profile with.
        </p>
        {shareSuccess && <p className="mt-4 text-sm text-green-700">{shareSuccess}</p>}
        {shareError && <p className="mt-4 text-sm text-red-700">{shareError}</p>}
        <form onSubmit={handleShare} className="mt-4">
          <input
            type="email"
            required
            placeholder="Email address"
            value={shareEmail}
            onChange={(e) => setShareEmail(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100"
          />
          {profile?.sharedWith && profile.sharedWith.length > 0 && (
            <div className="mt-4 max-h-28 overflow-y-auto pr-2">
              <p className="text-xs font-medium text-gray-500">Already shared with:</p>
              <ul className="mt-2 space-y-1.5">
                {profile.sharedWith.map((email) => (
                  <li key={email} className="flex items-center justify-between text-sm text-gray-700">
                    <span className="truncate">{email}</span>
                    <button
                      type="button"
                      onClick={() => handleUnshare(email)}
                      disabled={isUnsharing === email}
                      className="ml-2 p-1 text-gray-400 hover:text-red-600 disabled:opacity-50"
                      aria-label={`Remove access for ${email}`}
                    >
                      <X size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={() => {
                onClose();
                setShareEmail('');
                setShareSuccess('');
                setShareError('');
              }}
              className="flex-1 rounded-full px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={isSharing}
              className="flex-1 rounded-full bg-green-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-800 disabled:opacity-70"
            >
              {isSharing ? 'Sharing...' : 'Share'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}