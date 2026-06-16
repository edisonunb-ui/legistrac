
import { 
  collection, 
  doc, 
  serverTimestamp, 
  runTransaction,
  Firestore,
  getDoc,
  query,
  where,
  getDocs,
  limit
} from "firebase/firestore";
import { DemandPriority, DemandStatus, UserRole, Attachment, DemandType } from "./types";

/**
 * Cria uma nova demanda ou chamado HelpDesk.
 */
export async function createDemand(
  db: Firestore,
  userId: string,
  data: { 
    cabinetId: string;
    titulo: string; 
    descricao: string; 
    prazo: string; 
    prioridade: DemandPriority;
    responsavelId?: string;
    anexos?: Attachment[];
    tipo?: DemandType;
    assuntoPredefinido?: string;
  }
) {
  if (!userId) throw new Error("Usuário não identificado.");
  if (!data.cabinetId) throw new Error("Gabinete não identificado.");
  
  const demandRef = doc(collection(db, "demandas"));
  const tramiteRef = doc(collection(db, "tramites"));
  const targetResponsavel = data.responsavelId || userId;

  // Se for HelpDesk, tentamos achar o gabinete de TI para vincular como destino
  let targetCabinetId = data.cabinetId;
  if (data.tipo === 'HELPDESK') {
    const tiCabinetQuery = query(collection(db, "gabinetes"), where("isTI", "==", true), limit(1));
    const tiSnap = await getDocs(tiCabinetQuery);
    if (!tiSnap.empty) {
      targetCabinetId = tiSnap.docs[0].id;
    }
  }

  const demandData = {
    id: demandRef.id,
    cabinetId: data.cabinetId,
    targetCabinetId: targetCabinetId,
    tipo: data.tipo || "COMUM",
    assuntoPredefinido: data.assuntoPredefinido || "",
    titulo: data.titulo,
    descricao: data.descricao,
    prazo: data.prazo,
    prioridade: data.prioridade,
    criadoPor: userId,
    responsavelAtual: targetResponsavel,
    status: (targetResponsavel === userId ? "ABERTO" : "EM_ANDAMENTO") as DemandStatus,
    dataCriacao: serverTimestamp(),
    dataAtualizacao: serverTimestamp(),
    finalizada: false,
    anexos: data.anexos || [],
    deleted: false
  };

  await runTransaction(db, async (transaction) => {
    transaction.set(demandRef, demandData);
    transaction.set(tramiteRef, {
      demandaId: demandRef.id,
      cabinetId: data.cabinetId,
      de: userId,
      para: targetResponsavel,
      acao: "ENVIO",
      observacao: data.tipo === 'HELPDESK' ? `Chamado de TI aberto: ${data.assuntoPredefinido}` : "Demanda inicial registrada no sistema.",
      data: serverTimestamp(),
      anexos: data.anexos || []
    });
  });

  return demandRef.id;
}

/**
 * Tramita uma demanda para outro colaborador com verificação rigorosa de gabinete.
 */
export async function sendDemand(
  db: Firestore,
  demandaId: string,
  de: string,
  para: string,
  observacao: string,
  paraRole: UserRole,
  anexos: Attachment[] = []
) {
  const isAdmin = paraRole === "ADMIN" || paraRole === "SUPER_ADMIN";
  const status: DemandStatus = isAdmin ? "AGUARDANDO_VEREADORA" : "EM_ANDAMENTO";
  
  const demandRef = doc(db, "demandas", demandaId);
  const tramiteRef = doc(collection(db, "tramites"));
  const notificationRef = doc(collection(db, "notificacoes"));

  await runTransaction(db, async (transaction) => {
    const demandDoc = await transaction.get(demandRef);
    if (!demandDoc.exists()) throw new Error("Demanda não encontrada.");
    
    const demandData = demandDoc.data();
    const cabinetId = demandData.cabinetId;

    // Se não for HelpDesk, validar gabinete. Se for HelpDesk, permitir trâmite com o Gabinete de TI
    if (demandData.tipo !== 'HELPDESK') {
      const usersRef = collection(db, "users");
      const targetUserSnap = await transaction.get(doc(usersRef, para));
      
      if (targetUserSnap.exists()) {
        const targetData = targetUserSnap.data();
        if (targetData.cabinetId !== cabinetId) {
          throw new Error("VIOLAÇÃO DE SEGURANÇA: Tentativa de tramitação entre gabinetes diferentes.");
        }
      }
    }

    transaction.update(demandRef, {
      responsavelAtual: para,
      status: status,
      dataAtualizacao: serverTimestamp(),
      anexos: [...(demandData.anexos || []), ...anexos]
    });

    transaction.set(tramiteRef, {
      demandaId,
      cabinetId: cabinetId,
      de,
      para,
      acao: "ENVIO",
      observacao: observacao || "Demanda encaminhada.",
      data: serverTimestamp(),
      anexos: anexos
    });

    transaction.set(notificationRef, {
      userId: para,
      cabinetId: cabinetId,
      mensagem: `Nova demanda recebida: ${demandData.titulo}`,
      demandaId,
      lida: false,
      data: serverTimestamp(),
    });
  });
}

