
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

    // Tentar encontrar usuário existente (pode ter sido soft-deleted anteriormente)
    const userRef = adminDb.collection("users").doc(emailLower);
    const existingUser = await userRef.get();

    if (existingUser.exists && existingUser.data()?.deleted === false) {
      return { success: false, error: "Este e-mail já está cadastrado e ativo." };
    }

    let uid = "";
    try {
      const userRecord = await adminAuth.createUser({
        email: emailLower,
        password: "Mudar@123",
        displayName: data.nome,
      });
      uid = userRecord.uid;
    } catch (authError: any) {
      if (authError.code === 'auth/email-already-exists') {
        const userInAuth = await adminAuth.getUserByEmail(emailLower);
        uid = userInAuth.uid;
      } else {
        throw authError;
      }
    }

    const userProfile = {
      uid: uid,
      nome: data.nome,
      email: emailLower,
      perfil: data.perfil,
      cabinetId: data.cabinetId,
      permissoes: data.permissoes,
      ativo: true,
      deleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await userRef.set(userProfile, { merge: true });

    revalidatePath("/usuarios");
    return { success: true, uid: uid };
  } catch (error: any) {
    console.error("Erro no provisionamento de membro:", error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

export async function excluirUsuario(email: string, requesterEmail: string) {
  try {
    const emailLower = email.toLowerCase().trim();
    const isMaster = requesterEmail.toLowerCase().trim() === "edisonunb@gmail.com";
    
    const userRef = adminDb.collection("users").doc(emailLower);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) return { success: false, error: "Usuário não encontrado." };
    
    const userData = userDoc.data();
    const cabinetId = userData?.cabinetId;
    const userId = userData?.uid;

    if (isMaster) {
      // SuperAdmin faz exclusão física
      if (userId) {
        try {
          await adminAuth.deleteUser(userId);
        } catch (authError: any) {
          console.warn("Usuário não no Auth:", authError.message);
        }
      }
      await userRef.delete();
    } else {
      // Outros fazem exclusão lógica
      await userRef.update({
        ativo: false,
        deleted: true,
        deletedAt: new Date().toISOString()
      });

      // REATRIBUIÇÃO AUTOMÁTICA DE DEMANDAS
      // Busca o Vereador/Admin do gabinete para herdar as demandas
      const adminQuery = await adminDb.collection("users")
        .where("cabinetId", "==", cabinetId)
        .where("perfil", "==", "ADMIN")
        .where("deleted", "==", false)
        .limit(1)
        .get();

      let targetId = requesterEmail; // Fallback para quem excluiu
      if (!adminQuery.empty) {
        targetId = adminQuery.docs[0].data().uid || adminQuery.docs[0].id;
      }

      // Busca todas as demandas ativas onde o excluído era o responsável
      const batch = adminDb.batch();
      const demandsToReassign = await adminDb.collection("demandas")
        .where("responsavelAtual", "==", userId)
        .where("status", "!=", "FINALIZADO")
        .get();

      demandsToReassign.forEach(doc => {
        batch.update(doc.ref, {
          responsavelAtual: targetId,
          dataAtualizacao: new Date().toISOString()
        });

        // Registra trâmite de reatribuição forçada
        const tramiteRef = adminDb.collection("tramites").doc();
        batch.set(tramiteRef, {
          demandaId: doc.id,
          cabinetId: cabinetId,
          de: userId,
          para: targetId,
          acao: "ENVIO",
          observacao: "Reatribuição automática devido à desativação do assessor anterior.",
          data: new Date()
        });
      });

      await batch.commit();
    }

    revalidatePath("/usuarios");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
