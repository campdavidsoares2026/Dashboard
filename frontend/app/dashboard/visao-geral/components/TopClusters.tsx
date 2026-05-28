"use client";

import { useClusters } from "@/lib/queries";

const BRL = (n: number) =>
  n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });

export default function TopClusters({ accounts }: { accounts?: string[] }) {
  const q = useClusters({ accounts, minSpend: 50, limit: 100 });

  if (q.isLoading) {
    return (
      <div className="bg-podemos-secondary rounded-lg p-6">
        <h3 className="text-white font-bold mb-3">Top 5 Clusters</h3>
        <p className="text-sm text-gray-400">Carregando...</p>
      </div>
    );
  }

  const clusters = (q.data ?? [])
    .filter((c) => c.cpee > 0)
    .sort((a, b) => a.cpee - b.cpee)
    .slice(0, 5);

  return (
    <div className="bg-podemos-secondary rounded-lg p-6">
      <h3 className="text-white font-bold mb-3">Top 5 Clusters (menor CPEE)</h3>
      <div className="space-y-2">
        {clusters.length === 0 && (
          <p className="text-sm text-gray-400">Nenhum cluster com dados.</p>
        )}
        {clusters.map((c) => {
          const temp =
            c.classificacao === "QUENTE"
              ? "🔥"
              : c.classificacao === "MORNO"
                ? "🟡"
                : "🔵";
          return (
            <div
              key={c.adset_id}
              className="flex justify-between items-center p-2 border-b border-gray-700 last:border-0"
            >
              <div className="min-w-0 mr-3">
                <p className="text-white font-medium text-sm truncate">
                  {temp} {c.cluster_nome}
                </p>
                <p className="text-xs text-gray-400">
                  CPEE: {BRL(c.cpee)} · CTR: {c.ctr.toFixed(2)}%
                </p>
              </div>
              <p className="text-podemos-accent font-bold text-sm whitespace-nowrap">
                {BRL(c.spend)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
