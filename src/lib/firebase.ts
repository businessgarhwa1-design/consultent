import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, initializeFirestore, Firestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Use specific firestoreDatabaseId if provisioned
let firestoreDb: Firestore;
try {
  firestoreDb =
    firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
      ? initializeFirestore(app, {}, firebaseConfig.firestoreDatabaseId)
      : getFirestore(app);
} catch {
  firestoreDb =
    firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
      ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
      : getFirestore(app);
}

export const db = firestoreDb;
export const auth = getAuth(app);
export default app;

