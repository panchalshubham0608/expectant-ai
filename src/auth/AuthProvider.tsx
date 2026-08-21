import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  setPersistence,
  browserLocalPersistence,
  GoogleAuthProvider,
  signInWithCredential
} from 'firebase/auth';
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
    const handleNativeGoogleSignIn = (
      event: Event
    ) => {
      if (!auth) return;
      const customEvent =
        event as CustomEvent<{ idToken: string }>;

      const idToken =
        customEvent.detail.idToken;

      const credential =
        GoogleAuthProvider.credential(idToken);

      signInWithCredential(
        auth,
        credential
      ).catch((error) => {
        console.error(
          "Native Google sign-in failed:",
          error
        );
      });
    };

    window.addEventListener(
      "nativeGoogleSignIn",
      handleNativeGoogleSignIn
    );

    return () => {
      window.removeEventListener(
        "nativeGoogleSignIn",
        handleNativeGoogleSignIn
      );
    };
  }, []);

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

    if (window.Android) {
      console.log("[ANDROID] Using window.Android.signInWithGoogle()");
      await window.Android.signInWithGoogle();
    } else {
      console.log("[WEB] Using signInWithPopup()")
      await signInWithPopup(auth, googleProvider);
    }
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
