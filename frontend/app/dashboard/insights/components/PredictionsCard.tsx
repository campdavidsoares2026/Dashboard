"use client";

interface Prediction {
  cluster: string;
  periodo: string;
  tendencia_percentual: number;
  confianca: number;
  drivers: string[];
  sugestao: string;
}

interface PredictionsCardProps {
  previsoes: Prediction[];
}

export default function PredictionsCard({ previsoes }: PredictionsCardProps) {
  return (
    <div className="bg-podemos-secondary rounded-lg p-6 mb-6">
      <h3 className="text-white font-bold text-lg mb-4">Previsões (7-30 dias)</h3>
      <div className="space-y-3">
        {previsoes.map((pred, idx) => (
          <div key={idx} className="border border-gray-700 rounded p-4">
            <div className="flex justify-between items-start mb-2">
              <p className="text-white font-bold">{pred.cluster}</p>
              <div className="text-right">
                <p
                  className={`text-lg font-bold ${
                    pred.tendencia_percentual > 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {pred.tendencia_percentual > 0 ? "📈" : "📉"} {Math.abs(pred.tendencia_percentual)}%
                </p>
                <p className="text-xs text-gray-400">Confiança: {pred.confianca}%</p>
              </div>
            </div>
            <p className="text-sm text-gray-300 mb-2">
              <span className="font-bold">Drivers:</span> {pred.drivers.join(", ")}
            </p>
            <p className="text-sm text-podemos-primary">Sugestão: {pred.sugestao}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
