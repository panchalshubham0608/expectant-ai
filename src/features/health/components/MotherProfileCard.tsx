import '../../../styles/features/health/components/MotherProfileCard.css';
import { Edit3, MapPin, X, Check } from 'lucide-react';
import { useState } from 'react';
import type { MotherProfile } from '../types';

interface MotherProfileCardProps {
  profile: MotherProfile;
}

const calculateAge = (dateOfBirth: string): number => {
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(date);
};

export default function MotherProfileCard({ profile }: MotherProfileCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<MotherProfile>(profile);
  const age = calculateAge(formData.dateOfBirth);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = () => {
    setIsEditing(false);
    // TODO: Persist changes to backend
  };

  const handleCancel = () => {
    setFormData(profile);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <section className="mother-profile-card">
        <div className="mother-profile-card__form">
          <h3 className="mother-profile-card__form-title">Edit Profile</h3>

          <div className="mother-profile-card__form-group">
            <label htmlFor="name" className="mother-profile-card__form-label">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="mother-profile-card__form-input"
            />
          </div>

          <div className="mother-profile-card__form-row">
            <div className="mother-profile-card__form-group">
              <label htmlFor="dateOfBirth" className="mother-profile-card__form-label">
                Date of Birth
              </label>
              <input
                id="dateOfBirth"
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
                className="mother-profile-card__form-input"
              />
            </div>

            <div className="mother-profile-card__form-group">
              <label htmlFor="lmp" className="mother-profile-card__form-label">
                Last Menstrual Period
              </label>
              <input
                id="lmp"
                type="date"
                name="lmp"
                value={formData.lmp}
                onChange={handleChange}
                className="mother-profile-card__form-input"
              />
            </div>
          </div>

          <div className="mother-profile-card__form-group">
            <label htmlFor="location" className="mother-profile-card__form-label">
              Location
            </label>
            <input
              id="location"
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              className="mother-profile-card__form-input"
            />
          </div>

          <div className="mother-profile-card__form-group">
            <label htmlFor="dueDate" className="mother-profile-card__form-label">
              Due Date
            </label>
            <input
              id="dueDate"
              type="date"
              name="dueDate"
              value={formData.dueDate}
              onChange={handleChange}
              className="mother-profile-card__form-input"
            />
          </div>

          <div className="mother-profile-card__form-actions">
            <button
              type="button"
              onClick={handleSave}
              className="mother-profile-card__form-button mother-profile-card__form-button--save"
            >
              <Check size={16} />
              Save
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="mother-profile-card__form-button mother-profile-card__form-button--cancel"
            >
              <X size={16} />
              Cancel
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mother-profile-card">
      <div className="mother-profile-card__body">
        <div className="mother-profile-card__profile">
          <div className="mother-profile-card__avatar">{profile.avatar}</div>

          <div>
            <p className="mother-profile-card__label">Patient Profile</p>
            <h2 className="mother-profile-card__title">{formData.name}</h2>
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
          <span>{formData.location}</span>
        </div>
        <p className="mother-profile-card__due">
          Due date: <strong>{formatDate(formData.dueDate)}</strong>
        </p>
        <p className="mother-profile-card__lmp">
          LMP: <strong>{formatDate(formData.lmp)}</strong>
        </p>
      </div>
    </section>
  );
}
