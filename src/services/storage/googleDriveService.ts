import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const GOOGLE_DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const ROOT_DRIVE_FOLDER_NAME = 'expectant-ai';
export const MIRA_CHAT_DRIVE_SUBFOLDER = 'mira-attachments';

// Keep Drive OAuth token strictly in memory (never in localStorage/sessionStorage per security rules)
let cachedDriveAccessToken: string | null = null;

export const clearGoogleDriveToken = (): void => {
  cachedDriveAccessToken = null;
};

const getGoogleDriveAccessToken = async (forceRefresh = false): Promise<string> => {
  if (cachedDriveAccessToken && !forceRefresh) {
    return cachedDriveAccessToken;
  }

  const auth = getAuth();
  const provider = new GoogleAuthProvider();
  provider.addScope(GOOGLE_DRIVE_FILE_SCOPE);
  if (auth.currentUser?.email) {
    provider.setCustomParameters({ login_hint: auth.currentUser.email });
  }

  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  const token = credential?.accessToken;

  if (!token) {
    throw new Error('Failed to obtain Google Drive access token.');
  }

  cachedDriveAccessToken = token;
  return token;
};

const findOrCreateDriveFolder = async (
  token: string,
  folderName: string,
  parentFolderId?: string
): Promise<string> => {
  const escapedName = folderName.replace(/'/g, "\\'");
  const parentClause = parentFolderId
    ? ` and '${parentFolderId}' in parents`
    : '';
  const folderQuery = encodeURIComponent(
    `name='${escapedName}' and mimeType='application/vnd.google-apps.folder'${parentClause} and trashed=false`
  );

  const folderRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${folderQuery}&spaces=drive&fields=files(id,name)`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (folderRes.status === 401) {
    throw new Error('DRIVE_TOKEN_EXPIRED');
  }

  const folderData = await folderRes.json();
  const existingId = folderData.files?.[0]?.id;
  if (existingId) {
    return existingId;
  }

  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      ...(parentFolderId ? { parents: [parentFolderId] } : {}),
    }),
  });

  const createData = await createRes.json();
  if (!createData.id) {
    throw new Error(`Failed to create Google Drive folder "${folderName}".`);
  }

  return createData.id;
};

export const uploadFileToGoogleDrive = async (
  file: File,
  filename?: string,
  subfolderName?: string
): Promise<string> => {
  let token = await getGoogleDriveAccessToken(false);

  let rootFolderId: string;
  try {
    rootFolderId = await findOrCreateDriveFolder(token, ROOT_DRIVE_FOLDER_NAME);
  } catch (err) {
    if (err instanceof Error && err.message === 'DRIVE_TOKEN_EXPIRED') {
      token = await getGoogleDriveAccessToken(true);
      rootFolderId = await findOrCreateDriveFolder(token, ROOT_DRIVE_FOLDER_NAME);
    } else {
      throw err;
    }
  }

  const targetFolderId = subfolderName
    ? await findOrCreateDriveFolder(token, subfolderName, rootFolderId)
    : rootFolderId;

  const initRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': file.type || 'application/octet-stream',
        'X-Upload-Content-Length': file.size.toString(),
      },
      body: JSON.stringify({
        name: filename || file.name,
        parents: [targetFolderId],
      }),
    }
  );

  const uploadUrl = initRes.headers.get('Location');
  if (!uploadUrl) {
    throw new Error('Failed to initiate Google Drive upload.');
  }

  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
  });
  const uploadData = await uploadRes.json();

  return uploadData.webViewLink;
};