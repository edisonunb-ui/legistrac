import { Timestamp } from "firebase/firestore";

export type UserRole = "SUPER_ADMIN" | "ADMIN" | "ASSESSOR" | "ESTAGIARIO";

export interface UserPermissions {
  visualizar_todas: boolean;
  criar_demandas: boolean;
  finalizar_demandas: boolean;
  gerenciar_equipe: boolean;
  reabrir_demandas: boolean;
}

export interface Attachment {
  id: string;
  nome: string;
  url: string;
  tipo: string;
  tamanho: number;
  data: Timestamp;
  enviadoPor: string;
}

export interface UserProfile {
  id: string; // Document ID
  uid?: string; // Firebase Auth UID (populated after first login)
  nome: string;
  email: string;
  perfil: UserRole;
  ativo: boolean;
  createdAt: Timestamp;
  permissoes: UserPermissions;
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
  anexos?: Attachment[];
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
  anexos?: Attachment[];
}

export interface Notification {
  id: string;
  userId: string;
  mensagem: string;
  demandaId: string;
  lida: boolean;
  data: Timestamp;
}
