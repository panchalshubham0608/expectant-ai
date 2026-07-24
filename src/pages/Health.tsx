import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import '../styles/pages/Health.css';
import { useAuth } from '../auth/useAuth';
import { updateProfile } from '../features/profiles/profileService';
import type { Measurement, MedicalRecord } from '../features/health/types';
import type { ProfileInput } from '../features/profiles/types';
import { useProfile } from '../features/profiles/useProfile';
import { useMeasurements } from '../features/health/useMeasurements';
import { updateMeasurements } from '../features/health/measurementsService';
import { subscribeToMedicalReports } from '../features/health/medicalRecordsService';
import { saveDoctorVisit, subscribeToDoctorVisits, markDoctorVisitCompleted } from '../features/health/doctorVisitsService';
import type { DoctorVisit } from '../features/health/types';
import {
  AIInsightsCard,
  DoctorVisitsCard,
  HealthScoreCard,
  MedicalRecordsCard,
  MeasurementsCard,
  MotherProfileCard,
  aiInsightsData,
  healthScoreData,
  medicalRecordsData,
} from '../features/health';

function Health() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { error, isLoading, profile } = useProfile(user?.uid, id);
  const { error: measurementsError, isLoading: isLoadingMeasurements, measurements } = useMeasurements(user?.uid, id);
  const [today] = useState(() => new Date());
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>(medicalRecordsData);
  const [doctorVisits, setDoctorVisits] = useState<DoctorVisit[]>([]);

  useEffect(() => {
    if (!user?.uid || !id) {
      return;
    }

    const unsubscribeMedical = subscribeToMedicalReports(user.uid, id, (nextRecords) => {
      setMedicalRecords(nextRecords.length > 0 ? nextRecords : medicalRecordsData);
    }, () => undefined);

    const unsubscribeVisits = subscribeToDoctorVisits(user.uid, id, (nextVisits) => {
      setDoctorVisits(nextVisits);
    }, () => undefined);

    return () => {
      unsubscribeMedical();
      unsubscribeVisits();
    };
  }, [id, user?.uid]);

  const saveProfile = async (nextProfile: ProfileInput) => {
    if (!user || !id) throw new Error('You must be signed in to update this profile.');
    await updateProfile(user.uid, id, nextProfile);
  };

  const saveMeasurements = async (newMeasurements: Measurement[]) => {
    if (!user || !id) throw new Error('You must be signed in to update this profile.');
    await updateMeasurements(user.uid, id, newMeasurements);
  };

  const addDoctorVisit = async (visit: Omit<DoctorVisit, 'id'>) => {
    if (!user || !id) throw new Error('You must be signed in to manage appointments.');
    await saveDoctorVisit(user.uid, id, visit);
  };

  const completeDoctorVisit = async (visitId: string, details: string) => {
    if (!user || !id) throw new Error('You must be signed in to manage appointments.');
    await markDoctorVisitCompleted(user.uid, id, visitId, details);
  };

  const defaultMeasurements: Measurement[] = [
    {
      id: 'weight',
      label: 'Weight',
      value: '0',
      unit: 'kg',
      lastMeasuredDate: '',
    },
    {
      id: 'blood-pressure',
      label: 'Blood Pressure',
      value: '0/0',
      unit: '',
      lastMeasuredDate: '',
    },
    {
      id: 'heart-rate',
      label: 'Heart Rate',
      value: '0',
      unit: 'bpm',
      lastMeasuredDate: '',
    },
    {
      id: 'gest-age',
      label: 'Gestational Age',
      value: '0',
      unit: 'weeks',
      lastMeasuredDate: '',
    },
    {
      id: 'baby-weight',
      label: 'Baby Weight',
      value: '0',
      unit: 'g',
      lastMeasuredDate: '',
    },
    {
      id: 'baby-heart-rate',
      label: 'Baby Heart Rate',
      value: '0',
      unit: 'bpm',
      lastMeasuredDate: '',
    },];

  const mergedMeasurements = defaultMeasurements.map(
    (defaultMeasurement) =>
      measurements?.find((m) => m.id === defaultMeasurement.id) || defaultMeasurement,
  );

  const week = profile
    ? Math.max(
      1,
      Math.min(
        42,
        Math.floor(
          (today.getTime() - new Date(`${profile.lastMenstrualPeriod}T00:00:00`).getTime()) /
          604800000,
        ),
      ),
    )
    : null;

  return (
    <div className="health-page">
      <header className="health-header">
        <div className="health-header__row">
          <div>
            <h1 className="health-header__title">Pregnancy Health</h1>
            <p className="health-header__subtitle">{week ? `Week ${week}` : 'Loading profile…'}</p>
          </div>
          <div className="health-header__badge">Personalized profile</div>
        </div>
      </header>
      {(error || measurementsError) && (
        <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error || measurementsError}</p>
      )}
      {(isLoading || isLoadingMeasurements) ? (
        <div className="rounded-3xl bg-white p-6 text-sm text-gray-500 shadow-sm">
          Loading health profile…
        </div>
      ) : !profile ? (
        <div className="rounded-3xl bg-white p-6 text-sm text-gray-500 shadow-sm">
          Profile unavailable.
        </div>
      ) : (
        <div className="health-grid">
          <AIInsightsCard insights={aiInsightsData} />
          <HealthScoreCard data={healthScoreData} />
          <MotherProfileCard profile={profile} onSave={saveProfile} />
          <MeasurementsCard
            measurements={mergedMeasurements}
            onSave={saveMeasurements}
          />
          <DoctorVisitsCard visits={doctorVisits} onAddVisit={addDoctorVisit} onCompleteVisit={completeDoctorVisit} />
          <MedicalRecordsCard records={medicalRecords} />
          {/* <TimelineCard events={pregnancyTimelineData} /> */}
        </div>
      )}
    </div>
  );
}

export default Health;
