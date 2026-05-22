
import { Timestamp } from "firebase/firestore";

export type UserRole = "SUPER_ADMIN" | "ADMIN" | "ASSESSOR" | "ESTAGIARIO";

export interface UserPermissions {
  visualizar_todas: boolean;
  criar_demandas: boolean;
  finalizar_demandas: boolean;
  gerenciar_equipe: boolean;
  reabrir_demandas: boolean;
}

export interface Cabinet {
  id: string;
  nome: string;
  vereador: string;
  ativo: boolean;
  createdAt: Timestamp;
  carimboUrl?: string;
  updatedAt?: Timestamp;
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
  cabinetId: string;
  ativo: boolean;
  deleted?: boolean;
  deletedAt?: string;
  createdAt: Timestamp;
  permissoes: UserPermissions;
}

export type DemandStatus = "ABERTO" | "EM_ANDAMENTO" | "AGUARDANDO_VEREADORA" | "FINALIZADO";
export type DemandPriority = "BAIXA" | "MEDIA" | "ALTA";

export interface Demand {
  id: string;
  cabinetId: string;
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
  atendimentoId?: string;
  deleted?: boolean;
  deletedAt?: string;
}

export interface CitizenService {
  id: string;
  cabinetId: string;
  municipeNome: string;
  municipeEndereco: string;
  municipeTituloEleitoral: string;
  municipeTelefone: string;
  descricaoSolicitacao: string;
  dataAtendimento: Timestamp;
  atendidoPor: string;
  demandaId?: string;
  deleted?: boolean;
  deletedAt?: string;
}

export interface Leader {
  id: string;
  cabinetId: string;
  nome: string;
  bairro: string;
  contato: string;
  potencialVotos: number;
  influencia: "BAIXA" | "MEDIA" | "ALTA";
  status: "ATIVO" | "PROSPECTO" | "INATIVO";
  dataCriacao?: Timestamp;
  deleted?: boolean;
}

export interface LegislativeAction {
  id: string;
  cabinetId: string;
  tipo: "INDICACAO" | "PROJETO_LEI" | "REQUERIMENTO" | "MOCAO";
  numero?: string;
  ano: number;
  titulo: string;
  ementa: string;
  conteudo: string;
  status: "ELABORACAO" | "PROTOCOLADO" | "APROVADO" | "REJEITADO";
  linkOficial?: string;
  dataProtocolo?: Timestamp;
  demandaOrigemId?: string;
  deleted?: boolean;
  anexos?: Attachment[];
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
  cabinetId?: string;
  developerLogoUrl?: string;
  developerName?: string;
}
