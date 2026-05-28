"use client";

import type { Recomendacao } from "@/lib/types";

interface Props {
  recomendacoes: Recomendacao[];
}

const statusLabel = (r: Recomendacao) =>
  r.executada ? "✓ Executada" : r.aprovada ? "⏳ Aprovada" : "⚠ Pendente";

const statusColor = (r: Recomendacao) =>
  r.executada
    ? "bg-green-900/30 text-green-400"
    : r.aprovada
      ? "bg-blue-900/30 text-blue-400"
      : "bg-yellow-900/30 text-yellow-400";

export default function RecommendationHistory({ recomendacoes }: Props) {
  if (recomendacoes.length === 0) {
    return (
      <div className="bg-podemos-secondary rounded-lg p-4 mb-6 text-sm text-gray-400">
        Nenhuma recomendação no histórico.
      </div>
    );
  }

  return (
    <div className="bg-podemos-secondary rounded-lg p-6 mb-6 overflow-x-auto">
      <h3 className="text-white font-bold mb-4">Histórico de Recomendações</h3>
      <table className="w-full text-sm">
        <thead className="border-b border-gray-700">
          <tr className="text-gray-400 text-xs text-left">
            <th className="p-2">Data</th>
            <th className="p-2">Conta</th>
            <th className="p-2">Tipo</th>
            <th className="p-2">Descrição</th>
            <th className="p-2 text-center">Status</th>
          </tr>
        </thead>
        <tbody>
          {recomendacoes.map((r) => (
            <tr key={r.id} className="border-b border-gray-700/50">
              <td className="p-2 text-gray-300 whitespace-nowrap">
                {r.executado_em?.slice(0, 10) ?? "—"}
              </td>
              <td className="p-2 text-white">{r.nome ?? "—"}</td>
              <td className="p-2 text-gray-300">{r.tipo}</td>
              <td className="p-2 text-gray-300">{r.descricao}</td>
              <td className="p-2 text-center">
                <span
                  className={`px-2 py-1 rounded text-xs ${statusColor(r)}`}
                >
                  {statusLabel(r)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
