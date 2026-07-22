import { Link, useParams } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { useProfile } from '../features/profiles/useProfile';

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

function ProfileDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { error, isLoading, profile } = useProfile(user?.uid, id);
  const [today] = useState(() => new Date());

  if (isLoading)
    return (
      <div className="rounded-3xl bg-white p-6 text-sm text-gray-500 shadow-sm">
        Loading profile…
      </div>
    );
  if (!profile)
    return (
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <p className="text-lg font-semibold text-gray-900">Profile not found</p>
        <p className="mt-2 text-sm text-gray-500">
          {error || 'This profile may have been removed or is unavailable.'}
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-flex rounded-full bg-green-700 px-4 py-2 text-sm font-semibold text-white"
        >
          Back to profiles
        </Link>
      </div>
    );

  const week = Math.max(
    1,
    Math.min(
      42,
      Math.floor(
        (today.getTime() - new Date(`${profile.lastMenstrualPeriod}T00:00:00`).getTime()) / 604800000,
      ),
    ),
  );
  const stage = week < 14 ? 'First trimester' : week < 28 ? 'Second trimester' : 'Third trimester';

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between rounded-3xl bg-white p-4 shadow-sm">
        <div>
          <p className="text-sm text-gray-500">Active profile</p>
          <h1 className="text-2xl font-semibold">{profile.fullName}</h1>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-100 text-lg font-semibold text-green-700">
          {getInitials(profile.fullName)}
        </div>
      </div>
      <div className="rounded-3xl bg-white p-5 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-3xl bg-[#effaf3] p-4">
            <p className="text-sm text-gray-500">Pregnancy stage</p>
            <p className="mt-2 text-lg font-semibold text-gray-900">{stage}</p>
          </div>
          <div className="rounded-3xl bg-[#fff7ed] p-4">
            <p className="text-sm text-gray-500">Due date</p>
            <p className="mt-2 text-lg font-semibold text-gray-900">
              {formatDate(profile.expectedDueDate)}
            </p>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          <div className="rounded-3xl bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Week</p>
            <p className="mt-2 text-lg font-semibold text-gray-900">{week}</p>
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
          <Link
            to={`/profile/${profile.id}/journal`}
            className="block w-full rounded-3xl bg-green-700 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-green-800"
          >
            Open daily journal
          </Link>
          <Link
            to={`/profile/${profile.id}/health`}
            className="block w-full rounded-3xl border border-gray-200 bg-white px-4 py-3 text-center text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Review pregnancy health
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ProfileDetail;
