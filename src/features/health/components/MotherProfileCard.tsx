import '../../../styles/features/health/components/MotherProfileCard.css';
import { Edit3, MapPin } from 'lucide-react';
import type { MotherProfile } from '../types';

interface MotherProfileCardProps {
  profile: MotherProfile;
}

export default function MotherProfileCard({ profile }: MotherProfileCardProps) {
  return (
    <section className="mother-profile-card">
      <div className="mother-profile-card__body">
        <div className="mother-profile-card__profile">
          <div className="mother-profile-card__avatar">{profile.avatar}</div>

          <div>
            <p className="mother-profile-card__label">Patient Profile</p>
            <h2 className="mother-profile-card__title">{profile.name}</h2>
            <p className="mother-profile-card__detail">
              Age {profile.age} • {profile.weeksPregnant} weeks
            </p>
          </div>
        </div>

        <button type="button" className="mother-profile-card__button">
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
          Due date: <strong>{profile.dueDate}</strong>
        </p>
        <p className="mother-profile-card__notice">{profile.nextAction}</p>
      </div>
    </section>
  );
}
