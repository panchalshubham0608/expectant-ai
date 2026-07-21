import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';

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
  {
    id: 'profile-1',
    name: 'Arianna Smith',
    avatar: 'AS',
    week: '8',
    dueDate: 'Mar 28, 2027',
    location: 'San Francisco, CA',
    pregnancyStage: 'First trimester',
  },
  {
    id: 'profile-2',
    name: 'Maya Patel',
    avatar: 'MP',
    week: '22',
    dueDate: 'Jan 12, 2027',
    location: 'Austin, TX',
    pregnancyStage: 'Second trimester',
  },
  {
    id: 'profile-3',
    name: 'Nina Lopez',
    avatar: 'NL',
    week: '34',
    dueDate: 'Nov 08, 2026',
    location: 'Denver, CO',
    pregnancyStage: 'Third trimester',
  },
];

function ProfileDetail() {
  const { id } = useParams<{ id: string }>();
  const profile = useMemo(() => profiles.find((profile) => profile.id === id) ?? profiles[0], [id]);

  if (!id) {
    return (
      <div className="min-h-screen bg-[#faf9f6] text-gray-900">
        <main className="mx-auto max-w-md px-4 py-10">
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-lg font-semibold text-gray-900">Profile not found</p>
            <p className="mt-2 text-sm text-gray-500">
              Please go back to the dashboard and select a profile.
            </p>
            <Link
              to="/dashboard"
              className="mt-6 inline-flex rounded-full bg-green-700 px-4 py-2 text-sm font-semibold text-white"
            >
              Back to dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf9f6] text-gray-900 pb-24">
      <main className="mx-auto max-w-md px-4 py-10">
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-3xl bg-white p-4 shadow-sm">
            <div>
              <p className="text-sm text-gray-500">Active profile</p>
              <h1 className="text-2xl font-semibold">{profile.name}</h1>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-100 text-lg font-semibold text-green-700">
              {profile.avatar}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl bg-[#effaf3] p-4">
                <p className="text-sm text-gray-500">Pregnancy stage</p>
                <p className="mt-2 text-lg font-semibold text-gray-900">{profile.pregnancyStage}</p>
              </div>
              <div className="rounded-3xl bg-[#fff7ed] p-4">
                <p className="text-sm text-gray-500">Due date</p>
                <p className="mt-2 text-lg font-semibold text-gray-900">{profile.dueDate}</p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-3xl bg-white p-4 shadow-sm">
                <p className="text-sm text-gray-500">Week</p>
                <p className="mt-2 text-lg font-semibold text-gray-900">{profile.week}</p>
              </div>
              <div className="rounded-3xl bg-white p-4 shadow-sm">
                <p className="text-sm text-gray-500">Location</p>
                <p className="mt-2 text-lg font-semibold text-gray-900">{profile.location}</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Quick actions</h2>
            <div className="mt-4 space-y-3">
              <button className="w-full rounded-3xl bg-green-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-green-800">
                Open daily journal
              </button>
              <button className="w-full rounded-3xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50">
                Review pregnancy notes
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default ProfileDetail;
