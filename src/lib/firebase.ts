
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCag79TbgOLJSf_VSyI8wPzFC0MfBl7ON4",
  authDomain: "projetojaque-3c3b8.firebaseapp.com",
  projectId: "projetojaque-3c3b8",
  storageBucket: "projetojaque-3c3b8.firebasestorage.app",
  messagingSenderId: "372698262234",
  appId: "1:372698262234:web:c25797ba44250fa93813e3",
  measurementId: "G-FX7Y5M7N8V"
};

// Inicializa o Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export { app };
