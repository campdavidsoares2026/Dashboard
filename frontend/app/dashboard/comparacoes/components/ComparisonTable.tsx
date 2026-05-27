"use client";

import { ClusterComparison } from "@/lib/api";

interface ComparisonTableProps {
  clusters: ClusterComparison[];
}

export default function ComparisonTable({ clusters }: ComparisonTableProps) {
  const getRowColor = (value: number, isLower: boolean = false) => {
    const norm = value / 100;
    if (isLower) {
      return norm > 0.8
        ? "bg-red-900/30"
        : norm > 0.5
          ? "bg-yellow-900/30"
          : "bg-green-900/30";
    }
    return norm > 0.8
      ? "bg-green-900/30"
      : norm > 0.5
        ? "bg-yellow-900/30"
        : "bg-red-900/30";
  };

  return (
    <div className="bg-podemos-secondary rounded-lg p-6 mb-6 overflow-x-auto">
      <h3 className="text-white font-bold mb-4">Comparação Lado-a-Lado</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-600">
            <th className="text-left p-3 text-gray-400">Cluster</th>
            <th className="text-center p-3 text-gray-400">CPEE</th>
            <th className="text-center p-3 text-gray-400">EEM</th>
            <th className="text-center p-3 text-gray-400">Gasto</th>
            <th className="text-center p-3 text-gray-400">CTR</th>
            <th className="text-center p-3 text-gray-400">Sentimento+</th>
            <th className="text-center p-3 text-gray-400">Top Demog</th>
            <th className="text-center p-3 text-gray-400">Melhor Hora</th>
          </tr>
        </thead>
        <tbody>
          {clusters.map((cluster) => (
            <tr
              key={cluster.cluster}
              className="border-b border-gray-700 hover:bg-gray-700/30"
            >
              <td className="p-3 font-bold text-white">{cluster.cluster}</td>
              <td className={`p-3 text-center ${getRowColor(cluster.cpee)}`}>
                R${cluster.cpee.toFixed(2)}
              </td>
              <td className={`p-3 text-center ${getRowColor(cluster.eem * 100)}`}>
                {cluster.eem.toFixed(2)}
              </td>
              <td className="p-3 text-center">R${cluster.gasto.toLocaleString()}</td>
              <td className={`p-3 text-center ${getRowColor(cluster.ctr * 100)}`}>
                {(cluster.ctr * 100).toFixed(2)}%
              </td>
              <td className="p-3 text-center text-podemos-primary font-bold">78%</td>
              <td className="p-3 text-center text-gray-300">{cluster.top_demog}</td>
              <td className="p-3 text-center text-gray-300">{cluster.melhor_hora}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
