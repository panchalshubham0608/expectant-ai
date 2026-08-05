import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getUploadedFilesCollection } from '../../lib/collections';

export const getUploadedFileUrl = async (
  userId: string,
  profileId: string,
  fileHash: string
): Promise<string | null> => {
  const fileRef = doc(getUploadedFilesCollection(userId, profileId), fileHash);
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
  const fileRef = doc(getUploadedFilesCollection(userId, profileId), fileHash);
  await setDoc(fileRef, {
    hash: fileHash,
    url,
    name: file.name,
    type: file.type || 'application/pdf',
    size: file.size,
    uploadedAt: new Date().toISOString(),
  });
};