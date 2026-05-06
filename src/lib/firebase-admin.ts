import * as admin from "firebase-admin";

/**
 * Inicializa o Firebase Admin SDK de forma robusta.
 * Trata as quebras de linha da chave privada e garante inicialização única.
 */
if (!admin.apps.length) {
  try {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY 
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/"/g, '')
      : undefined;

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID || "legistrac",
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });
    console.log("Firebase Admin inicializado com sucesso.");
  } catch (error) {
    console.error("Erro crítico ao inicializar Firebase Admin:", error);
  }
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();