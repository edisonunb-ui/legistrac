import * as admin from "firebase-admin";

/**
 * Inicializa o Firebase Admin SDK no servidor.
 * Utiliza variáveis de ambiente para segurança.
 */
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "legistrac",
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Garante que as quebras de linha da chave privada sejam tratadas corretamente
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error) {
    console.error("Erro ao inicializar Firebase Admin:", error);
  }
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
