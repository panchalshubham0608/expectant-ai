import { addDoc, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import type { Appointment } from '../../models/appointment';
import { getAppointmentsCollection } from '../../lib/collections';

export const saveAppointment = async (
  userId: string,
  profileId: string,
  appointmentInput: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>,
) => {
  const docRef = await addDoc(getAppointmentsCollection(userId, profileId), {
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
  await updateDoc(doc(getAppointmentsCollection(userId, profileId), appointmentId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

export const deleteAppointment = async (
  userId: string,
  profileId: string,
  appointmentId: string,
) => {
  await deleteDoc(doc(getAppointmentsCollection(userId, profileId), appointmentId));
};

export const subscribeToAppointments = (
  userId: string,
  profileId: string,
  onChange: (appointments: Appointment[]) => void,
  onError: (error: Error) => void,
) => {
  return onSnapshot(
    query(getAppointmentsCollection(userId, profileId), orderBy('scheduledAt', 'desc')),
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
          attachedFiles: data.attachedFiles ?? [],
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