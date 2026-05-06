import { 
  collection, 
  doc, 
  serverTimestamp, 
  runTransaction,
  Firestore
} from "firebase/firestore";
import { DemandPriority, DemandStatus, UserRole } from "./types";

/**
 * Cria uma nova demanda e registra o trâmite inicial.
 */
export async function createDemand(
  db: Firestore,
  userId: string,
  data: { 
    titulo: string; 
    descricao: string; 
    prazo: string; 
    prioridade: DemandPriority;
    responsavelId?: string;
  }
) {
  if (!userId) throw new Error("Usuário não identificado.");
  
  const demandRef = doc(collection(db, "demandas"));
  const tramiteRef = doc(collection(db, "tramites"));
  const targetResponsavel = data.responsavelId || userId;

  const demandData = {
    id: demandRef.id,
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
  };

  await runTransaction(db, async (transaction) => {
    transaction.set(demandRef, demandData);
    transaction.set(tramiteRef, {
      demandaId: demandRef.id,
      de: userId,
      para: targetResponsavel,
      acao: "ENVIO",
      observacao: "Demanda inicial registrada no sistema.",
      data: serverTimestamp(),
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
  paraRole: UserRole
) {
  // Se for enviado para ADMIN ou SUPER_ADMIN, o status muda para AGUARDANDO_VEREADORA
  const isAdmin = paraRole === "ADMIN" || paraRole === "SUPER_ADMIN";
  const status: DemandStatus = isAdmin ? "AGUARDANDO_VEREADORA" : "EM_ANDAMENTO";
  
  const demandRef = doc(db, "demandas", demandaId);
  const tramiteRef = doc(collection(db, "tramites"));
  const notificationRef = doc(collection(db, "notificacoes"));

  await runTransaction(db, async (transaction) => {
    transaction.update(demandRef, {
      responsavelAtual: para,
      status: status,
      dataAtualizacao: serverTimestamp(),
    });

    transaction.set(tramiteRef, {
      demandaId,
      de,
      para,
      acao: "ENVIO",
      observacao: observacao || "Demanda encaminhada.",
      data: serverTimestamp(),
    });

    transaction.set(notificationRef, {
      userId: para,
      mensagem: `Você recebeu uma nova demanda para análise.`,
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
  observacao: string
) {
  const demandRef = doc(db, "demandas", demandaId);
  const tramiteRef = doc(collection(db, "tramites"));
  const notificationRef = doc(collection(db, "notificacoes"));

  await runTransaction(db, async (transaction) => {
    transaction.update(demandRef, {
      responsavelAtual: para,
      status: "EM_ANDAMENTO",
      dataAtualizacao: serverTimestamp(),
    });

    transaction.set(tramiteRef, {
      demandaId,
      de,
      para,
      acao: "DEVOLUCAO",
      observacao: observacao || "Demanda devolvida para ajustes.",
      data: serverTimestamp(),
    });

    transaction.set(notificationRef, {
      userId: para,
      mensagem: `Uma demanda foi devolvida para você.`,
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
    transaction.update(demandRef, {
      status: "FINALIZADO",
      finalizada: true,
      dataAtualizacao: serverTimestamp(),
    });

    transaction.set(tramiteRef, {
      demandaId,
      de: userId,
      para: userId,
      acao: "FINALIZACAO",
      observacao,
      data: serverTimestamp(),
    });

    // Notifica o criador original
    transaction.set(notificationRef, {
      userId: criadorId,
      mensagem: `Sua demanda foi finalizada com sucesso.`,
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
    transaction.update(demandRef, {
      status: "EM_ANDAMENTO",
      finalizada: false,
      dataAtualizacao: serverTimestamp(),
    });

    transaction.set(tramiteRef, {
      demandaId,
      de: userId,
      para: responsavelId,
      acao: "REABERTURA",
      observacao,
      data: serverTimestamp(),
    });

    transaction.set(notificationRef, {
      userId: responsavelId,
      mensagem: `Uma demanda foi reaberta para novos ajustes.`,
      demandaId,
      lida: false,
      data: serverTimestamp(),
    });
  });
}