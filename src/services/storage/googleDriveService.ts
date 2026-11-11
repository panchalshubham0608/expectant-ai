import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getUsersCollection } from '../../lib/collections';
import { isFirebaseConfigured } from '../../lib/firebase';

export const GOOGLE_DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const ROOT_DRIVE_FOLDER_NAME = 'expectant-ai';
export const MIRA_CHAT_DRIVE_SUBFOLDER = 'mira-attachments';

const TOKEN_EXPIRY_BUFFER_MS = 60_000; // 1 minute buffer before expiry
const DEFAULT_TOKEN_TTL_SECONDS = 3500;

interface StoredGoogleDriveAuth {
  accessToken?: string;
  expiresAt?: number;
  updatedAt?: string;
}

// Keep Drive OAuth token in memory and synced to the authenticated user's private Firestore document
let cachedDriveAccessToken: string | null = null;
let cachedTokenExpiresAt = 0;
let loadedFirestoreUserId: string | null = null;

let pendingTokenPromise: Promise<string> | null = null;
let isRefreshingTokenState = false;
const activePreviewFetchIds = new Set<string>();
const failedSilentPreviewFileIds = new Set<string>();

// Runtime object URLs created from direct Drive API responses for the active view
const driveBlobUrlCache = new Map<string, string>();
const driveTextContentCache = new Map<string, string>();
const inFlightDriveFetches = new Map<
  string,
  Promise<{ blobUrl: string; textContent?: string } | null>
>();
const driveCacheListeners = new Set<() => void>();
let isNotifyingListeners = false;

const notifyDriveCacheListeners = (): void => {
  if (isNotifyingListeners) return;
  isNotifyingListeners = true;
  queueMicrotask(() => {
    try {
      driveCacheListeners.forEach((listener) => {
        try {
          listener();
        } catch {
          // Ignore listener errors
        }
      });
    } finally {
      isNotifyingListeners = false;
    }
  });
};

const setRefreshingTokenState = (refreshing: boolean): void => {
  if (isRefreshingTokenState !== refreshing) {
    isRefreshingTokenState = refreshing;
    notifyDriveCacheListeners();
  }
};

export const subscribeToDriveCacheUpdates = (
  listener: () => void
): (() => void) => {
  driveCacheListeners.add(listener);
  return () => {
    driveCacheListeners.delete(listener);
  };
};

export const isDriveTokenRefreshing = (): boolean => isRefreshingTokenState;

export const isDriveFilePreviewLoading = (driveUrl?: string): boolean => {
  const fileId = extractGoogleDriveFileId(driveUrl);
  if (!fileId) return false;
  return activePreviewFetchIds.has(fileId);
};

export const isAnyDriveActivityInProgress = (): boolean =>
  isRefreshingTokenState || activePreviewFetchIds.size > 0;

const isCachedTokenValid = (): boolean =>
  Boolean(
    cachedDriveAccessToken &&
      cachedTokenExpiresAt > Date.now() + TOKEN_EXPIRY_BUFFER_MS
  );

