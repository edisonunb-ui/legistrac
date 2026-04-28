import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  serverTimestamp, 
  runTransaction,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  Timestamp,
  getDoc
} from "firebase/firestore";
import { db } from "./firebase";
import { Demand, DemandPriority, DemandStatus, TramiteAction, UserRole } from "./types";

export async function createDemand(
  userId: string,
  data: { titulo: string; descricao: string; prazo: string; prioridade: DemandPriority }
) {
  const demandData = {
    ...data,
    criadoPor: userId,
    responsavelAtual: userId,
    status: "ABERTO" as DemandStatus,
    dataCriacao: serverTimestamp(),
    dataAtualizacao: serverTimestamp(),
    finalizada: false,
  };

  return await runTransaction(db, async (transaction) => {
    const demandRef = doc(collection(db, "demandas"));
    transaction.set(demandRef, demandData);

    const tramiteRef = doc(collection(db, "tramites"));
    transaction.set(tramiteRef, {
      demandaId: demandRef.id,
      de: userId,
      para: userId,
      acao: "ENVIO",
      observacao: "Demanda criada e atribuída ao criador.",
      data: serverTimestamp(),
    });

    return demandRef.id;
  });
}

export async function sendDemand(
  demandaId: string,
  de: string,
  para: string,
  observacao: string,
  paraRole: UserRole
) {
  const status: DemandStatus = paraRole === "ADMIN" ? "AGUARDANDO_VEREADORA" : "EM_ANDAMENTO";

  await runTransaction(db, async (transaction) => {
    const demandRef = doc(db, "demandas", demandaId);
    transaction.update(demandRef, {
      responsavelAtual: para,
      status: status,
      dataAtualizacao: serverTimestamp(),
    });

    const tramiteRef = doc(collection(db, "tramites"));
    transaction.set(tramiteRef, {
      demandaId,
      de,
      para,
      acao: "ENVIO",
      observacao,
      data: serverTimestamp(),
    });

    const notificationRef = doc(collection(db, "notificacoes"));
    transaction.set(notificationRef, {
      userId: para,
      mensagem: `Você recebeu uma nova demanda: ${demandaId}`,
      demandaId,
      lida: false,
      data: serverTimestamp(),
    });
  });
}

export async function returnDemand(
  demandaId: string,
  de: string,
  para: string,
  observacao: string
) {
  await runTransaction(db, async (transaction) => {
    const demandRef = doc(db, "demandas", demandaId);
    transaction.update(demandRef, {
      responsavelAtual: para,
      status: "EM_ANDAMENTO",
      dataAtualizacao: serverTimestamp(),
    });

    const tramiteRef = doc(collection(db, "tramites"));
    transaction.set(tramiteRef, {
      demandaId,
      de,
      para,
      acao: "DEVOLUCAO",
      observacao,
      data: serverTimestamp(),
    });

    const notificationRef = doc(collection(db, "notificacoes"));
    transaction.set(notificationRef, {
      userId: para,
      mensagem: `Uma demanda foi devolvida para você: ${demandaId}`,
      demandaId,
      lida: false,
      data: serverTimestamp(),
    });
  });
}

export async function finalizeDemand(
  demandaId: string,
  userId: string,
  criadorId: string,
  observacao: string
) {
  await runTransaction(db, async (transaction) => {
    const demandRef = doc(db, "demandas", demandaId);
    transaction.update(demandRef, {
      status: "FINALIZADO",
      finalizada: true,
      dataAtualizacao: serverTimestamp(),
    });

    const tramiteRef = doc(collection(db, "tramites"));
    transaction.set(tramiteRef, {
      demandaId,
      de: userId,
      para: userId,
      acao: "FINALIZACAO",
      observacao,
      data: serverTimestamp(),
    });

    const notificationRef = doc(collection(db, "notificacoes"));
    transaction.set(notificationRef, {
      userId: criadorId,
      mensagem: `Sua demanda foi finalizada: ${demandaId}`,
      demandaId,
      lida: false,
      data: serverTimestamp(),
    });
  });
}

export async function reopenDemand(
  demandaId: string,
  userId: string,
  responsavelId: string,
  observacao: string
) {
  await runTransaction(db, async (transaction) => {
    const demandRef = doc(db, "demandas", demandaId);
    transaction.update(demandRef, {
      status: "EM_ANDAMENTO",
      finalizada: false,
      dataAtualizacao: serverTimestamp(),
    });

    const tramiteRef = doc(collection(db, "tramites"));
    transaction.set(tramiteRef, {
      demandaId,
      de: userId,
      para: responsavelId,
      acao: "REABERTURA",
      observacao,
      data: serverTimestamp(),
    });

    const notificationRef = doc(collection(db, "notificacoes"));
    transaction.set(notificationRef, {
      userId: responsavelId,
      mensagem: `Uma demanda foi reaberta e está sob sua responsabilidade: ${demandaId}`,
      demandaId,
      lida: false,
      data: serverTimestamp(),
    });
  });
}