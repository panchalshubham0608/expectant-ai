import { useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import ProfileFormDialog from '../components/profile/ProfileFormDialog';
import { createProfile, subscribeToProfiles } from '../features/profiles/profileService';
import type { Profile, ProfileInput } from '../features/profiles/types';

const formatDate = (date: string) =>
  new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).format(
    new Date(`${date}T00:00:00`),
  );

const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

const getPregnancyDetails = (lastMenstrualPeriod: string) => {
  const pregnancyWeek = Math.max(
    1,
    Math.min(
      42,
      Math.floor((Date.now() - new Date(`${lastMenstrualPeriod}T00:00:00`).getTime()) / 604800000),
    ),
  );
  return {
    week: pregnancyWeek,
    stage:
      pregnancyWeek < 14
        ? 'First trimester'
        : pregnancyWeek < 28
          ? 'Second trimester'
          : 'Third trimester',
  };
};

function Dashboard() {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(Boolean(user));
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      return;
    }
    return subscribeToProfiles(
      user.uid,
      (nextProfiles) => {
        setProfiles(nextProfiles);
        setIsLoading(false);
      },
      (nextError) => {
        setError(nextError.message);
        setIsLoading(false);
      },
    );
  }, [user]);

  const handleCreate = async (form: ProfileInput) => {
    if (!user) return;
    setError('');
    try {
      await createProfile(user.uid, form);
      setIsCreateDialogOpen(false);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : 'Unable to create the profile. Please try again.',
      );
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#eefbf2] via-[#faf9f6] to-[#ffffff] text-gray-900">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top_left,_rgba(72,187,120,0.18),_transparent_40%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.14),_transparent_32%)]" />
      <main className="relative mx-auto max-w-md px-4 py-10">
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-2xl font-medium uppercase tracking-[0.2em] text-green-700">
              Expectant profiles
            </p>
            <p className="text-sm text-gray-500">
              Select a profile to continue tracking the pregnancy, or create a new one to get
              started.
            </p>
          </div>

          {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          {isLoading ? (
            <div className="rounded-3xl bg-white p-6 text-sm text-gray-500 shadow-sm">
              Loading profiles…
            </div>
          ) : profiles.length > 0 ? (
            <>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="inline-flex items-center justify-center rounded-full bg-green-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-800"
                >
                  + Create profile
                </button>
              </div>
              <div className="space-y-4">
                {profiles.map((profile) => {
                  const pregnancy = getPregnancyDetails(profile.lastMenstrualPeriod);
                  return (
                    <Link
                      key={profile.id}
                      to={`/profile/${profile.id}`}
                      className="block rounded-3xl border border-transparent bg-white p-5 text-left shadow-sm transition hover:border-gray-200 hover:shadow-md"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-100 text-lg font-semibold text-green-700">
                          {getInitials(profile.fullName)}
                        </div>
                        <div>
                          <h2 className="text-lg font-semibold">{profile.fullName}</h2>
                          <p className="text-sm text-gray-500">{pregnancy.stage}</p>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2 text-sm text-gray-600">
                        <span className="rounded-full bg-gray-100 px-3 py-1">
                          Week {pregnancy.week}
                        </span>
                        <span className="rounded-full bg-gray-100 px-3 py-1">
                          Due {formatDate(profile.expectedDueDate)}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="rounded-3xl border border-dashed border-gray-300 bg-white/80 px-6 py-10 text-center shadow-sm">
              <p className="text-lg font-semibold text-gray-900">No pregnancy profiles yet</p>
              <p className="mt-2 text-sm text-gray-500">
                Create your first profile to start tracking health, nutrition, milestones, and daily
                updates.
              </p>
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  disabled={!user}
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="inline-flex items-center justify-center rounded-full bg-green-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  + Create profile
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
      {isCreateDialogOpen && (
        <ProfileFormDialog
          mode="create"
          onClose={() => setIsCreateDialogOpen(false)}
          onSubmit={handleCreate}
        />
      )}
      <button
        type="button"
        onClick={handleLogout}
        className="fixed bottom-6 right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-white text-gray-600 shadow-lg transition hover:text-gray-900"
        aria-label="Log out"
      >
        <LogOut size={20} />
      </button>
    </div>
  );
}

export default Dashboard;
