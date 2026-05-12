
'use client';

import { useMemo } from 'react';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

/**
 * Configurações mestre restauradas para o projeto "legistrac".
 * Este é o projeto que contém os dados originais da equipe e demandas.
 */
const firebaseConfig = {
  apiKey: "AIzaSyBh9hcARIT6NNLM0T583mn9Ts5RqC2AgfI",
  authDomain: "legistrac.firebaseapp.com",
  projectId: "legistrac",
  storageBucket: "legistrac.firebasestorage.app",
  messagingSenderId: "372698262234",
  appId: "1:372698262234:web:c25797ba44250fa93813e3"
};

let appInstance: FirebaseApp;
let authInstance: Auth;
let dbInstance: Firestore;
let storageInstance: FirebaseStorage;

export function initializeFirebase() {
  if (!getApps().length) {
    appInstance = initializeApp(firebaseConfig);
  } else {
    appInstance = getApp();
  }
  
  if (!authInstance) authInstance = getAuth(appInstance);
  if (!dbInstance) dbInstance = getFirestore(appInstance);
  if (!storageInstance) storageInstance = getStorage(appInstance);
  
  return { 
    app: appInstance, 
    auth: authInstance, 
    db: dbInstance, 
    storage: storageInstance 
  };
}

export function useMemoFirebase<T>(factory: () => T, deps: any[]): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(factory, deps);
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

export const useStorage = () => {
  const { storage } = initializeFirebase();
  return storage;
};
