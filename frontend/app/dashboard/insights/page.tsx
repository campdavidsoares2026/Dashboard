"use client";

import { useCampanhasPorConta, usePrevisoes } from "@/lib/api";
import CampaignsByAccount from "./components/CampaignsByAccount";
import SentimentAnalysis from "./components/SentimentAnalysis";
import PredictionsCard from "./components/PredictionsCard";
import RecommendationHistory from "./components/RecommendationHistory";
import ExportButtons from "./components/ExportButtons";

export default function InsightsPage() {
  const { data: campaignsData, isLoading: campaignsLoading, error: campaignsError } = useCampanhasPorConta();
  const { data: previsionsData, isLoading: previsionsLoading, error: previsionsError } = usePrevisoes();

  if (campaignsLoading || previsionsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-400">Carregando insights...</p>
      </div>
    );
  }

  if (campaignsError || previsionsError) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-red-500">Erro ao carregar dados</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Insights Profundos</h1>
        <p className="text-gray-400">Análises detalhadas e recomendações para assessores</p>
      </div>

      <ExportButtons />

      {campaignsData && campaignsData.campanhas && (
        <CampaignsByAccount campanhas={campaignsData.campanhas} />
      )}

      <SentimentAnalysis
        positivo={78}
        negativo={15}
        neutro={7}
        exemplos_positivos={[
          { texto: "Ótimo trabalho do candidato!", score: 0.95 },
          { texto: "Muito bom mesmo", score: 0.87 },
        ]}
        exemplos_negativos={[
          { texto: "Discordo completamente", score: -0.89 },
          { texto: "Não acredito nisso", score: -0.76 },
        ]}
        insight="Mensagem está ressoando bem com a base, mas falta especificidade em propostas econômicas"
      />

      {previsionsData && previsionsData.previsoes && (
        <PredictionsCard previsoes={previsionsData.previsoes} />
      )}

      <RecommendationHistory
        historico={[
          {
            data: "05/05",
            titulo: "Aumentar SP em R$5k",
            status: "executada",
            resultado: "CPEE melhorou 5%",
          },
          {
            data: "04/05",
            titulo: "Revisar criativo RJ",
            status: "nao_executada",
            resultado: "N/A",
          },
          {
            data: "03/05",
            titulo: "Escalar BA - melhor sentimento",
            status: "pendente",
            resultado: "Em análise",
          },
        ]}
      />
    </div>
  );
}
