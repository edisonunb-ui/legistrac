import { Timestamp } from "firebase/firestore";

export type UserRole = "ADMIN" | "ASSESSOR";

export interface UserProfile {
  uid: string;
  nome: string;
  email: string;
  perfil: UserRole;
  ativo: boolean;
  createdAt: Timestamp;
}

export type DemandStatus = "ABERTO" | "EM_ANDAMENTO" | "AGUARDANDO_VEREADORA" | "FINALIZADO";
export type DemandPriority = "BAIXA" | "MEDIA" | "ALTA";

export interface Demand {
  id: string;
  titulo: string;
  descricao: string;
  criadoPor: string;
  responsavelAtual: string;
  status: DemandStatus;
  prazo: string; // ISO date string
  dataCriacao: Timestamp;
  dataAtualizacao: Timestamp;
  finalizada: boolean;
  prioridade: DemandPriority;
}

export type TramiteAction = "ENVIO" | "DEVOLUCAO" | "FINALIZACAO" | "REABERTURA";

export interface Tramite {
  id: string;
  demandaId: string;
  de: string;
  para: string;
  acao: TramiteAction;
  observacao: string;
  data: Timestamp;
}

export interface Notification {
  id: string;
  userId: string;
  mensagem: string;
  demandaId: string;
  lida: boolean;
  data: Timestamp;
}
