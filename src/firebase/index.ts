
'use client';

import { useMemo } from 'react';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Configurações sincronizadas com o projeto exibido no console do usuário
const firebaseConfig = {
  apiKey: "AIzaSyBh9hcARIT6NNLM0T583mn9Ts5RqC2AgfI",
  authDomain: "pesquisa-62831355-9c7d1.firebaseapp.com",
  projectId: "pesquisa-62831355-9c7d1",
  storageBucket: "pesquisa-62831355-9c7d1.firebasestorage.app",
  messagingSenderId: "736970891304",
  appId: "1:736970891304:web:0cb8d3fad5bb3c9e38951d"
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
