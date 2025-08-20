import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import type { User as AppUser } from '@/types';

const ALLOWED_EMAILS = ['matanpr@gmail.com', 'nevo40@gmail.com'];

const googleProvider = new GoogleAuthProvider();

export const isEmailAllowed = (email: string): boolean => {
  return ALLOWED_EMAILS.includes(email.toLowerCase());
};

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    if (!isEmailAllowed(user.email || '')) {
      await signOut(auth);
      throw new Error('Access restricted. This email is not authorized.');
    }
    
    await createOrUpdateUserDoc(user);
    return user;
  } catch (error) {
    throw error;
  }
};

export const signInWithEmail = async (email: string, password: string) => {
  if (!isEmailAllowed(email)) {
    throw new Error('Access restricted. This email is not authorized.');
  }
  
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    await createOrUpdateUserDoc(result.user);
    return result.user;
  } catch (error) {
    throw error;
  }
};

export const signUpWithEmail = async (email: string, password: string) => {
  if (!isEmailAllowed(email)) {
    throw new Error('Access restricted. This email is not authorized.');
  }
  
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await createOrUpdateUserDoc(result.user);
    return result.user;
  } catch (error) {
    throw error;
  }
};

export const logOut = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    throw error;
  }
};

const createOrUpdateUserDoc = async (user: User) => {
  const userDocRef = doc(db, 'users', user.uid);
  const userDoc = await getDoc(userDocRef);
  
  const userData: Partial<AppUser> = {
    id: user.uid,
    email: user.email || '',
    displayName: user.displayName || '',
    photoURL: user.photoURL || '',
    lastLogin: new Date(),
  };
  
  if (!userDoc.exists()) {
    userData.createdAt = new Date();
    userData.preferences = {
      emailNotifications: true,
      pushNotifications: true,
      dailySummary: true,
      weeklySummary: false,
      alertSettings: {
        enabledMarkets: ['SP500', 'TA125'],
        enabledSectors: [],
        minSentimentScore: 0.6,
      },
    };
  }
  
  await setDoc(userDocRef, userData, { merge: true });
};

export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};