import { getUploadedFileUrl, saveUploadedFileMetadata } from '../storage/uploadedFilesService';
import { uploadFileToGoogleDrive } from '../storage/googleDriveService';

const calculateFileHash = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
};

export const uploadReportToGoogleDrive = async (
  userId: string,
  profileId: string,
  file: File
): Promise<string> => {
  const fileHash = await calculateFileHash(file);

  const existingUrl = await getUploadedFileUrl(userId, profileId, fileHash);
  if (existingUrl) {
    return existingUrl;
  }

  const uploadUrl = await uploadFileToGoogleDrive(file);
  await saveUploadedFileMetadata(userId, profileId, fileHash, file, uploadUrl);

  return uploadUrl;
};