
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
  id: string;
  uid?: string;
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
  prazo: string;
  dataCriacao: Timestamp;
  dataAtualizacao: Timestamp;
  finalizada: boolean;
  prioridade: DemandPriority;
  anexos?: Attachment[];
  liderancaId?: string;
}

export interface Leader {
  id: string;
  nome: string;
  bairro: string;
  contato: string;
  potencialVotos: number;
  influencia: "BAIXA" | "MEDIA" | "ALTA";
  status: "ATIVO" | "PROSPECTO" | "INATIVO";
  dataCriacao?: Timestamp;
}

export interface Territory {
  id: string;
  bairro: string;
  metaVotos: number;
  votosAtuais: number;
}

export interface Tramite {
  id: string;
  demandaId: string;
  de: string;
  para: string;
  acao: "ENVIO" | "DEVOLUCAO" | "FINALIZACAO" | "REABERTURA";
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

export interface GlobalConfig {
  metaVotos2026: number;
}
