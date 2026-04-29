'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCag79TbgOLJSf_VSyI8wPzFC0MfBl7ON4",
  authDomain: "projetojaque-3c3b8.firebaseapp.com",
  projectId: "projetojaque-3c3b8",
  storageBucket: "projetojaque-3c3b8.firebasestorage.app",
  messagingSenderId: "372698262234",
  appId: "1:372698262234:web:c25797ba44250fa93813e3",
  measurementId: "G-FX7Y5M7N8V"
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

export function initializeFirebase() {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } else {
    app = getApp();
    auth = getAuth(app);
    db = getFirestore(app);
  }
  return { app, auth, db };
}

export { 
  FirebaseProvider, 
  useFirebase, 
  useFirebaseApp, 
  useFirestore, 
  useAuth,
  useAuthInstance 
} from './provider';
export { FirebaseClientProvider } from './client-provider';
export { useCollection } from './firestore/use-collection';
export { useDoc } from './firestore/use-doc';
export { useUser } from './auth/use-user';
