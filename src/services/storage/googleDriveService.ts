import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

export const GOOGLE_DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const ROOT_DRIVE_FOLDER_NAME = 'expectant-ai';
export const MIRA_CHAT_DRIVE_SUBFOLDER = 'mira-attachments';

// Keep Drive OAuth token strictly in memory (never in localStorage/sessionStorage per security rules)
let cachedDriveAccessToken: string | null = null;
let pendingTokenPromise: Promise<string> | null = null;

// In-memory cache of downloaded Google Drive file Blob URLs and text contents keyed by Drive fileId
const driveBlobUrlCache = new Map<string, string>();
const driveTextContentCache = new Map<string, string>();
const inFlightDriveFetches = new Map<
  string,
  Promise<{ blobUrl: string; textContent?: string } | null>
>();
const driveCacheListeners = new Set<() => void>();

const notifyDriveCacheListeners = (): void => {
  driveCacheListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Ignore listener errors
    }
  });
};

export const subscribeToDriveCacheUpdates = (
  listener: () => void
): (() => void) => {
  driveCacheListeners.add(listener);
  return () => {
    driveCacheListeners.delete(listener);
  };
};

export const setGoogleDriveToken = (token: string | null): void => {
  cachedDriveAccessToken = token;
  if (token) {
    notifyDriveCacheListeners();
  }
};

export const clearGoogleDriveToken = (): void => {
  cachedDriveAccessToken = null;
  pendingTokenPromise = null;
};

export const hasGoogleDriveToken = (): boolean =>
  Boolean(cachedDriveAccessToken);

export const extractGoogleDriveFileId = (driveUrl?: string): string | null => {
  if (!driveUrl) return null;
  const match = driveUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (match?.[1]) return match[1];
  const idParamMatch = driveUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return idParamMatch?.[1] ?? null;
};

export const getCachedDriveBlobUrl = (driveUrl?: string): string | undefined => {
  const fileId = extractGoogleDriveFileId(driveUrl);
  return fileId ? driveBlobUrlCache.get(fileId) : undefined;
};

export const getCachedDriveTextContent = (
  driveUrl?: string
): string | undefined => {
  const fileId = extractGoogleDriveFileId(driveUrl);
  return fileId ? driveTextContentCache.get(fileId) : undefined;
};

export const ensureGoogleDriveToken = async (
  forceRefresh = false
): Promise<string> => {
  if (cachedDriveAccessToken && !forceRefresh) {
    return cachedDriveAccessToken;
  }

  if (pendingTokenPromise) {
    return pendingTokenPromise;
  }

  pendingTokenPromise = (async () => {
    try {
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
      notifyDriveCacheListeners();
      return token;
    } finally {
      pendingTokenPromise = null;
    }
  })();

  return pendingTokenPromise;
};

export const fetchDriveFilePreview = async (
  driveUrl?: string,
  mimeType?: string,
  allowInteractiveAuth = false
): Promise<{ blobUrl: string; textContent?: string } | null> => {
  const fileId = extractGoogleDriveFileId(driveUrl);
  if (!fileId) return null;

  const existingBlobUrl = driveBlobUrlCache.get(fileId);
  if (existingBlobUrl) {
    return {
      blobUrl: existingBlobUrl,
      textContent: driveTextContentCache.get(fileId),
    };
  }

  const inFlight = inFlightDriveFetches.get(fileId);
  if (inFlight) {
    return inFlight;
  }

  if (!cachedDriveAccessToken && !allowInteractiveAuth) {
    return null;
  }

  const fetchPromise = (async (): Promise<{
    blobUrl: string;
    textContent?: string;
  } | null> => {
    try {
      let token = cachedDriveAccessToken;
      if (!token) {
        token = await ensureGoogleDriveToken(false);
      }

      let res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.status === 401 && allowInteractiveAuth) {
        token = await ensureGoogleDriveToken(true);
        res = await fetch(
          `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      } else if (res.status === 401) {
        cachedDriveAccessToken = null;
        return null;
      }

      if (!res.ok) {
        return null;
      }

      const rawBlob = await res.blob();
      const effectiveMime =
        mimeType || rawBlob.type || 'application/octet-stream';
      const typedBlob =
        rawBlob.type === effectiveMime
          ? rawBlob
          : new Blob([rawBlob], { type: effectiveMime });

      const blobUrl = URL.createObjectURL(typedBlob);
      driveBlobUrlCache.set(fileId, blobUrl);

      let textContent: string | undefined;
      if (effectiveMime.startsWith('text/')) {
        try {
          textContent = await typedBlob.text();
          driveTextContentCache.set(fileId, textContent);
        } catch {
          // Non-fatal
        }
      }

      notifyDriveCacheListeners();
      return { blobUrl, textContent };
    } catch {
      return null;
    } finally {
      inFlightDriveFetches.delete(fileId);
    }
  })();

  inFlightDriveFetches.set(fileId, fetchPromise);
  return fetchPromise;
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
  let token = await ensureGoogleDriveToken(false);

  let rootFolderId: string;
  try {
    rootFolderId = await findOrCreateDriveFolder(token, ROOT_DRIVE_FOLDER_NAME);
  } catch (err) {
    if (err instanceof Error && err.message === 'DRIVE_TOKEN_EXPIRED') {
      token = await ensureGoogleDriveToken(true);
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

  if (uploadData.id) {
    try {
      const localBlobUrl = URL.createObjectURL(file);
      driveBlobUrlCache.set(uploadData.id, localBlobUrl);
      notifyDriveCacheListeners();
    } catch {
      // Non-fatal
    }
  }

  return (
    uploadData.webViewLink ||
    (uploadData.id
      ? `https://drive.google.com/file/d/${uploadData.id}/view`
      : '')
  );
};