const persistDriveAuthToFirestore = async (
  userId: string,
  authData: {
    accessToken: string;
    expiresAt: number;
  }
): Promise<void> => {
  if (!isFirebaseConfigured || !userId) return;
  try {
    const userRef = doc(getUsersCollection(), userId);
    const payload: StoredGoogleDriveAuth = {
      accessToken: authData.accessToken,
      expiresAt: authData.expiresAt,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(userRef, { googleDriveAuth: payload }, { merge: true });
  } catch {
    // Non-fatal if offline
  }
};

const loadDriveAuthFromFirestore = async (
  userId: string
): Promise<StoredGoogleDriveAuth | null> => {
  if (!isFirebaseConfigured || !userId) return null;
  try {
    const userRef = doc(getUsersCollection(), userId);
    const snap = await getDoc(userRef);
    loadedFirestoreUserId = userId;
    if (!snap.exists()) return null;
    const data = snap.data()?.googleDriveAuth as StoredGoogleDriveAuth | undefined;
    if (!data) return null;

    if (
      data.accessToken &&
      typeof data.expiresAt === 'number' &&
      data.expiresAt > Date.now() + TOKEN_EXPIRY_BUFFER_MS
    ) {
      cachedDriveAccessToken = data.accessToken;
      cachedTokenExpiresAt = data.expiresAt;
      failedSilentPreviewFileIds.clear();
    }
    return data;
  } catch {
    return null;
  }
};

export const setGoogleDriveToken = (
  token: string | null,
  expiresInSeconds = DEFAULT_TOKEN_TTL_SECONDS
): void => {
  cachedDriveAccessToken = token;
  cachedTokenExpiresAt = token
    ? Date.now() + expiresInSeconds * 1000
    : 0;
  if (token) {
    failedSilentPreviewFileIds.clear();
    const uid = getAuth().currentUser?.uid;
    if (uid) {
      loadedFirestoreUserId = uid;
      void persistDriveAuthToFirestore(uid, {
        accessToken: token,
        expiresAt: cachedTokenExpiresAt,
      });
    }
    notifyDriveCacheListeners();
  }
};

export const clearGoogleDriveToken = (): void => {
  cachedDriveAccessToken = null;
  cachedTokenExpiresAt = 0;
  loadedFirestoreUserId = null;
  pendingTokenPromise = null;
  failedSilentPreviewFileIds.clear();
  setRefreshingTokenState(false);
};

export const hasGoogleDriveToken = (): boolean => isCachedTokenValid();

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

/**
 * Restores the user's valid Google Drive session from Firestore in the background
 * without opening any browser popup.
 */
export const restoreGoogleDriveSession = async (
  userId?: string
): Promise<string | null> => {
  if (isCachedTokenValid()) {
    return cachedDriveAccessToken;
  }

  const uid = userId ?? getAuth().currentUser?.uid;
  if (!uid) return null;

  setRefreshingTokenState(true);
  try {
    await loadDriveAuthFromFirestore(uid);
    if (isCachedTokenValid() && cachedDriveAccessToken) {
      notifyDriveCacheListeners();
      return cachedDriveAccessToken;
    }
    return null;
  } finally {
    setRefreshingTokenState(false);
  }
};

export const ensureGoogleDriveToken = async (
  forceRefresh = false,
  options?: { silentOnly?: boolean }
): Promise<string> => {
  const silentOnly = options?.silentOnly ?? false;

  if (!forceRefresh && isCachedTokenValid() && cachedDriveAccessToken) {
    return cachedDriveAccessToken;
  }

  if (pendingTokenPromise) {
    return pendingTokenPromise;
  }

  pendingTokenPromise = (async () => {
    setRefreshingTokenState(true);
    try {
      const auth = getAuth();
      const uid = auth.currentUser?.uid;

      // 1. Check Firestore-persisted token first (survives page reloads for the 1-hour OAuth window)
      if (!forceRefresh && uid && loadedFirestoreUserId !== uid) {
        await loadDriveAuthFromFirestore(uid);
        if (isCachedTokenValid() && cachedDriveAccessToken) {
          notifyDriveCacheListeners();
          return cachedDriveAccessToken;
        }
      }

      if (silentOnly) {
        throw new Error('SILENT_DRIVE_TOKEN_UNAVAILABLE');
      }

      // 2. Acquire fresh Google Drive token via Firebase GoogleAuthProvider
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

      const tokenResponse = (
        result as unknown as {
          _tokenResponse?: { oauthExpireIn?: number };
        }
      )._tokenResponse;
      const expiresIn = tokenResponse?.oauthExpireIn ?? DEFAULT_TOKEN_TTL_SECONDS;

      setGoogleDriveToken(token, expiresIn);
      return token;
    } finally {
      pendingTokenPromise = null;
      setRefreshingTokenState(false);
    }
  })();

  return pendingTokenPromise;
};

/**
 * Fetches file content directly from the Google Drive REST API (`alt=media`)
 * without storing preview data in Firestore or persistent browser storage.
 */
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

  if (!allowInteractiveAuth && failedSilentPreviewFileIds.has(fileId)) {
    return null;
  }

  const inFlight = inFlightDriveFetches.get(fileId);
  if (inFlight) {
    return inFlight;
  }

  activePreviewFetchIds.add(fileId);

  const fetchPromise = (async (): Promise<{
    blobUrl: string;
    textContent?: string;
  } | null> => {
    try {
      let token = isCachedTokenValid() ? cachedDriveAccessToken : null;
      if (!token) {
        try {
          token = await ensureGoogleDriveToken(false, {
            silentOnly: !allowInteractiveAuth,
          });
        } catch {
          if (!allowInteractiveAuth) {
            failedSilentPreviewFileIds.add(fileId);
          }
          return null;
        }
      }

      let res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.status === 401) {
        cachedDriveAccessToken = null;
        cachedTokenExpiresAt = 0;
        if (!allowInteractiveAuth) {
          failedSilentPreviewFileIds.add(fileId);
          return null;
        }
        try {
          token = await ensureGoogleDriveToken(true, {
            silentOnly: false,
          });
          res = await fetch(
            `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
        } catch {
          return null;
        }
      }

      if (!res.ok) {
        if (!allowInteractiveAuth) {
          failedSilentPreviewFileIds.add(fileId);
        }
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
      failedSilentPreviewFileIds.delete(fileId);

      let textContent: string | undefined;
      if (effectiveMime.startsWith('text/')) {
        try {
          textContent = await typedBlob.text();
          driveTextContentCache.set(fileId, textContent);
        } catch {
          // Non-fatal
        }
      }

      return { blobUrl, textContent };
    } catch {
      if (!allowInteractiveAuth) {
        failedSilentPreviewFileIds.add(fileId);
      }
      return null;
    } finally {
      activePreviewFetchIds.delete(fileId);
      inFlightDriveFetches.delete(fileId);
      notifyDriveCacheListeners();
    }
  })();

  inFlightDriveFetches.set(fileId, fetchPromise);
  notifyDriveCacheListeners();
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