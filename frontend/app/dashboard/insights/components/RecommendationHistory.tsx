"use client";

interface Recommendation {
  data: string;
  titulo: string;
  status: "executada" | "nao_executada" | "pendente";
  resultado: string;
}

interface RecommendationHistoryProps {
  historico: Recommendation[];
}

export default function RecommendationHistory({ historico }: RecommendationHistoryProps) {
  const getStatusColor = (status: string) => {
    return status === "executada"
      ? "bg-green-900/30 text-green-400"
      : status === "nao_executada"
      ? "bg-red-900/30 text-red-400"
      : "bg-yellow-900/30 text-yellow-400";
  };

  return (
    <div className="bg-podemos-secondary rounded-lg p-6 mb-6">
      <h3 className="text-white font-bold text-lg mb-4">Histórico de Recomendações</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-600">
              <th className="text-left p-3 text-gray-400">Data</th>
              <th className="text-left p-3 text-gray-400">Recomendação</th>
              <th className="text-center p-3 text-gray-400">Status</th>
              <th className="text-left p-3 text-gray-400">Resultado</th>
            </tr>
          </thead>
          <tbody>
            {historico.map((rec, idx) => (
              <tr key={idx} className="border-b border-gray-700 hover:bg-gray-700/30">
                <td className="p-3 text-gray-300">{rec.data}</td>
                <td className="p-3 text-white">{rec.titulo}</td>
                <td className="p-3 text-center">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(rec.status)}`}>
                    {rec.status === "executada"
                      ? "✓ EXECUTADA"
                      : rec.status === "nao_executada"
                      ? "✗ IGNORADA"
                      : "⏳ PENDENTE"}
                  </span>
                </td>
                <td className="p-3 text-gray-300 text-xs">{rec.resultado}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
