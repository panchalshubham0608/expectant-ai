import { doc, getDoc, setDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { getProfilesCollection, getWeeklyUpdatesCollection } from '../../lib/collections';
import { getPregnancyAge } from '../../utils/pregnancyUtils';
import { generateWeeklyUpdate } from '../ai/weeklyUpdateService';
import { generateImage } from '../ai/imageGenerationService';
import { uploadFileToGoogleDrive } from '../storage/googleDriveService';
import type { WeeklyUpdate } from "../../models/weeklyUpdate";

const base64ToFile = (base64: string, mimeType: string, filename: string): File => {
  const bstr = atob(base64);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mimeType });
};

export const generateAndSaveWeeklyUpdate = async (
  userId: string,
  profileId: string,
  userApiKey?: string
): Promise<WeeklyUpdate> => {
  const profileRef = doc(getProfilesCollection(userId), profileId);
  const profileSnap = await getDoc(profileRef);

  if (!profileSnap.exists()) {
    throw new Error('Profile not found.');
  }

  const profile = profileSnap.data();

  const age = getPregnancyAge(profile.lastMenstrualPeriod, profile.ultrasoundLastMenstrualPeriod);
  if (!age || age.isFuture) {
    throw new Error('Valid pregnancy start date not found in profile.');
  }

  const pregnancyWeek = age.weeks;
  const pregnancyDay = age.days;
  const currentWeek = pregnancyDay === 0 ? pregnancyWeek : pregnancyWeek + 1;

  const updateDocRef = doc(getWeeklyUpdatesCollection(userId, profileId), String(currentWeek));

  let weeklyUpdate: Partial<WeeklyUpdate> & { visuals?: any[] };

  // 1. Check if the weekly update already exists to prevent duplicate generations
  const snapshot = await getDoc(updateDocRef);
  if (snapshot.exists()) {
    weeklyUpdate = { id: snapshot.id, ...snapshot.data() } as WeeklyUpdate;
  } else {
    // 2. Generate the weekly update text content (this function only interacts with Gemini now)
    const generatedData = await generateWeeklyUpdate(currentWeek, userApiKey);

    const today = new Date();
    const dateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // 3. Construct the full WeeklyUpdate object with required tracking metadata
    weeklyUpdate = {
      ...generatedData,
      id: String(currentWeek),
      date: dateString,
      pregnancyWeek,
      pregnancyDay,
      createdAt: Date.now(),
    };

    // 4. Save partial data immediately to save Gemini API calls in case of later failures
    await setDoc(updateDocRef, weeklyUpdate, { merge: true });
  }

  let hasNewImages = false;

  // 5. Generate missing images in parallel based on the visual prompts
  if (weeklyUpdate.visuals && Array.isArray(weeklyUpdate.visuals)) {
    weeklyUpdate.visuals = await Promise.all(
      weeklyUpdate.visuals.map(async (visual) => {
        if (!visual.url) {
          try {
            const generatedImage = await generateImage(visual.prompt, userApiKey);
            const extension = generatedImage.mimeType.split('/')[1] || 'png';
            const imageFile = base64ToFile(generatedImage.data, generatedImage.mimeType, `${visual.type}-${pregnancyWeek}.${extension}`);
            const driveUrl = await uploadFileToGoogleDrive(imageFile);
            hasNewImages = true;
            return { ...visual, url: driveUrl };
          } catch (error) {
            console.error(`Failed to generate or upload visual image for ${visual.type}:`, error);
            return visual;
          }
        }
        return visual;
      })
    );
  }

  // 6. Update Firestore if any new URLs were added
  if (hasNewImages) {
    await setDoc(updateDocRef, { visuals: weeklyUpdate.visuals }, { merge: true });
  }

  return weeklyUpdate as WeeklyUpdate;
};

export const getWeeklyUpdateForCurrentWeek = async (
  userId: string,
  profileId: string
): Promise<WeeklyUpdate | null> => {
  const profileRef = doc(getProfilesCollection(userId), profileId);
  const profileSnap = await getDoc(profileRef);

  if (!profileSnap.exists()) {
    throw new Error('Profile not found.');
  }

  const profile = profileSnap.data();

  const age = getPregnancyAge(profile.lastMenstrualPeriod, profile.ultrasoundLastMenstrualPeriod);
  const currentWeek = age ? (age.days === 0 ? age.weeks : age.weeks + 1) : null;
  if (!age || age.isFuture) {
    return null;
  }

  const updateDocRef = doc(getWeeklyUpdatesCollection(userId, profileId), String(currentWeek));
  const snapshot = await getDoc(updateDocRef);
  
  if (snapshot.exists()) {
    return { id: snapshot.id, ...snapshot.data() } as WeeklyUpdate;
  }

  return null;
};

export const subscribeToWeeklyUpdates = (
  userId: string,
  profileId: string,
  onUpdate: (updates: WeeklyUpdate[]) => void,
  onError?: (error: Error) => void
) => {
  const q = query(
    getWeeklyUpdatesCollection(userId, profileId),
    orderBy('pregnancyWeek', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const updates = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as WeeklyUpdate[];
      onUpdate(updates);
    },
    (error) => {
      if (onError) onError(error);
      else console.error('Failed to subscribe to weekly updates:', error);
    }
  );
};