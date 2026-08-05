import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export const getUploadedFileUrl = async (
  userId: string,
  profileId: string,
  fileHash: string
): Promise<string | null> => {
  if (!db) {
    throw new Error('Firebase is not configured.');
  }

  const fileRef = doc(db, 'users', userId, 'profiles', profileId, 'uploaded_files', fileHash);
  const fileSnap = await getDoc(fileRef);

  if (fileSnap.exists()) {
    const data = fileSnap.data();
    if (data && data.url) {
      return data.url;
    }
  }

  return null;
};

export const saveUploadedFileMetadata = async (
  userId: string,
  profileId: string,
  fileHash: string,
  file: File,
  url: string
): Promise<void> => {
  if (!db) {
    throw new Error('Firebase is not configured.');
  }

  const fileRef = doc(db, 'users', userId, 'profiles', profileId, 'uploaded_files', fileHash);
  await setDoc(fileRef, {
    hash: fileHash,
    url,
    name: file.name,
    type: file.type || 'application/pdf',
    size: file.size,
    uploadedAt: new Date().toISOString(),
  });
};