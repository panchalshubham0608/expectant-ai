import { Link, useParams } from 'react-router-dom';
import { ChevronRight, Sparkles } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import DailyMomentCard from '../components/home/DailyMomentCard';
import SpiritualSlokaCard from '../components/home/SpiritualSlokaCard';
import BabyTalkCard from '../components/home/BabyTalkCard';

export default function DailyDigestPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { error, isLoading, profile } = useProfile(user?.uid, id);

  if (isLoading) {
    return (
      <div className="rounded-3xl bg-white p-6 text-sm text-gray-500 shadow-sm">
        Loading daily digest…
      </div>
    );
  }

  if (!profile || !user?.uid || !id) {
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
  }

  return (
    <div className="-mx-4 -mt-6 pb-24">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-b-[2.5rem] bg-gradient-to-br from-emerald-600 to-teal-800 px-6 pb-20 pt-12 shadow-lg">
        <div className="absolute -right-8 -top-8 h-48 w-48 rounded-full bg-white opacity-10 blur-2xl"></div>
        <div className="absolute -left-8 top-16 h-32 w-32 rounded-full bg-white opacity-10 blur-2xl"></div>

        <div className="relative z-10 flex items-start justify-between gap-4">
          <div>
            <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-emerald-50 backdrop-blur-sm">
              <Sparkles size={13} />
              <span>Today&apos;s Inspiration</span>
            </div>
            <h1 className="mb-2 text-2xl font-bold tracking-tight text-white">Daily Digest</h1>
            <p className="max-w-xs text-sm leading-relaxed text-emerald-50/90">
              Your daily pregnancy moment, spiritual wisdom, womb bonding, and baby name ideas.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-20 -mt-8 flex flex-col gap-4 px-4">
        <DailyMomentCard userId={user.uid} profileId={id} />

        <SpiritualSlokaCard
          userId={user.uid}
          profileId={id}
          spiritualSlokaContext={profile.spiritualSlokaContext}
        />

        <BabyTalkCard
          userId={user.uid}
          profileId={id}
          babyTalkEnabled={profile.babyTalkEnabled}
          babyTalkContext={profile.babyTalkContext}
        />

        <Link
          to={`/profile/${id}/baby-names`}
          className="group relative flex items-center justify-between overflow-hidden rounded-[2rem] bg-gradient-to-br from-teal-600 to-emerald-700 p-6 shadow-sm transition-all hover:shadow-md"
        >
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white opacity-10 blur-2xl transition-transform duration-500 group-hover:scale-125"></div>
          <div className="relative z-10 flex items-center gap-4">
            <div>
              <h3 className="text-lg font-bold text-white">Daily baby name ideas ✨</h3>
              <p className="text-sm font-medium text-teal-50/90">
                Explore personalized names and meanings curated for your little one.
              </p>
            </div>
          </div>
          <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md transition-colors group-hover:bg-white group-hover:text-teal-700">
            <ChevronRight size={20} />
          </div>
        </Link>
      </div>
    </div>
  );
}
