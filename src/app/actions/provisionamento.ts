
'use server';

import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { revalidatePath } from "next/cache";

export async function provisionarMembro(data: { 
  email: string, 
  nome: string, 
  perfil: string, 
  cabinetId: string,
  permissoes: any 
}) {
  try {
    const emailLower = data.email.toLowerCase().trim();

    const userRecord = await adminAuth.createUser({
      email: emailLower,
      password: "Mudar@123",
      displayName: data.nome,
    });

    const userProfile = {
      uid: userRecord.uid,
      nome: data.nome,
      email: emailLower,
      perfil: data.perfil,
      cabinetId: data.cabinetId,
      permissoes: data.permissoes,
      ativo: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await adminDb.collection("users").doc(emailLower).set(userProfile);

    revalidatePath("/usuarios");
    return { success: true, uid: userRecord.uid };
  } catch (error: any) {
    console.error("Erro no provisionamento de membro:", error);
    return { 
      success: false, 
      error: error.code === 'auth/email-already-exists' 
        ? "Este e-mail já está cadastrado no sistema." 
        : error.message 
    };
  }
}

export async function excluirUsuario(email: string) {
  try {
    const emailLower = email.toLowerCase().trim();
    const userRef = adminDb.collection("users").doc(emailLower);
    const userDoc = await userRef.get();
    
    if (userDoc.exists) {
      const userData = userDoc.data();
      if (userData?.uid) {
        try {
          await adminAuth.deleteUser(userData.uid);
        } catch (authError: any) {
          console.warn("Usuário não encontrado no Auth:", authError.message);
        }
      }
    }

    await userRef.delete();
    revalidatePath("/usuarios");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
