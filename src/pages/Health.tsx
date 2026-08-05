import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../auth/useAuth';
import type { Measurement } from '../models/measurement';
import { useProfile } from '../hooks/useProfile';
import { useMeasurements } from '../hooks/useMeasurements';
import { updateMeasurements } from '../services/measurements/measurementsService';
import {
  MeasurementsCard,
} from '../features/health';
import ActiveMedicationsCard from '../features/health/components/ActiveMedicationsCard';

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
    <div className="-mx-4 -mt-6 pb-24">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-b-[2.5rem] bg-gradient-to-br from-purple-600 to-fuchsia-800 px-6 pb-20 pt-12 shadow-lg">
        <div className="absolute -right-8 -top-8 h-48 w-48 rounded-full bg-white opacity-10 blur-2xl"></div>
        <div className="absolute -left-8 top-16 h-32 w-32 rounded-full bg-white opacity-10 blur-2xl"></div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">Pregnancy Health</h1>
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white shadow-sm backdrop-blur-md">
              Personalized
            </span>
          </div>
          <p className="text-sm leading-relaxed text-purple-50/90">
            {week ? `Week ${week} updates` : 'Loading profile…'}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-20 -mt-8 px-4">
        {(error || measurementsError) && (
          <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error || measurementsError}</p>
        )}
        {(isLoading || isLoadingMeasurements) ? (
          <div className="rounded-3xl bg-white p-6 text-sm text-gray-500 shadow-sm ring-1 ring-gray-100">
            Loading health profile…
          </div>
        ) : !profile ? (
          <div className="rounded-3xl bg-white p-6 text-sm text-gray-500 shadow-sm ring-1 ring-gray-100">
            Profile unavailable.
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {/* <AIInsightsCard insights={aiInsightsData} /> */}
            {/* <HealthScoreCard data={healthScoreData} /> */}
            <ActiveMedicationsCard />
            <MeasurementsCard
              measurements={mergedMeasurements}
              onSave={saveMeasurements}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default Health;
