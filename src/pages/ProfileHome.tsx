import { Link, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import DailyMomentCard from '../components/home/DailyMomentCard';
import { Calendar, Baby, Clock, Sparkles } from 'lucide-react';
import { getPregnancyAge } from '../utils/pregnancyUtils';

const formatDate = (date: string) =>
  new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).format(
    new Date(`${date}T00:00:00`),
  );

const SUBTITLES = [
  "Another beautiful day in your journey. 💛",
  "One little day closer to meeting your little one. 👶",
  "Growing, glowing, and taking it one day at a time. ✨",
  "A little more love, a little more wonder, every day. 💕",
  "Your journey is unfolding one beautiful day at a time. 🌸",
  "Here's to another little chapter in your journey. 📖",
  "So much is happening, one day at a time. ✨",
  "Your little one is growing right alongside you. 💛",
  "A tiny journey inside a beautiful one. 👶",
  "Your little one has another day of growing ahead. 🌱",
  "Every day brings you a little closer to your hello. 💕",
  "Tiny beginnings, beautiful milestones. ✨",
  "One day, one moment, one little milestone at a time.",
  "Be kind to yourself today. You’re doing something amazing. 🌸",
  "Pause, breathe, and enjoy this little chapter. 🌿",
  "Today is another day worth remembering. ✨",
  "Make a little room for joy today. 💕",
  "You've got another beautiful day ahead. ☀️",
];

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const getDailySubtitle = () => {
  const today = new Date();
  // Get the number of days since the epoch in local time so it changes exactly at midnight
  const dayIndex = Math.floor((today.getTime() - today.getTimezoneOffset() * 60000) / 86400000);
  return SUBTITLES[dayIndex % SUBTITLES.length];
};

function ProfileDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { error, isLoading, profile } = useProfile(user?.uid, id);

  useEffect(() => {
    if (id) {
      localStorage.setItem('lastProfileId', id);
    }
  }, [id]);

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

  const age = getPregnancyAge(profile.lastMenstrualPeriod, profile.ultrasoundLastMenstrualPeriod);
  const week = age ? Math.max(1, Math.min(42, age.weeks + 1)) : 1;
  const stage = week < 14 ? 'First trimester' : week < 28 ? 'Second trimester' : 'Third trimester';

  let gestationalAgeText = 'Not available';
  if (age) {
    if (age.isFuture) {
      gestationalAgeText = 'LMP is in the future';
    } else {
      gestationalAgeText = `${age.weeks} wk, ${age.days} d`;
    }
  } else if (profile.lastMenstrualPeriod) {
    gestationalAgeText = 'Invalid date';
  }

  return (
    <div className="space-y-4 pb-4">
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-emerald-50/60 via-white to-amber-50/50 p-8 shadow-sm ring-1 ring-emerald-100/50">
        <div className="absolute -right-8 -top-8 h-48 w-48 rounded-full bg-amber-200/30 blur-3xl"></div>
        <div className="absolute -left-8 top-16 h-40 w-40 rounded-full bg-emerald-200/30 blur-3xl"></div>
        
        <div className="absolute -right-4 -top-4 rotate-12 text-emerald-900 opacity-5">
          <Sparkles size={140} />
        </div>

        <div className="relative z-10">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            {getGreeting()}, <span className="bg-gradient-to-r from-emerald-600 to-green-500 bg-clip-text text-transparent">{profile.fullName.split(' ')[0]}</span> 💛
          </h1>
          <p className="mt-2.5 text-sm font-medium text-gray-500 sm:text-base">
            {getDailySubtitle()}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-50 to-indigo-100 p-5 shadow-sm ring-1 ring-blue-100">
          <div className="absolute -right-4 -top-4 opacity-10">
            <Clock size={80} />
          </div>
          <div className="relative z-10 mb-2 flex items-center gap-3">
            <div className="rounded-2xl bg-white p-2.5 text-blue-600 shadow-sm">
              <Baby size={20} />
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-800">Current Week</p>
          </div>
          <p className="relative z-10 mt-2 text-xl font-bold text-gray-900">Week {week}</p>
          <p className="relative z-10 font-medium text-blue-800">{stage}</p>
        </div>

        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-orange-50 to-amber-100 p-5 shadow-sm ring-1 ring-orange-100">
          <div className="absolute -right-4 -top-4 opacity-10">
            <Calendar size={80} />
          </div>
          <div className="relative z-10 mb-2 flex items-center gap-3">
            <div className="rounded-2xl bg-white p-2.5 text-orange-600 shadow-sm">
              <Calendar size={20} />
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-orange-800">Due Date</p>
          </div>
          <p className="relative z-10 mt-2 text-xl font-bold text-gray-900">{formatDate(profile.expectedDueDate)}</p>
          <p className="relative z-10 font-medium text-orange-800">{gestationalAgeText}</p>
        </div>
      </div>

      {user?.uid && id && (
        <div className="flex flex-col gap-4">
          <DailyMomentCard userId={user.uid} profileId={id} />
        </div>
      )}
    </div>
  );
}

export default ProfileDetail;
