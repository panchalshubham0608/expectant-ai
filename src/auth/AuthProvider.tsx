import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from '../lib/firebase';
import { AuthContext } from './AuthContext';
import { registerForNotifications } from '../lib/messaging'; 

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(isFirebaseConfigured);

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    registerForNotifications(user.uid).catch((error) => {
      console.log("Failed to register for notifications", error);
    });
  }, [user]);

  const signInWithGoogle = async () => {
    if (!auth)
      throw new Error(
        'Firebase is not configured. Add the VITE_FIREBASE_* values to your .env file.',
      );
    await setPersistence(auth, browserLocalPersistence);
    await signInWithPopup(auth, googleProvider);
  };

  const signOut = async () => {
    if (auth) await firebaseSignOut(auth);
  };

  return (
    <AuthContext
      value={{ user, isLoading, isConfigured: isFirebaseConfigured, signInWithGoogle, signOut }}
    >
      {children}
    </AuthContext>
  );
}

export default AuthProvider;
