import React, { useState } from "react";
import { 
  User, 
  Calendar, 
  MapPin, 
  Droplets, 
  Clock, 
  Baby, 
  Stethoscope, 
  Hospital, 
  Phone, 
  Edit3,
  Heart,
  BarChart3,
  Map
} from "lucide-react";
import { differenceInDays } from "date-fns";
import ProfileFormDialog from "../components/profile/ProfileFormDialog";
import type { ProfileInput } from "../features/profiles/types";
import { useParams } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { useProfile } from "../features/profiles/useProfile";
import { updateProfile } from "../features/profiles/profileService";

const formatDate = (date: string) => {
  if (!date) return "Not specified";
  try {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
      new Date(`${date}T00:00:00`)
    );
  } catch {
    return date;
  }
};

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { error, isLoading, profile } = useProfile(user?.uid, id);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleSave = async (updatedProfile: ProfileInput) => {
    if (!user || !id) return;
    try {
      await updateProfile(user.uid, id, updatedProfile);
      setIsEditOpen(false);
    } catch (err) {
      console.error("Failed to update profile", err);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 text-center text-sm text-gray-500">Loading profile...</div>
    );
  }

  if (error || !profile) {
    return (
      <div className="p-6 text-center text-sm text-red-500">
        {error || "Profile not found."}
      </div>
    );
  }

  let gestationalAgeText = "Not available";
  if (profile.lastMenstrualPeriod) {
    try {
      const lmpDate = new Date(`${profile.lastMenstrualPeriod}T00:00:00`);
      const today = new Date();
      const totalDays = differenceInDays(today, lmpDate);

      if (totalDays >= 0) {
        const weeks = Math.floor(totalDays / 7);
        const days = totalDays % 7;
        gestationalAgeText = `${weeks} week${weeks !== 1 ? 's' : ''}, ${days} day${days !== 1 ? 's' : ''}`;
      } else {
        gestationalAgeText = "LMP is in the future";
      }
    } catch {
      gestationalAgeText = "Invalid date";
    }
  }
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="-mx-4 -mt-6 pb-6">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-b-[2.5rem] bg-gradient-to-br from-green-600 to-emerald-800 px-6 pb-24 pt-12 shadow-lg">
        {/* Decorative background elements */}
        <div className="absolute -right-8 -top-8 h-48 w-48 rounded-full bg-white opacity-10 blur-2xl"></div>
        <div className="absolute -left-8 top-16 h-32 w-32 rounded-full bg-white opacity-10 blur-2xl"></div>
        
        <div className="relative z-10 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-white">Profile</h1>
          <button 
            className="flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-2 text-sm font-medium text-white backdrop-blur-md transition-all hover:bg-white/30"
            onClick={() => setIsEditOpen(true)}
          >
            <Edit3 size={16} />
            <span>Edit</span>
          </button>
        </div>
      </div>

      {/* Main Profile Card */}
      <div className="relative z-20 -mt-16 px-4">
        <div className="flex flex-col items-center rounded-[2rem] bg-white p-6 text-center shadow-xl shadow-gray-200/50 ring-1 ring-gray-100">
          <div className="-mt-16 mb-4 flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-gradient-to-tr from-green-100 to-emerald-50 shadow-md">
            <span className="text-3xl font-bold text-green-700">{getInitials(profile.fullName)}</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{profile.fullName}</h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-gray-500">
            <MapPin size={16} className="text-gray-400" /> {profile.location}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
             <span className="rounded-full border border-green-100 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
               Active Profile
             </span>
             <span className="flex items-center gap-1 rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
               <BarChart3 size={12} />
               {gestationalAgeText}
             </span>
             <span className="flex items-center gap-1 rounded-full border border-rose-100 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
               <Droplets size={12} />
               {profile.bloodGroup}
             </span>
          </div>
        </div>
      </div>

      {/* Content Sections */}
      <div className="mt-6 space-y-5 px-4">
        
        {/* Pregnancy Details */}
        <div className="relative overflow-hidden rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <div className="absolute -right-4 -top-4 opacity-[0.03]">
            <Baby size={120} />
          </div>
          <h3 className="mb-5 flex items-center gap-2 text-lg font-bold text-gray-900">
            <Heart className="text-pink-500" size={20} />
            Pregnancy Details
          </h3>
          <div className="relative z-10 flex flex-col gap-5">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-pink-50 p-3 text-pink-600">
                <Clock size={22} />
              </div>
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">Last Menstrual Period</p>
                <p className="font-semibold text-gray-900">{formatDate(profile.lastMenstrualPeriod)}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-purple-50 p-3 text-purple-600">
                <Calendar size={22} />
              </div>
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">Expected Due Date</p>
                <p className="font-semibold text-gray-900">{formatDate(profile.expectedDueDate)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Care & Emergency */}
        <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <h3 className="mb-5 flex items-center gap-2 text-lg font-bold text-gray-900">
            <Stethoscope className="text-teal-500" size={20} />
            Care & Emergency
          </h3>
          <div className="flex flex-col gap-5">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-teal-50 p-3 text-teal-600">
                <User size={22} />
              </div>
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">Care Provider</p>
                <p className="font-semibold text-gray-900">{profile.careProvider || "Not specified"}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600">
                <Hospital size={22} />
              </div>
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">Primary Hospital</p>
                <p className="font-semibold text-gray-900">{profile.primaryHospital || "Not specified"}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-amber-50 p-3 text-amber-600">
                <Map size={22} />
              </div>
              <div className="overflow-hidden">
                <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">Hospital Location</p>
                <p className="font-semibold text-gray-900 truncate">
                  {profile.primaryHospitalLocation ? (
                    profile.primaryHospitalLocation.startsWith("http") ? (
                      <a href={profile.primaryHospitalLocation} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        View on Maps
                      </a>
                    ) : (
                      profile.primaryHospitalLocation
                    )
                  ) : (
                    "Not specified"
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-rose-50 p-3 text-rose-600">
                <Phone size={22} />
              </div>
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">Emergency Contact</p>
                <p className="font-semibold text-gray-900">{profile.emergencyContact || "Not specified"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Personal Details */}
        <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <h3 className="mb-5 flex items-center gap-2 text-lg font-bold text-gray-900">
            <User className="text-blue-500" size={20} />
            Personal Details
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl bg-gray-50 p-4">
              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">Date of Birth</p>
              <p className="font-semibold text-gray-900">{formatDate(profile.dateOfBirth)}</p>
            </div>
            <div className="rounded-2xl bg-gray-50 p-4">
              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">Blood Group</p>
              <p className="font-semibold text-gray-900">{profile.bloodGroup}</p>
            </div>
          </div>
        </div>

      </div>

      {isEditOpen && (
        <ProfileFormDialog
          mode="edit"
          initialValues={profile as any}
          onClose={() => setIsEditOpen(false)}
          onSubmit={handleSave}
        />
      )}
    </div>
  );
}