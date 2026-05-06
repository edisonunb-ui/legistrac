'use server';

import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { revalidatePath } from "next/cache";

/**
 * Server Action para provisionar novos membros da equipe.
 * Cria o usuário no Auth e o perfil no Firestore em uma única operação segura.
 */
export async function provisionarMembro(data: { 
  email: string, 
  nome: string, 
  perfil: string, 
  permissoes: any 
}) {
  try {
    const emailLower = data.email.toLowerCase().trim();

    // 1. Cria a conta no Firebase Authentication com senha padrão
    const userRecord = await adminAuth.createUser({
      email: emailLower,
      password: "Mudar@123", // Senha temporária padrão para primeiro acesso
      displayName: data.nome,
    });

    // 2. Cria o perfil detalhado no Firestore usando o email como chave
    const userProfile = {
      uid: userRecord.uid,
      nome: data.nome,
      email: emailLower,
      perfil: data.perfil,
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

/**
 * Server Action para excluir permanentemente um usuário.
 * Remove do Firebase Auth e do Firestore.
 */
export async function excluirUsuario(email: string) {
  try {
    const emailLower = email.toLowerCase().trim();
    
    // 1. Busca o perfil para obter o UID
    const userRef = adminDb.collection("users").doc(emailLower);
    const userDoc = await userRef.get();
    
    if (userDoc.exists) {
      const userData = userDoc.data();
      if (userData?.uid) {
        // 2. Remove do Firebase Auth
        try {
          await adminAuth.deleteUser(userData.uid);
        } catch (authError: any) {
          console.warn("Usuário não encontrado no Auth, prosseguindo com exclusão do Firestore:", authError.message);
        }
      }
    }

    // 3. Remove do Firestore
    await userRef.delete();

    revalidatePath("/usuarios");
    return { success: true };
  } catch (error: any) {
    console.error("Erro ao excluir usuário:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Server Action para alternar o status de um usuário.
 */
export async function alternarStatusUsuario(email: string, novoStatus: boolean) {
  try {
    await adminDb.collection("users").doc(email.toLowerCase()).update({
      ativo: novoStatus,
      updatedAt: new Date().toISOString(),
    });
    revalidatePath("/usuarios");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