/**
 * Devolve uma demanda para o remetente original.
 */
export async function returnDemand(
  db: Firestore,
  demandaId: string,
  de: string,
  para: string,
  observacao: string,
  anexos: Attachment[] = []
) {
  const demandRef = doc(db, "demandas", demandaId);
  const tramiteRef = doc(collection(db, "tramites"));
  const notificationRef = doc(collection(db, "notificacoes"));

  await runTransaction(db, async (transaction) => {
    const demandDoc = await transaction.get(demandRef);
    if (!demandDoc.exists()) throw new Error("Demanda não encontrada.");
    
    const demandData = demandDoc.data();
    const cabinetId = demandData.cabinetId;

    transaction.update(demandRef, {
      responsavelAtual: para,
      status: "EM_ANDAMENTO",
      dataAtualizacao: serverTimestamp(),
      anexos: [...(demandData.anexos || []), ...anexos]
    });

    transaction.set(tramiteRef, {
      demandaId,
      cabinetId: cabinetId,
      de,
      para,
      acao: "DEVOLUCAO",
      observacao: observacao || "Demanda devolvida para ajustes.",
      data: serverTimestamp(),
      anexos: anexos
    });

    transaction.set(notificationRef, {
      userId: para,
      cabinetId: cabinetId,
      mensagem: `Demanda devolvida: ${demandData.titulo}`,
      demandaId,
      lida: false,
      data: serverTimestamp(),
    });
  });
}

/**
 * Finaliza permanentemente uma demanda.
 */
export async function finalizeDemand(
  db: Firestore,
  demandaId: string,
  userId: string,
  criadorId: string,
  observacao: string
) {
  const demandRef = doc(db, "demandas", demandaId);
  const tramiteRef = doc(collection(db, "tramites"));

  await runTransaction(db, async (transaction) => {
    const demandDoc = await transaction.get(demandRef);
    if (!demandDoc.exists()) throw new Error("Demanda não encontrada.");
    
    const demandData = demandDoc.data();
    const cabinetId = demandData.cabinetId;

    transaction.update(demandRef, {
      status: "FINALIZADO",
      finalizada: true,
      dataAtualizacao: serverTimestamp(),
    });

    transaction.set(tramiteRef, {
      demandaId: demandaId,
      cabinetId: cabinetId,
      de: userId,
      para: userId,
      acao: "FINALIZACAO",
      observacao,
      data: serverTimestamp(),
    });

    // Removido o disparo de notificação para demandas finalizadas a pedido do usuário
  });
}

/**
 * Reabre uma demanda finalizada.
 */
export async function reopenDemand(
  db: Firestore,
  demandaId: string,
  userId: string,
  responsavelId: string,
  observacao: string
) {
  const demandRef = doc(db, "demandas", demandaId);
  const tramiteRef = doc(collection(db, "tramites"));
  const notificationRef = doc(collection(db, "notificacoes"));

  await runTransaction(db, async (transaction) => {
    const demandDoc = await transaction.get(demandRef);
    if (!demandDoc.exists()) throw new Error("Demanda não encontrada.");
    
    const demandData = demandDoc.data();
    const cabinetId = demandData.cabinetId;

    transaction.update(demandRef, {
      status: "EM_ANDAMENTO",
      finalizada: false,
      dataAtualizacao: serverTimestamp(),
    });

    transaction.set(tramiteRef, {
      demandaId: demandaId,
      cabinetId: cabinetId,
      de: userId,
      para: responsavelId,
      acao: "REABERTURA",
      observacao,
      data: serverTimestamp(),
    });

    transaction.set(notificationRef, {
      userId: responsavelId,
      cabinetId: cabinetId,
      mensagem: `Demanda reaberta: ${demandData.titulo}`,
      demandaId,
      lida: false,
      data: serverTimestamp(),
    });
  });
}
