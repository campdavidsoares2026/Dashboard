// frontend/lib/types.ts
// Tipos das tabelas Supabase usadas pelo dashboard.

export interface Snapshot {
  data: string; // YYYY-MM-DD
  account_id: string;
  nome: string;
  papel: string | null;
  cpee: number;
  eq: number;
  spend: number;
  leads: number;
  impressoes: number;
  alcance: number;
  cliques: number;
  thruplay: number;
  frequencia: number;
  ctr: number;
  cpc: number;
  cpm?: number;
  budget_diario: number | null;
  classificacao: string;
}

export interface MetricaConta {
  account_id: string;
  nome: string;
  papel: string | null;
  cpee: number;
  eq: number;
  classificacao_cpee: "BOM" | "MEDIO" | "RUIM" | "SEM_DADOS";
  spend: number;
  impressoes: number;
  alcance: number;
  frequencia: number;
  ctr: number;
  cpc: number;
  leads: number;
  cpl: number;
  budget_atual: number | null;
  budget_recomendado: number | null;
  executado_em: string;
}

export interface Criativo {
  ad_id: string;
  account_id: string;
  conta_nome: string;
  ad_nome: string;
  pauta: string; // "VID" | "EST" | "CAR"
  thumbnail_url: string | null;
  cpee: number;
  eq: number;
  spend: number;
  impressoes: number;
  alcance: number;
  ctr: number;
  cpc: number;
  leads: number;
  cpl: number;
  cpee_7d: number;
  cpee_30d: number;
  spend_7d: number;
  spend_30d: number;
  classificacao: "QUENTE" | "MORNO" | "FRIO";
}

export interface Cluster {
  adset_id: string;
  account_id: string;
  conta_nome: string;
  cluster_nome: string;
  cluster_num: number;
  pauta: string;
  cpee: number;
  eq: number;
  spend: number;
  impressoes: number;
  alcance: number;
  ctr: number;
  cpc: number;
  leads: number;
  cpee_7d: number;
  cpee_30d: number;
  spend_7d: number;
  spend_30d: number;
  classificacao: "QUENTE" | "MORNO" | "FRIO";
}

export interface Recomendacao {
  id: number;
  account_id: string;
  nome: string;
  tipo: string;
  severidade: "alta" | "media" | "baixa";
  titulo: string;
  descricao: string;
  motivo: string;
  aprovada: boolean;
  executada: boolean;
  executado_em: string;
}

export type Period = { start: string; end: string };

export interface DemografiaCell {
  account_id: string;
  conta_nome: string;
  age: string;              // "18-24", "25-34", ..., "65+"
  gender: "male" | "female" | "unknown";
  periodo: string;
  data_inicio: string;
  data_fim: string;
  spend: number;
  impressoes: number;
  alcance: number;
  cliques: number;
  leads: number;
  eq: number;
  cpee: number;
  ctr: number;
  cpc: number;
}

export interface HorarioCell {
  account_id: string;
  conta_nome: string;
  hora: string;             // "00:00:00 - 00:59:59"
  hora_int: number;         // 0-23
  periodo: string;
  data_inicio: string;
  data_fim: string;
  spend: number;
  impressoes: number;
  alcance: number;
  cliques: number;
  leads: number;
  eq: number;
  cpee: number;
  ctr: number;
  cpc: number;
}
