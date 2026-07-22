import '../../../styles/features/health/components/MotherProfileCard.css';
import { Droplets, Edit3, MapPin, Phone, Stethoscope } from 'lucide-react';
import { useState } from 'react';
import ProfileFormDialog from '../../../components/profile/ProfileFormDialog';
import type { Profile, ProfileInput } from '../../profiles/types';

interface MotherProfileCardProps {
  profile: Profile;
  onSave: (profile: ProfileInput) => Promise<void>;
}

const calculateAge = (dateOfBirth: string) => {
  const today = new Date();
  const birth = new Date(`${dateOfBirth}T00:00:00`);
  let age = today.getFullYear() - birth.getFullYear();
  if (
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
  )
    age--;
  return age;
};

const formatDate = (date: string) =>
  new Intl.DateTimeFormat('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }).format(
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

export default function MotherProfileCard({ profile, onSave }: MotherProfileCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [saveError, setSaveError] = useState('');

  const handleSave = async (form: ProfileInput) => {
    setSaveError('');
    try {
      await onSave(form);
      setIsEditing(false);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Unable to save profile changes.');
    }
  };

  return (
    <>
      <section className="mother-profile-card">
        <div className="mother-profile-card__body">
          <div className="mother-profile-card__profile">
            <div className="mother-profile-card__avatar">{getInitials(profile.fullName)}</div>
            <div>
              <h2 className="mother-profile-card__title">{profile.fullName}</h2>
              <p className="mother-profile-card__detail">Age {calculateAge(profile.dateOfBirth)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="mother-profile-card__button"
          >
            <Edit3 size={16} />
            Edit Profile
          </button>
        </div>
        <div className="mother-profile-card__meta">
          <div className="mother-profile-card__meta-row">
            <MapPin size={16} />
            <span>{profile.location}</span>
          </div>
          <p className="mother-profile-card__due">
            Due date: <strong>{formatDate(profile.expectedDueDate)}</strong>
          </p>
          <p className="mother-profile-card__lmp">
            LMP: <strong>{formatDate(profile.lastMenstrualPeriod)}</strong>
          </p>
        </div>
        {(profile.bloodGroup || profile.careProvider || profile.emergencyContact) && (
          <div className="mother-profile-card__care-details">
            <p className="mother-profile-card__care-title">Care details</p>
            <div className="mother-profile-card__care-grid">
              {profile.bloodGroup && (
                <div className="mother-profile-card__care-item">
                  <Droplets size={16} />
                  <div>
                    <span>Blood group</span>
                    <strong>{profile.bloodGroup}</strong>
                  </div>
                </div>
              )}
              {profile.careProvider && (
                <div className="mother-profile-card__care-item">
                  <Stethoscope size={16} />
                  <div>
                    <span>Care provider</span>
                    <strong>{profile.careProvider}</strong>
                  </div>
                </div>
              )}
              {profile.emergencyContact && (
                <div className="mother-profile-card__care-item">
                  <Phone size={16} />
                  <div>
                    <span>Emergency contact</span>
                    <strong>{profile.emergencyContact}</strong>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
      {isEditing && (
        <ProfileFormDialog
          mode="edit"
          initialValues={profile}
          onClose={() => setIsEditing(false)}
          onSubmit={handleSave}
        />
      )}
      {saveError && (
        <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{saveError}</p>
      )}
    </>
  );
}
