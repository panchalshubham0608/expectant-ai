import { useState } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router-dom';

import {
  Home,
  MessageCircle,
  BarChart3,
  ShoppingBasket,
  HeartPulse,
  LogOut,
  Menu,
  UsersRound,
  Share2,
} from 'lucide-react';
import { useAuth } from '../../auth/useAuth';
import { shareProfile } from '../../features/profiles/profileService';

function BottomNav() {
  const { id } = useParams();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const basePath = id ? `/profile/${id}` : '/dashboard';

  const items = [
    {
      name: 'Home',
      path: basePath,
      icon: Home,
    },
    {
      name: 'Journal',
      path: `${basePath}/journal`,
      icon: MessageCircle,
    },
    {
      name: 'Insights',
      path: `${basePath}/insights`,
      icon: BarChart3,
    },
    {
      name: 'Pantry',
      path: `${basePath}/pantry`,
      icon: ShoppingBasket,
    },
    {
      name: 'Health',
      path: `${basePath}/health`,
      icon: HeartPulse,
    },
  ];

  return (
    <nav
      className="
      fixed bottom-0 left-0 right-0
      border-t bg-white
      "
    >
      <div className="relative mx-auto flex max-w-md justify-around py-3">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `
                flex flex-col items-center gap-1 text-xs
                ${isActive ? 'text-green-700' : 'text-gray-400'}
                `
              }
            >
              <Icon size={22} />

              {item.name}
            </NavLink>
          );
        })}
        {id && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsMenuOpen((open) => !open)}
              className="flex flex-col items-center gap-1 text-xs text-gray-400 transition hover:text-green-700"
              aria-label="Open profile menu"
              aria-expanded={isMenuOpen}
            >
              <Menu size={22} />
              More
            </button>
            {isMenuOpen && (
              <div className="absolute bottom-full right-0 mb-4 w-48 overflow-hidden rounded-2xl border border-gray-100 bg-white p-1.5 shadow-xl">
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsShareDialogOpen(true);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  <Share2 size={17} />
                  Share profile
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  <UsersRound size={17} />
                  View profiles
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await signOut();
                    navigate('/');
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  <LogOut size={17} />
                  Log out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {isShareDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Share profile</h3>
            <p className="mt-1 text-sm text-gray-500">
              Enter the email address to share this profile with.
            </p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!id || !shareEmail) return;
                setIsSharing(true);
                try {
                  await shareProfile(id, shareEmail.trim());
                  setIsShareDialogOpen(false);
                  setShareEmail('');
                  alert('Profile shared successfully!');
                } catch (err) {
                  alert('Failed to share profile.');
                } finally {
                  setIsSharing(false);
                }
              }}
              className="mt-4"
            >
              <input
                type="email"
                required
                placeholder="Email address"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100"
              />
              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsShareDialogOpen(false)}
                  className="flex-1 rounded-full px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
                >
                  Cancel
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
      )}
    </nav>
  );
}

export default BottomNav;
