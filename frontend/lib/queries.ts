// frontend/lib/queries.ts
// TanStack Query hooks pointing directly at Supabase REST.
"use client";

import { useQuery } from "@tanstack/react-query";
import { sb } from "./supabase";
import type {
  Snapshot,
  MetricaConta,
  Criativo,
  Cluster,
  Recomendacao,
  DemografiaCell,
  HorarioCell,
} from "./types";

const STALE = 1000 * 60 * 2; // 2min
const REFRESH = 1000 * 60 * 5; // 5min

/** DISTINCT account_ids that have ever appeared in metricas_conta. */
export function useAccounts() {
  return useQuery<string[]>({
    queryKey: ["accounts"],
    queryFn: async () => {
      const rows = await sb<{ account_id: string }[]>(
        "metricas_conta?select=account_id&order=account_id.asc"
      );
      return [...new Set(rows.map((r) => r.account_id))].filter(Boolean);
    },
    staleTime: STALE,
    refetchInterval: REFRESH,
  });
}

/** Latest metricas_conta row per account (table already keeps only current state). */
export function useMetricasConta() {
  return useQuery<MetricaConta[]>({
    queryKey: ["metricas_conta"],
    queryFn: () =>
      sb<MetricaConta[]>("metricas_conta?select=*&order=executado_em.desc"),
    staleTime: STALE,
    refetchInterval: REFRESH,
  });
}

/** Snapshots in a date range, optionally filtered by accounts. */
export function useSnapshots(opts: {
  start: string;
  end: string;
  accounts?: string[];
}) {
  return useQuery<Snapshot[]>({
    queryKey: ["snapshots", opts],
    queryFn: () => {
      const parts = [
        `select=*`,
        `data=gte.${opts.start}`,
        `data=lte.${opts.end}`,
        `order=data.asc`,
      ];
      if (opts.accounts && opts.accounts.length > 0) {
        parts.push(
          `account_id=in.(${opts.accounts.map(encodeURIComponent).join(",")})`
        );
      }
      return sb<Snapshot[]>(`snapshots_diarios?${parts.join("&")}`);
    },
    staleTime: STALE,
    refetchInterval: REFRESH,
  });
}

/** Criativos with at least minSpend, ordered by spend desc. */
export function useCriativos(
  opts: { minSpend?: number; limit?: number } = {}
) {
  const { minSpend = 50, limit = 50 } = opts;
  return useQuery<Criativo[]>({
    queryKey: ["criativos", { minSpend, limit }],
    queryFn: () =>
      sb<Criativo[]>(
        `criativos_performance?select=*&spend=gte.${minSpend}&order=spend.desc&limit=${limit}`
      ),
    staleTime: STALE,
    refetchInterval: REFRESH,
  });
}

/** Clusters ordered by spend, filtered by minSpend + accounts. */
export function useClusters(
  opts: { accounts?: string[]; minSpend?: number; limit?: number } = {}
) {
  const { accounts, minSpend = 50, limit = 100 } = opts;
  return useQuery<Cluster[]>({
    queryKey: ["clusters", opts],
    queryFn: () => {
      const parts = [
        `select=*`,
        `spend=gte.${minSpend}`,
        `order=spend.desc`,
        `limit=${limit}`,
      ];
      if (accounts && accounts.length > 0) {
        parts.push(
          `account_id=in.(${accounts.map(encodeURIComponent).join(",")})`
        );
      }
      return sb<Cluster[]>(`clusters_performance?${parts.join("&")}`);
    },
    staleTime: STALE,
    refetchInterval: REFRESH,
  });
}

/** Most recent recomendacoes (history). */
export function useRecomendacoes(limit = 30) {
  return useQuery<Recomendacao[]>({
    queryKey: ["recomendacoes", limit],
    queryFn: () =>
      sb<Recomendacao[]>(
        `recomendacoes?select=*&order=executado_em.desc.nullslast&limit=${limit}`
      ),
    staleTime: STALE,
    refetchInterval: REFRESH,
  });
}

/** Breakdown demográfico (age × gender) por conta, periodo "30d" default. */
export function useDemografia(opts: { periodo?: string; accounts?: string[] } = {}) {
  const { periodo = "30d", accounts } = opts;
  return useQuery<DemografiaCell[]>({
    queryKey: ["demografia", { periodo, accounts }],
    queryFn: () => {
      const parts = [`select=*`, `periodo=eq.${periodo}`, `order=spend.desc`];
      if (accounts && accounts.length > 0) {
        parts.push(`account_id=in.(${accounts.map(encodeURIComponent).join(",")})`);
      }
      return sb<DemografiaCell[]>(`demografia_performance?${parts.join("&")}`);
    },
    staleTime: STALE,
    refetchInterval: REFRESH,
  });
}

/** Breakdown horário (0-23h) por conta, periodo "30d" default. */
export function useHorarios(opts: { periodo?: string; accounts?: string[] } = {}) {
  const { periodo = "30d", accounts } = opts;
  return useQuery<HorarioCell[]>({
    queryKey: ["horarios", { periodo, accounts }],
    queryFn: () => {
      const parts = [`select=*`, `periodo=eq.${periodo}`, `order=hora_int.asc`];
      if (accounts && accounts.length > 0) {
        parts.push(`account_id=in.(${accounts.map(encodeURIComponent).join(",")})`);
      }
      return sb<HorarioCell[]>(`horarios_performance?${parts.join("&")}`);
    },
    staleTime: STALE,
    refetchInterval: REFRESH,
  });
}
