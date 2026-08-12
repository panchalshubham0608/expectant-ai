import { collection, doc } from 'firebase/firestore';
import { db } from './firebase';

export const requireDb = () => {
  if (!db) {
    throw new Error(
      'Firebase is not configured. Add the VITE_FIREBASE_* values to your .env file.',
    );
  }
  return db;
};

export const getProfilesCollection = (userId: string) => collection(requireDb(), 'users', userId, 'profiles');

const getProfileSubcollection = (userId: string, profileId: string, subcollection: string) =>
  collection(doc(getProfilesCollection(userId), profileId), subcollection);

export const getKeysCollection = (userId: string, profileId: string) => getProfileSubcollection(userId, profileId, 'keys');
export const getMedicationsCollection = (userId: string, profileId: string) => getProfileSubcollection(userId, profileId, 'medications');
export const getMeasurementsCollection = (userId: string, profileId: string) => getProfileSubcollection(userId, profileId, 'measurements');
export const getAppointmentsCollection = (userId: string, profileId: string) => getProfileSubcollection(userId, profileId, 'appointments');
export const getReportsCollection = (userId: string, profileId: string) => getProfileSubcollection(userId, profileId, 'reports');
export const getUploadedFilesCollection = (userId: string, profileId: string) => getProfileSubcollection(userId, profileId, 'uploaded_files');
export const getRemindersCollection = (userId: string, profileId: string) => getProfileSubcollection(userId, profileId, 'reminders');
export const getDailyMomentsCollectionRef = (userId: string, profileId: string) => getProfileSubcollection(userId, profileId, 'dailyMoments');
export const getWeeklyUpdatesCollection = (userId: string, profileId: string) => getProfileSubcollection(userId, profileId, 'weeklyUpdates');