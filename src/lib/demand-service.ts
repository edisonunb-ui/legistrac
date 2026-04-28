import { 
  collection, 
  doc, 
  serverTimestamp, 
  runTransaction,
  getDoc,
  Firestore
} from "firebase/firestore";
import { DemandPriority, DemandStatus, UserRole } from "./types";

export async function createDemand(
  db: Firestore,
  userId: string,
  data: { titulo: string; descricao: string; prazo: string; prioridade: DemandPriority }
) {
  const demandRef = doc(collection(db, "demandas"));
  const tramiteRef = doc(collection(db, "tramites"));

  const demandData = {
    ...data,
    criadoPor: userId,
    responsavelAtual: userId,
    status: "ABERTO" as DemandStatus,
    dataCriacao: serverTimestamp(),
    dataAtualizacao: serverTimestamp(),
    finalizada: false,
  };

  await runTransaction(db, async (transaction) => {
    transaction.set(demandRef, demandData);
    transaction.set(tramiteRef, {
      demandaId: demandRef.id,
      de: userId,
      para: userId,
      acao: "ENVIO",
      observacao: "Demanda criada e atribuída ao criador.",
      data: serverTimestamp(),
    });
  });

  return demandRef.id;
}

export async function sendDemand(
  db: Firestore,
  demandaId: string,
  de: string,
  para: string,
  observacao: string,
  paraRole: UserRole
) {
  const status: DemandStatus = paraRole === "ADMIN" ? "AGUARDANDO_VEREADORA" : "EM_ANDAMENTO";
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
      observacao,
      data: serverTimestamp(),
    });

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
      observacao,
      data: serverTimestamp(),
    });

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
      mensagem: `Uma demanda foi reaberta e está sob sua responsabilidade: ${demandaId}`,
      demandaId,
      lida: false,
      data: serverTimestamp(),
    });
  });
}
