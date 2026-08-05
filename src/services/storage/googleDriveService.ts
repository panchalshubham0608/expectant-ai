import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

export const uploadFileToGoogleDrive = async (file: File, filename?: string): Promise<string> => {
  const auth = getAuth();
  const provider = new GoogleAuthProvider();
  // The drive.file scope limits access only to files created by this app
  provider.addScope('https://www.googleapis.com/auth/drive.file');

  // 1. Authenticate & get the Google Drive access token
  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  const token = credential?.accessToken;

  if (!token) {
    throw new Error('Failed to obtain Google Drive access token.');
  }

  // 2. Find or create the "expectant-ai" folder
  const folderQuery = encodeURIComponent(`name='expectant-ai' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const folderRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${folderQuery}&spaces=drive`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const folderData = await folderRes.json();
  let folderId = folderData.files?.[0]?.id;

  if (!folderId) {
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'expectant-ai',
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });
    const createData = await createRes.json();
    folderId = createData.id;
  }

  // 3. Initiate a Resumable Upload
  const initRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Upload-Content-Type': file.type || 'application/pdf',
      'X-Upload-Content-Length': file.size.toString(),
    },
    body: JSON.stringify({
      name: filename || file.name,
      parents: [folderId],
    }),
  });

  const uploadUrl = initRes.headers.get('Location');
  if (!uploadUrl) {
    throw new Error('Failed to initiate Google Drive upload.');
  }

  // 4. Upload the file bytes
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
  });
  const uploadData = await uploadRes.json();

  return uploadData.webViewLink;
};