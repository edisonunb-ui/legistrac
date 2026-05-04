import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBh9hcARIT6NNLM0T583mn9Ts5RqC2AgfI",
  authDomain: "legistrac.firebaseapp.com",
  projectId: "legistrac",
  storageBucket: "legistrac.firebasestorage.app",
  messagingSenderId: "736970891304",
  appId: "1:736970891304:web:0cb8d3fad5bb3c9e38951d",
  measurementId: "G-Z4LT5NN6B0"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export { app };
