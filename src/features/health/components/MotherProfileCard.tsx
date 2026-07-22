import '../../../styles/features/health/components/MotherProfileCard.css';
import { Edit3, MapPin } from 'lucide-react';
import { useState } from 'react';
import ProfileFormDialog, {
  type ProfileFormData,
} from '../../../components/profile/ProfileFormDialog';
import type { MotherProfile } from '../types';

interface MotherProfileCardProps {
  profile: MotherProfile;
}

const calculateAge = (dateOfBirth: string): number => {
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

const formatDate = (dateStr: string): string =>
  new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(`${dateStr}T00:00:00`));

const asFormData = (profile: MotherProfile): ProfileFormData => ({
  fullName: profile.name,
  dateOfBirth: profile.dateOfBirth,
  lastMenstrualPeriod: profile.lmp,
  expectedDueDate: profile.dueDate,
  location: profile.location,
  bloodGroup: profile.bloodGroup ?? '',
  emergencyContact: profile.emergencyContact ?? '',
  careProvider: profile.careProvider ?? '',
});

export default function MotherProfileCard({ profile }: MotherProfileCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState<MotherProfile>(profile);
  const age = calculateAge(profileData.dateOfBirth);

  const handleSave = (form: ProfileFormData) => {
    setProfileData((current) => ({
      ...current,
      name: form.fullName,
      dateOfBirth: form.dateOfBirth,
      lmp: form.lastMenstrualPeriod,
      dueDate: form.expectedDueDate,
      location: form.location,
      bloodGroup: form.bloodGroup,
      emergencyContact: form.emergencyContact,
      careProvider: form.careProvider,
    }));
    setIsEditing(false);
  };

  return (
    <>
      <section className="mother-profile-card">
        <div className="mother-profile-card__body">
          <div className="mother-profile-card__profile">
            <div className="mother-profile-card__avatar">{profileData.avatar}</div>
            <div>
              <p className="mother-profile-card__label">Patient Profile</p>
              <h2 className="mother-profile-card__title">{profileData.name}</h2>
              <p className="mother-profile-card__detail">Age {age}</p>
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
            <span>{profileData.location}</span>
          </div>
          <p className="mother-profile-card__due">
            Due date: <strong>{formatDate(profileData.dueDate)}</strong>
          </p>
          <p className="mother-profile-card__lmp">
            LMP: <strong>{formatDate(profileData.lmp)}</strong>
          </p>
        </div>
      </section>
      {isEditing && (
        <ProfileFormDialog
          mode="edit"
          initialValues={asFormData(profileData)}
          onClose={() => setIsEditing(false)}
          onSubmit={handleSave}
        />
      )}
    </>
  );
}
