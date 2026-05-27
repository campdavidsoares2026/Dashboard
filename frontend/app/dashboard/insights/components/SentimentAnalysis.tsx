"use client";

interface SentimentAnalysisProps {
  positivo: number;
  negativo: number;
  neutro: number;
  exemplos_positivos: Array<{ texto: string; score: number }>;
  exemplos_negativos: Array<{ texto: string; score: number }>;
  insight: string;
}

export default function SentimentAnalysis({
  positivo,
  negativo,
  neutro,
  exemplos_positivos,
  exemplos_negativos,
  insight,
}: SentimentAnalysisProps) {
  return (
    <div className="bg-podemos-secondary rounded-lg p-6 mb-6">
      <h3 className="text-white font-bold text-lg mb-4">Análise de Sentimento (30 dias)</h3>

      {/* Percentage bars */}
      <div className="mb-6">
        <div className="flex justify-between mb-2 text-sm">
          <span className="text-green-400">Positivo</span>
          <span className="font-bold text-gray-300">{positivo}%</span>
        </div>
        <div className="h-2 bg-gray-700 rounded overflow-hidden">
          <div className="h-full bg-green-500" style={{ width: `${positivo}%` }} />
        </div>
      </div>

      <div className="mb-6">
        <div className="flex justify-between mb-2 text-sm">
          <span className="text-red-400">Negativo</span>
          <span className="font-bold text-gray-300">{negativo}%</span>
        </div>
        <div className="h-2 bg-gray-700 rounded overflow-hidden">
          <div className="h-full bg-red-500" style={{ width: `${negativo}%` }} />
        </div>
      </div>

      <div className="mb-6">
        <div className="flex justify-between mb-2 text-sm">
          <span className="text-gray-400">Neutro</span>
          <span className="font-bold text-gray-300">{neutro}%</span>
        </div>
        <div className="h-2 bg-gray-700 rounded overflow-hidden">
          <div className="h-full bg-gray-500" style={{ width: `${neutro}%` }} />
        </div>
      </div>

      {/* Examples */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-green-400 font-bold text-sm mb-2">Exemplos Positivos</p>
          <div className="space-y-2">
            {exemplos_positivos.slice(0, 2).map((ex, idx) => (
              <p key={idx} className="text-xs text-gray-300 p-2 bg-green-900/20 rounded">
                &quot;{ex.texto}&quot;
              </p>
            ))}
          </div>
        </div>
        <div>
          <p className="text-red-400 font-bold text-sm mb-2">Exemplos Negativos</p>
          <div className="space-y-2">
            {exemplos_negativos.slice(0, 2).map((ex, idx) => (
              <p key={idx} className="text-xs text-gray-300 p-2 bg-red-900/20 rounded">
                &quot;{ex.texto}&quot;
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* Insight */}
      <div className="bg-podemos-primary/10 border border-podemos-primary rounded p-3">
        <p className="text-sm text-podemos-primary">💡 Insight: {insight}</p>
      </div>
    </div>
  );
}
