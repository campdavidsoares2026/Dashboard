import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface KPICard {
  label: string;
  value: number;
  unit: string;
  trend?: number;
  trend_direction?: "up" | "down";
  metadata?: string;
}

export interface Alert {
  id: string;
  cluster: string;
  type: "warning" | "success" | "info";
  title: string;
  reason: string;
  actions: Array<{ label: string; action: string }>;
  sentiment?: string;
}

export interface ClusterComparison {
  cluster: string;
  cpee: number;
  eem: number;
  gasto: number;
  ctr: number;
  top_demog: string;
  melhor_hora: string;
}

export interface ComparacaoData {
  clusters: ClusterComparison[];
  trend: Array<{ date: string; [key: string]: string | number }>;
}

export interface OverviewData {
  kpis: KPICard[];
  alerts: Alert[];
  recommendations: Alert[];
  cpee_trend: Array<{ date: string; value: number }>;
  budget_breakdown: Array<{ name: string; value: number }>;
  top_clusters: Array<{ cluster: string; eem: number; cpee: number; gasto: number }>;
}

// Overview query hook with filtering support
export function useOverview(filters?: {
  accounts?: string[];
  startDate?: string;
  endDate?: string;
}) {
  return useQuery<OverviewData>({
    queryKey: ["overview", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.accounts?.length) {
        params.append("accounts", filters.accounts.join(","));
      }
      if (filters?.startDate) {
        params.append("start_date", filters.startDate);
      }
      if (filters?.endDate) {
        params.append("end_date", filters.endDate);
      }

      const url = `${API_BASE_URL}/api/overview${params.toString() ? "?" + params.toString() : ""}`;
      const response = await axios.get(url);
      return response.data;
    },
  });
}

// Comparacao query hook
export function useComparacao(clusters: string[]) {
  return useQuery<ComparacaoData>({
    queryKey: ["comparacao", clusters],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/clusters/comparacao`, {
        params: { clusters: clusters.join(",") },
      });
      return response.data;
    },
    enabled: clusters.length > 0,
  });
}

// Campaignas por conta
export function useCampanhasPorConta() {
  return useQuery({
    queryKey: ["campanhas"],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/campanhas-por-conta`);
      return response.data;
    },
  });
}

// Predictions
export function usePrevisoes(periodo: string = "7d") {
  return useQuery({
    queryKey: ["previsoes", periodo],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/previsoes`, {
        params: { periodo },
      });
      return response.data;
    },
  });
}

// Get available accounts
export function useAvailableAccounts() {
  return useQuery<string[]>({
    queryKey: ["accounts"],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/accounts`);
      return response.data.accounts || [];
    },
  });
}

// Get dashboard data for export
export interface DashboardExportData {
  accounts: string[];
  snapshots: Array<{
    data: string;
    account_id: string;
    spend: number;
    impressoes: number;
    cliques: number;
    leads: number;
    ctr: number;
    cpc: number;
    cpm: number;
    cpl: number;
    cpee: number;
  }>;
  creatives: Array<{
    id: string;
    nome: string;
    account_id: string;
    spend: number;
    leads: number;
    cpee: number;
    ctr: number;
  }>;
  clusters: Array<{
    id: string;
    nome: string;
    account_id: string;
    spend: number;
    leads: number;
    cpee: number;
  }>;
}

export function useDashboardExport(filters?: {
  accounts?: string[];
  startDate?: string;
  endDate?: string;
}) {
  return useQuery<DashboardExportData>({
    queryKey: ["dashboard-export", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.accounts?.length) {
        params.append("accounts", filters.accounts.join(","));
      }
      if (filters?.startDate) {
        params.append("start_date", filters.startDate);
      }
      if (filters?.endDate) {
        params.append("end_date", filters.endDate);
      }

      const url = `${API_BASE_URL}/api/dashboard/export${params.toString() ? "?" + params.toString() : ""}`;
      const response = await axios.get(url);
      return response.data;
    },
  });
}
