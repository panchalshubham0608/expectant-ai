import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation, useNavigate, useParams } from 'react-router-dom';

import {
  Home,
  MessageCircle,
  HeartPulse,
  LogOut,
  Menu,
  UsersRound,
  Share2,
  Astroid,
  User,
  Stethoscope,
  FileText,
  BellRing,
  Sparkles,
  Baby,
  BookOpen,
  HeartHandshake,
  Heart,
  Puzzle,
  X,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import ShareProfileDialog from '../profile/ShareProfileDialog';
import ApiKeyDialog from '../profile/ApiKeyDialog';
import BabyNameSettingsDialog from '../profile/BabyNameSettingsDialog';
import SpiritualSlokaSettingsDialog from '../profile/SpiritualSlokaSettingsDialog';
import BabyTalkSettingsDialog from '../profile/BabyTalkSettingsDialog';
import CustomMessageDialog from '../profile/CustomMessageDialog';
import MomentPreferenceCard from '../../features/health/components/MomentPreferenceCard';

function BottomNav() {
  const { id } = useParams();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useState(false);
  const [isDailyWondersDialogOpen, setIsDailyWondersDialogOpen] = useState(false);
  const [isBabyNamesDialogOpen, setIsBabyNamesDialogOpen] = useState(false);
  const [isSpiritualSlokaDialogOpen, setIsSpiritualSlokaDialogOpen] = useState(false);
  const [isBabyTalkDialogOpen, setIsBabyTalkDialogOpen] = useState(false);
  const [isCustomMessageDialogOpen, setIsCustomMessageDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { profile } = useProfile(user?.uid, id);
  const basePath = id ? `/profile/${id}` : '/dashboard';

  const primaryItems = [
    {
      name: 'Home',
      path: basePath,
      icon: Home,
      activeClass: 'bg-emerald-50 text-emerald-700 font-semibold',
    },
    {
      name: 'Daily',
      path: `${basePath}/daily`,
      icon: Sparkles,
      activeClass: 'bg-amber-50 text-amber-700 font-semibold',
    },
    {
      name: 'Play',
      path: `${basePath}/mind-play`,
      icon: Puzzle,
      activeClass: 'bg-indigo-50 text-indigo-700 font-semibold',
    },
    {
      name: 'Journal',
      path: `${basePath}/journal`,
      icon: MessageCircle,
      activeClass: 'bg-teal-50 text-teal-700 font-semibold',
    },
    {
      name: 'Health',
      path: `${basePath}/health`,
      icon: HeartPulse,
      activeClass: 'bg-purple-50 text-purple-700 font-semibold',
    },
  ];

  const morePages = [
    {
      name: 'Visits',
      subtitle: 'Appointments',
      path: `${basePath}/appointments`,
      icon: Stethoscope,
      iconBg: 'bg-sky-50 text-sky-600',
      navActiveClass: 'bg-sky-50 text-sky-700 font-semibold',
    },
    {
      name: 'Reports',
      subtitle: 'Scans & labs',
      path: `${basePath}/reports`,
      icon: FileText,
      iconBg: 'bg-indigo-50 text-indigo-600',
      navActiveClass: 'bg-indigo-50 text-indigo-700 font-semibold',
    },
    {
      name: 'Reminders',
      subtitle: 'Daily alerts',
      path: `${basePath}/reminders`,
      icon: BellRing,
      iconBg: 'bg-amber-50 text-amber-600',
      navActiveClass: 'bg-amber-50 text-amber-700 font-semibold',
    },
    {
      name: 'Profile',
      subtitle: 'Details & due date',
      path: `${basePath}/expectant`,
      icon: User,
      iconBg: 'bg-emerald-50 text-emerald-600',
      navActiveClass: 'bg-emerald-50 text-emerald-700 font-semibold',
    },
  ];

  const activeMorePage = morePages.find((page) => location.pathname === page.path);

  useEffect(() => {
    if (!isMenuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  return (
    <nav
      className="
      fixed bottom-0 left-0 right-0 z-50
      border-t border-gray-100 bg-white/95 backdrop-blur-md
      "
    >
      <div className="relative mx-auto flex max-w-md items-center justify-around px-1.5 py-2">
        {primaryItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === basePath}
              className={({ isActive }) =>
                `
                flex min-w-[54px] flex-col items-center gap-0.5 rounded-2xl px-2 py-1.5 text-[11px] transition
                ${isActive ? item.activeClass : 'font-medium text-gray-400 hover:text-gray-600'}
                `
              }
            >
              <Icon size={20} />
              <span>{item.name}</span>
            </NavLink>
          );
        })}

        {id && (
          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            className={`flex min-w-[54px] flex-col items-center gap-0.5 rounded-2xl px-2 py-1.5 text-[11px] transition ${
              activeMorePage
                ? activeMorePage.navActiveClass
                : isMenuOpen
                  ? 'bg-slate-100 font-semibold text-slate-800'
                  : 'font-medium text-gray-400 hover:text-gray-600'
            }`}
            aria-label="Open more pages and settings"
            aria-expanded={isMenuOpen}
          >
            <Menu size={20} />
            <span>More</span>
          </button>
        )}
      </div>

      {/* Organized More Bottom Sheet */}
      {id &&
        isMenuOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45 p-0 backdrop-blur-sm sm:items-center sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-label="More pages and settings"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setIsMenuOpen(false);
              }
            }}
          >
            <div className="flex max-h-[88dvh] w-full max-w-md flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-2xl sm:rounded-3xl">
              <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4">
                <div>
                  <h2 className="text-base font-bold text-gray-900">More</h2>
                  <p className="text-xs text-gray-500">Care pages, preferences &amp; account</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(false)}
                  className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-200"
                  aria-label="Close menu"
                >
                  <X size={14} />
                  <span>Close</span>
                </button>
              </div>

              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
                {/* Care & Profile Pages */}
                <div>
                  <p className="mb-2.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Pages
                  </p>
                  <div className="grid grid-cols-2 gap-2.5">
                    {morePages.map((page) => {
                      const Icon = page.icon;
                      return (
                        <NavLink
                          key={page.path}
                          to={page.path}
                          onClick={() => setIsMenuOpen(false)}
                          className={({ isActive }) =>
                            `flex items-center gap-3 rounded-2xl p-3 transition active:scale-[0.98] ${
                              isActive
                                ? 'bg-green-50 text-green-900 ring-2 ring-green-500/70'
                                : 'bg-gray-50/90 text-gray-800 ring-1 ring-gray-200/70 hover:bg-gray-100'
                            }`
                          }
                        >
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${page.iconBg}`}
                          >
                            <Icon size={18} />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold">{page.name}</p>
                            <p className="truncate text-[10px] text-gray-500">{page.subtitle}</p>
                          </div>
                        </NavLink>
                      );
                    })}
                  </div>
                </div>

                {/* Personalization & Preferences */}
                <div>
                  <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Preferences
                  </p>
                  <div className="overflow-hidden rounded-2xl bg-gray-50/80 ring-1 ring-gray-100">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsCustomMessageDialogOpen(true);
                      }}
                      className="flex w-full items-center gap-3 border-b border-gray-100 px-3.5 py-2.5 text-left text-sm font-medium text-gray-700 transition hover:bg-white"
                    >
                      <Heart size={17} className="text-rose-500" />
                      <span>Custom message</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsDailyWondersDialogOpen(true);
                      }}
                      className="flex w-full items-center gap-3 border-b border-gray-100 px-3.5 py-2.5 text-left text-sm font-medium text-gray-700 transition hover:bg-white"
                    >
                      <Sparkles size={17} className="text-amber-500" />
                      <span>Daily wonders</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsBabyNamesDialogOpen(true);
                      }}
                      className="flex w-full items-center gap-3 border-b border-gray-100 px-3.5 py-2.5 text-left text-sm font-medium text-gray-700 transition hover:bg-white"
                    >
                      <Baby size={17} className="text-sky-500" />
                      <span>Baby names</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsSpiritualSlokaDialogOpen(true);
                      }}
                      className="flex w-full items-center gap-3 border-b border-gray-100 px-3.5 py-2.5 text-left text-sm font-medium text-gray-700 transition hover:bg-white"
                    >
                      <BookOpen size={17} className="text-indigo-500" />
                      <span>Spiritual sloka</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsBabyTalkDialogOpen(true);
                      }}
                      className="flex w-full items-center gap-3 border-b border-gray-100 px-3.5 py-2.5 text-left text-sm font-medium text-gray-700 transition hover:bg-white"
                    >
                      <HeartHandshake size={17} className="text-emerald-600" />
                      <span>Talking to womb</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsApiKeyDialogOpen(true);
                      }}
                      className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm font-medium text-gray-700 transition hover:bg-white"
                    >
                      <Astroid size={17} className="text-violet-500" />
                      <span>Gemini Key</span>
                    </button>
                  </div>
                </div>

                {/* Sharing & Account */}
                <div>
                  <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Account
                  </p>
                  <div className="overflow-hidden rounded-2xl bg-gray-50/80 ring-1 ring-gray-100">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsShareDialogOpen(true);
                      }}
                      className="flex w-full items-center gap-3 border-b border-gray-100 px-3.5 py-2.5 text-left text-sm font-medium text-gray-700 transition hover:bg-white"
                    >
                      <Share2 size={17} className="text-gray-500" />
                      <span>Share profile</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        navigate('/dashboard');
                      }}
                      className="flex w-full items-center gap-3 border-b border-gray-100 px-3.5 py-2.5 text-left text-sm font-medium text-gray-700 transition hover:bg-white"
                    >
                      <UsersRound size={17} className="text-gray-500" />
                      <span>View profiles</span>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        setIsMenuOpen(false);
                        await signOut();
                        navigate('/');
                      }}
                      className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50/60"
                    >
                      <LogOut size={17} />
                      <span>Log out</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
      {id && (
        <ShareProfileDialog
          isOpen={isShareDialogOpen}
          onClose={() => setIsShareDialogOpen(false)}
          profileId={id}
          profile={profile}
        />
      )}
      {user && id && (
        <ApiKeyDialog
          isOpen={isApiKeyDialogOpen}
          onClose={() => setIsApiKeyDialogOpen(false)}
          userId={user.uid}
          profileId={id}
        />
      )}
      {user && id && (
        <MomentPreferenceCard
          isOpen={isDailyWondersDialogOpen}
          onClose={() => setIsDailyWondersDialogOpen(false)}
          userId={user.uid}
          profileId={id}
        />
      )}
      {user && id && (
        <BabyNameSettingsDialog
          isOpen={isBabyNamesDialogOpen}
          onClose={() => setIsBabyNamesDialogOpen(false)}
          userId={user.uid}
          profileId={id}
          initialContext={profile?.babyNameContext}
          initialCount={profile?.babyNameCount}
        />
      )}
      {user && id && (
        <SpiritualSlokaSettingsDialog
          isOpen={isSpiritualSlokaDialogOpen}
          onClose={() => setIsSpiritualSlokaDialogOpen(false)}
          userId={user.uid}
          profileId={id}
          initialContext={profile?.spiritualSlokaContext}
        />
      )}
      {user && id && (
        <BabyTalkSettingsDialog
          isOpen={isBabyTalkDialogOpen}
          onClose={() => setIsBabyTalkDialogOpen(false)}
          userId={user.uid}
          profileId={id}
          initialEnabled={profile?.babyTalkEnabled}
          initialContext={profile?.babyTalkContext}
        />
      )}
      {user && id && (
        <CustomMessageDialog
          isOpen={isCustomMessageDialogOpen}
          onClose={() => setIsCustomMessageDialogOpen(false)}
          userId={user.uid}
          profileId={id}
          initialMessage={profile?.customMessage}
          initialUpdatedAt={profile?.customMessageUpdatedAt}
          initialDismissed={profile?.customMessageDismissed}
        />
      )}
    </nav>
  );
}

export default BottomNav;
