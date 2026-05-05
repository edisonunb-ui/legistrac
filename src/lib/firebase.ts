import { initializeFirebase } from "@/firebase";

const { app, auth, db } = initializeFirebase();

export { app, auth, db };