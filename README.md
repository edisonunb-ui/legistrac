// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCag79TbgOLJSf_VSyI8wPzFC0MfBl7ON4",
  authDomain: "projetojaque-3c3b8.firebaseapp.com",
  projectId: "projetojaque-3c3b8",
  storageBucket: "projetojaque-3c3b8.firebasestorage.app",
  messagingSenderId: "372698262234",
  appId: "1:372698262234:web:c25797ba44250fa93813e3",
  measurementId: "G-FX7Y5M7N8V"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.
