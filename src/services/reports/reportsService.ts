import { getUploadedFileUrl, saveUploadedFileMetadata } from '../storage/uploadedFilesService';
import {
  MIRA_CHAT_DRIVE_SUBFOLDER,
  uploadFileToGoogleDrive,
} from '../storage/googleDriveService';

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

  const fileExtension = file.name.split('.').pop() || 'pdf';
  const filename = `${fileHash}.${fileExtension}`;
  const uploadUrl = await uploadFileToGoogleDrive(file, filename);
  await saveUploadedFileMetadata(userId, profileId, fileHash, file, uploadUrl);

  return uploadUrl;
};

export const uploadChatAttachmentToGoogleDrive = async (
  userId: string,
  profileId: string,
  file: File
): Promise<string> => {
  const fileHash = await calculateFileHash(file);

  const existingUrl = await getUploadedFileUrl(userId, profileId, fileHash);
  if (existingUrl) {
    return existingUrl;
  }

  const fileExtension = file.name.split('.').pop() || 'bin';
  const filename = `${file.name.replace(/\.[^/.]+$/, '')}_${fileHash.slice(0, 8)}.${fileExtension}`;
  const uploadUrl = await uploadFileToGoogleDrive(
    file,
    filename,
    MIRA_CHAT_DRIVE_SUBFOLDER
  );
  await saveUploadedFileMetadata(
    userId,
    profileId,
    fileHash,
    file,
    uploadUrl,
    MIRA_CHAT_DRIVE_SUBFOLDER
  );

  return uploadUrl;
};

