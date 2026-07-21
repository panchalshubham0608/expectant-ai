import { Link } from 'react-router-dom';

type Profile = {
  id: string;
  name: string;
  avatar: string;
  week: string;
  dueDate: string;
  location: string;
  pregnancyStage: string;
};

const profiles: Profile[] = [
  //   {
  //     id: 'profile-1',
  //     name: 'Arianna Smith',
  //     avatar: 'AS',
  //     week: '8',
  //     dueDate: 'Mar 28, 2027',
  //     location: 'San Francisco, CA',
  //     pregnancyStage: 'First trimester',
  //   },
  //   {
  //     id: 'profile-2',
  //     name: 'Maya Patel',
  //     avatar: 'MP',
  //     week: '22',
  //     dueDate: 'Jan 12, 2027',
  //     location: 'Austin, TX',
  //     pregnancyStage: 'Second trimester',
  //   },
  //   {
  //     id: 'profile-3',
  //     name: 'Nina Lopez',
  //     avatar: 'NL',
  //     week: '34',
  //     dueDate: 'Nov 08, 2026',
  //     location: 'Denver, CO',
  //     pregnancyStage: 'Third trimester',
  //   },
];

function Dashboard() {
  const hasProfiles = profiles.length > 0;

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

          {hasProfiles && (
            <div className="flex justify-end">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-full bg-green-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-800"
              >
                + Create profile
              </button>
            </div>
          )}

          {hasProfiles ? (
            <div className="space-y-4">
              {profiles.map((profile) => (
                <Link
                  key={profile.id}
                  to={`/profile/${profile.id}`}
                  className="block rounded-3xl border border-transparent bg-white p-5 text-left shadow-sm transition hover:border-gray-200 hover:shadow-md"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-100 text-lg font-semibold text-green-700">
                      {profile.avatar}
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">{profile.name}</h2>
                      <p className="text-sm text-gray-500">{profile.pregnancyStage}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-sm text-gray-600">
                    <span className="rounded-full bg-gray-100 px-3 py-1">Week {profile.week}</span>
                    <span className="rounded-full bg-gray-100 px-3 py-1">
                      Due {profile.dueDate}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
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
                  className="inline-flex items-center justify-center rounded-full bg-green-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-800"
                >
                  + Create profile
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
