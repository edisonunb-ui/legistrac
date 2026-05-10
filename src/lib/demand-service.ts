
import { 
  collection, 
  doc, 
  serverTimestamp, 
  runTransaction,
  Firestore
} from "firebase/firestore";
import { DemandPriority, DemandStatus, UserRole, Attachment } from "./types";

/**
 * Cria uma nova demanda e registra o trâmite inicial.
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
  }
) {
  if (!userId) throw new Error("Usuário não identificado.");
  if (!data.cabinetId) throw new Error("Gabinete não identificado.");
  
  const demandRef = doc(collection(db, "demandas"));
  const tramiteRef = doc(collection(db, "tramites"));
  const targetResponsavel = data.responsavelId || userId;

  const demandData = {
    id: demandRef.id,
    cabinetId: data.cabinetId,
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
    anexos: data.anexos || []
  };

  await runTransaction(db, async (transaction) => {
    transaction.set(demandRef, demandData);
    transaction.set(tramiteRef, {
      demandaId: demandRef.id,
      cabinetId: data.cabinetId,
      de: userId,
      para: targetResponsavel,
      acao: "ENVIO",
      observacao: "Demanda inicial registrada no sistema.",
      data: serverTimestamp(),
      anexos: data.anexos || []
    });
  });

  return demandRef.id;
}

/**
 * Tramita uma demanda para outro colaborador.
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
    const demandTitle = demandDoc.data()?.titulo || "Demanda";
    const existingAnexos = demandDoc.data()?.anexos || [];
    const cabinetId = demandDoc.data()?.cabinetId;

    transaction.update(demandRef, {
      responsavelAtual: para,
      status: status,
      dataAtualizacao: serverTimestamp(),
      anexos: [...existingAnexos, ...anexos]
    });

    transaction.set(tramiteRef, {
      demandaId,
      cabinetId: cabinetId || null,
      de,
      para,
      acao: "ENVIO",
      observacao: observacao || "Demanda encaminhada.",
      data: serverTimestamp(),
      anexos: anexos
    });

    transaction.set(notificationRef, {
      userId: para,
      cabinetId: cabinetId || null,
      mensagem: `Nova demanda recebida: ${demandTitle}`,
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
    const demandTitle = demandDoc.data()?.titulo || "Demanda";
    const existingAnexos = demandDoc.data()?.anexos || [];
    const cabinetId = demandDoc.data()?.cabinetId;

    transaction.update(demandRef, {
      responsavelAtual: para,
      status: "EM_ANDAMENTO",
      dataAtualizacao: serverTimestamp(),
      anexos: [...existingAnexos, ...anexos]
    });

    transaction.set(tramiteRef, {
      demandaId,
      cabinetId: cabinetId || null,
      de,
      para,
      acao: "DEVOLUCAO",
      observacao: observacao || "Demanda devolvida para ajustes.",
      data: serverTimestamp(),
      anexos: anexos
    });

    transaction.set(notificationRef, {
      userId: para,
      cabinetId: cabinetId || null,
      mensagem: `Demanda devolvida: ${demandTitle}`,
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
  const notificationRef = doc(collection(db, "notificacoes"));

  await runTransaction(db, async (transaction) => {
    const demandDoc = await transaction.get(demandRef);
    const demandTitle = demandDoc.data()?.titulo || "Demanda";
    const cabinetId = demandDoc.data()?.cabinetId;

    transaction.update(demandRef, {
      status: "FINALIZADO",
      finalizada: true,
      dataAtualizacao: serverTimestamp(),
    });

    transaction.set(tramiteRef, {
      demandaId,
      cabinetId: cabinetId || null,
      de: userId,
      para: userId,
      acao: "FINALIZACAO",
      observacao,
      data: serverTimestamp(),
    });

    transaction.set(notificationRef, {
      userId: criadorId,
      cabinetId: cabinetId || null,
      mensagem: `Demanda finalizada: ${demandTitle}`,
      demandaId,
      lida: false,
      data: serverTimestamp(),
    });
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
    const demandTitle = demandDoc.data()?.titulo || "Demanda";
    const cabinetId = demandDoc.data()?.cabinetId;

    transaction.update(demandRef, {
      status: "EM_ANDAMENTO",
      finalizada: false,
      dataAtualizacao: serverTimestamp(),
    });

    transaction.set(tramiteRef, {
      demandaId,
      cabinetId: cabinetId || null,
      de: userId,
      para: responsavelId,
      acao: "REABERTURA",
      observacao,
      data: serverTimestamp(),
    });

    transaction.set(notificationRef, {
      userId: responsavelId,
      cabinetId: cabinetId || null,
      mensagem: `Demanda reaberta: ${demandTitle}`,
      demandaId,
      lida: false,
      data: serverTimestamp(),
    });
  });
}
