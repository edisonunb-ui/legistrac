'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBh9hcARIT6NNLM0T583mn9Ts5RqC2AgfI",
  authDomain: "legistrac.firebaseapp.com",
  projectId: "legistrac",
  storageBucket: "legistrac.firebasestorage.app",
  messagingSenderId: "736970891304",
  appId: "1:736970891304:web:0cb8d3fad5bb3c9e38951d",
  measurementId: "G-Z4LT5NN6B0"
};

let appInstance: FirebaseApp;
let authInstance: Auth;
let dbInstance: Firestore;

export function initializeFirebase() {
  if (!getApps().length) {
    appInstance = initializeApp(firebaseConfig);
  } else {
    appInstance = getApp();
  }
  
  if (!authInstance) authInstance = getAuth(appInstance);
  if (!dbInstance) dbInstance = getFirestore(appInstance);
  
  return { app: appInstance, auth: authInstance, db: dbInstance };
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