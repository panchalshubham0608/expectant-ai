import { addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { Appointment } from '../../models/doctorVisit';

const appointmentsCollection = (userId: string, profileId: string) => {
  if (!db) throw new Error('Firebase is not configured.');
  return collection(db, 'users', userId, 'profiles', profileId, 'appointments');
};

export const saveAppointment = async (
  userId: string,
  profileId: string,
  appointmentInput: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>,
) => {
  if (!db) {
    throw new Error('Firebase is not configured.');
  }

  const docRef = await addDoc(appointmentsCollection(userId, profileId), {
    ...appointmentInput,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
};

export const updateAppointment = async (
  userId: string,
  profileId: string,
  appointmentId: string,
  data: Partial<Appointment>,
) => {
  if (!db) {
    throw new Error('Firebase is not configured.');
  }

  await updateDoc(doc(db, 'users', userId, 'profiles', profileId, 'appointments', appointmentId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

export const subscribeToAppointments = (
  userId: string,
  profileId: string,
  onChange: (appointments: Appointment[]) => void,
  onError: (error: Error) => void,
) => {
  return onSnapshot(
    query(appointmentsCollection(userId, profileId), orderBy('scheduledAt', 'desc')),
    (snapshot) => {
      const appointments = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          scheduledAt: data.scheduledAt ?? "",
          completedAt: data.completedAt,
          doctorName: data.doctorName ?? "",
          specialty: data.specialty,
          hospital: data.hospital,
          reason: data.reason ?? "",
          questions: data.questions ?? [],
          observations: data.observations ?? [],
          diagnoses: data.diagnoses ?? [],
          recommendations: data.recommendations ?? [],
          prescribedMedications: data.prescribedMedications ?? [],
          followUpDate: data.followUpDate,
          medicalRecordIds: data.medicalRecordIds ?? [],
          status: data.status ?? "scheduled",
          createdAt: data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
        } as Appointment;
      });

      onChange(appointments);
    },
    onError,
  );
};
