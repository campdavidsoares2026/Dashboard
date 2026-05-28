"use client";

import { useMemo, useState } from "react";
import {
  useAccounts,
  useClusters,
  useCriativos,
  useMetricasConta,
  useRecomendacoes,
  useSnapshots,
} from "@/lib/queries";
import ClusterSelector from "./components/ClusterSelector";
import ComparisonTable from "./components/ComparisonTable";
import CampaignsByAccount from "./components/CampaignsByAccount";
import RecommendationHistory from "./components/RecommendationHistory";
import ExportButtons from "./components/ExportButtons";

const today = new Date().toISOString().slice(0, 10);
const monthAgo = new Date(Date.now() - 30 * 86400000)
  .toISOString()
  .slice(0, 10);

export default function DetalhamentoPage() {
  const [accounts, setAccounts] = useState<string[]>([]);
  const [selectedClusters, setSelectedClusters] = useState<string[]>([]);

  const accountsQ = useAccounts();
  const activeAccounts =
    accounts.length > 0 ? accounts : accountsQ.data;

  const clustersQ = useClusters({
    accounts: activeAccounts,
    minSpend: 50,
    limit: 200,
  });
  const criativosQ = useCriativos({ minSpend: 50, limit: 200 });
  const recsQ = useRecomendacoes(30);
  const metricasQ = useMetricasConta();
  const snapsQ = useSnapshots({
    start: monthAgo,
    end: today,
    accounts: activeAccounts,
  });

  const allClusterNames = useMemo(
    () => [
      ...new Set((clustersQ.data ?? []).map((c) => c.cluster_nome)),
    ].sort(),
    [clustersQ.data]
  );

  const compareClusters = useMemo(
    () =>
      (clustersQ.data ?? []).filter((c) =>
        selectedClusters.includes(c.cluster_nome)
      ),
    [clustersQ.data, selectedClusters]
  );

  const error =
    accountsQ.error ||
    clustersQ.error ||
    criativosQ.error ||
    metricasQ.error;

  const isLoading =
    accountsQ.isLoading ||
    clustersQ.isLoading ||
    criativosQ.isLoading ||
    metricasQ.isLoading;

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="h-10 w-64 bg-podemos-secondary rounded animate-pulse mb-6" />
        <div className="h-16 bg-podemos-secondary rounded animate-pulse mb-6" />
        <div className="h-12 bg-podemos-secondary rounded animate-pulse mb-6" />
        <div className="h-48 bg-podemos-secondary rounded animate-pulse mb-6" />
        <div className="h-64 bg-podemos-secondary rounded animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-900/20 border-l-4 border-red-500 p-4 rounded">
          <p className="text-red-300 font-bold">Erro ao carregar dados</p>
          <p className="text-xs text-red-400 mt-2 font-mono">
            {String(error)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-white mb-1">Detalhamento</h1>
      <p className="text-sm text-gray-400 mb-6">
        Comparação entre clusters, criativos por conta, histórico de
        recomendações, export CSV
      </p>

      <div className="bg-podemos-secondary rounded-lg p-4 mb-6 flex flex-wrap gap-2 items-center">
        <span className="text-sm text-gray-400 mr-2">Contas:</span>
        {(accountsQ.data ?? []).map((a) => {
          const active = accounts.length === 0 || accounts.includes(a);
          return (
            <button
              key={a}
              onClick={() =>
                setAccounts((prev) =>
                  prev.includes(a)
                    ? prev.filter((x) => x !== a)
                    : [...prev, a]
                )
              }
              className={`text-xs px-3 py-1 rounded border transition ${
                active
                  ? "bg-podemos-accent text-black border-podemos-accent"
                  : "bg-transparent text-gray-400 border-gray-700"
              }`}
            >
              {a.slice(-4)}
            </button>
          );
        })}
      </div>

      <ExportButtons
        snapshots={(snapsQ.data ?? []) as unknown as Record<string, unknown>[]}
        criativos={
          (criativosQ.data ?? []) as unknown as Record<string, unknown>[]
        }
        clusters={
          (clustersQ.data ?? []) as unknown as Record<string, unknown>[]
        }
      />

      <ClusterSelector
        clusters={allClusterNames}
        selected={selectedClusters}
        onChange={setSelectedClusters}
      />

      <ComparisonTable clusters={compareClusters} />

      <CampaignsByAccount
        metricas={metricasQ.data ?? []}
        criativos={criativosQ.data ?? []}
        accountFilter={accounts}
      />

      <RecommendationHistory recomendacoes={recsQ.data ?? []} />
    </div>
  );
}
