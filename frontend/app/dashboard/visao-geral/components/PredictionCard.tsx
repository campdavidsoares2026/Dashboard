"use client";

import type { Prediction } from "@/lib/compute";

interface Props {
  prediction: Prediction;
}

export default function PredictionCard({ prediction }: Props) {
  const { tendencia_pct, confianca } = prediction;

  if (confianca === 0) {
    return (
      <div className="bg-podemos-secondary rounded-lg p-6">
        <h3 className="text-white font-bold mb-2">Previsão CPEE (7d)</h3>
        <p className="text-sm text-gray-400">
          Dados insuficientes para previsão (mínimo 3 dias com CPEE &gt; 0).
        </p>
      </div>
    );
  }

  const up = tendencia_pct > 0;
  const stable = Math.abs(tendencia_pct) < 1;

  return (
    <div className="bg-podemos-secondary rounded-lg p-6">
      <h3 className="text-white font-bold mb-4">
        Previsão CPEE (próximos 7 dias)
      </h3>
      <div className="flex items-baseline gap-3 mb-2">
        <span className="text-4xl">{stable ? "➡️" : up ? "📈" : "📉"}</span>
        <span
          className={`text-3xl font-bold ${
            stable
              ? "text-gray-300"
              : up
                ? "text-red-400"
                : "text-green-400"
          }`}
        >
          {tendencia_pct > 0 ? "+" : ""}
          {tendencia_pct.toFixed(1)}%
        </span>
        <span className="text-sm text-gray-400">por dia</span>
      </div>
      <p className="text-xs text-gray-400">
        Confiança:{" "}
        <span className="font-bold text-white">{confianca}%</span>
        {confianca < 50 && " (baixa — série muito volátil)"}
      </p>
      <p className="text-xs text-gray-500 mt-3">
        Cálculo: regressão linear sobre CPEE diário do período selecionado.
      </p>
    </div>
  );
}
