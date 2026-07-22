import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from '../lib/firebase';
import { AuthContext } from './AuthContext';

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

  const signInWithGoogle = async () => {
    if (!auth)
      throw new Error(
        'Firebase is not configured. Add the VITE_FIREBASE_* values to your .env file.',
      );
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
