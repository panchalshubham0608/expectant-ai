import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import '../styles/pages/Health.css';
import { useAuth } from '../auth/useAuth';
import type { Measurement } from '../models/measurement';
import { useProfile } from '../hooks/useProfile';
import { useMeasurements } from '../hooks/useMeasurements';
import { updateMeasurements } from '../services/measurements/measurementsService';
import {
  MeasurementsCard,
} from '../features/health';

function Health() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { error, isLoading, profile } = useProfile(user?.uid, id);
  const { error: measurementsError, isLoading: isLoadingMeasurements, measurements } = useMeasurements(user?.uid, id);
  const [today] = useState(() => new Date());

  useEffect(() => {
    if (!user?.uid || !id) {
      return;
    }

    // const unsubscribeVisits = subscribeToDoctorVisits(user.uid, id, (nextVisits) => {
    //   setDoctorVisits(nextVisits);
    // }, () => undefined);

    return () => {
      // unsubscribeVisits();
    };
  }, [id, user?.uid]);

  const saveMeasurements = async (newMeasurements: Measurement[]) => {
    if (!user || !id) throw new Error('You must be signed in to update this profile.');
    await updateMeasurements(user.uid, id, newMeasurements);
  };

  const defaultMeasurements: Measurement[] = [];

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
          {/* <AIInsightsCard insights={aiInsightsData} /> */}
          {/* <HealthScoreCard data={healthScoreData} /> */}
          <MeasurementsCard
            measurements={mergedMeasurements}
            onSave={saveMeasurements}
          />
        </div>
      )}
    </div>
  );
}

export default Health;
