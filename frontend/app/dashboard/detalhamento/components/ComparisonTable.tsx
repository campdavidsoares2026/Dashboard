"use client";

import type { Cluster } from "@/lib/types";

const BRL = (n: number) =>
  n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });

interface Props {
  clusters: Cluster[];
}

const tempColor = (c: string) =>
  c === "QUENTE"
    ? "text-red-400"
    : c === "MORNO"
      ? "text-yellow-400"
      : "text-blue-400";

export default function ComparisonTable({ clusters }: Props) {
  if (clusters.length === 0) {
    return (
      <div className="bg-podemos-secondary rounded-lg p-4 mb-6 text-sm text-gray-400">
        Selecione clusters acima para ver a comparação.
      </div>
    );
  }

  return (
    <div className="bg-podemos-secondary rounded-lg p-6 mb-6 overflow-x-auto">
      <h3 className="text-white font-bold mb-3">Comparação Lado-a-Lado</h3>
      <table className="w-full text-sm">
        <thead className="border-b border-gray-700">
          <tr className="text-gray-400 text-xs">
            <th className="text-left p-2">Cluster</th>
            <th className="text-right p-2">CPEE</th>
            <th className="text-right p-2">Gasto</th>
            <th className="text-right p-2">CTR</th>
            <th className="text-right p-2">CPC</th>
            <th className="text-right p-2">EQ</th>
            <th className="text-center p-2">Temp.</th>
          </tr>
        </thead>
        <tbody>
          {clusters.map((c) => (
            <tr
              key={c.adset_id}
              className="border-b border-gray-700/50 hover:bg-podemos-dark/30"
            >
              <td className="p-2 text-white font-medium">{c.cluster_nome}</td>
              <td className="p-2 text-right text-podemos-accent font-bold">
                {BRL(c.cpee)}
              </td>
              <td className="p-2 text-right text-gray-200">{BRL(c.spend)}</td>
              <td className="p-2 text-right text-gray-200">
                {c.ctr.toFixed(2)}%
              </td>
              <td className="p-2 text-right text-gray-200">{BRL(c.cpc)}</td>
              <td className="p-2 text-right text-gray-200">
                {c.eq.toLocaleString("pt-BR")}
              </td>
              <td
                className={`p-2 text-center font-bold ${tempColor(
                  c.classificacao
                )}`}
              >
                {c.classificacao}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
