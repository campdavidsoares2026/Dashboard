import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CampaignsByAccount from "@/app/dashboard/insights/components/CampaignsByAccount";
import SentimentAnalysis from "@/app/dashboard/insights/components/SentimentAnalysis";
import PredictionsCard from "@/app/dashboard/insights/components/PredictionsCard";
import RecommendationHistory from "@/app/dashboard/insights/components/RecommendationHistory";
import ExportButtons from "@/app/dashboard/insights/components/ExportButtons";

describe("CampaignsByAccount Component", () => {
  const mockCampanhas = [
    {
      account: "SP - Interior",
      campaigns: [
        {
          name: "Reforma Cozinha",
          gasto: 5200,
          ctr: 0.045,
          cpl: 78.5,
          sentimento: 82,
          demog_top: "35-54, Feminino",
          melhor_hora: "19h-22h",
        },
        {
          name: "Reforma Banheiro",
          gasto: 3500,
          ctr: 0.038,
          cpl: 85.2,
          sentimento: 75,
          demog_top: "45-64, Misto",
          melhor_hora: "20h-23h",
        },
      ],
    },
    {
      account: "RJ - Capital",
      campaigns: [
        {
          name: "Pintura Residencial",
          gasto: 6800,
          ctr: 0.052,
          cpl: 92.1,
          sentimento: 88,
          demog_top: "25-44, Feminino",
          melhor_hora: "18h-21h",
        },
      ],
    },
  ];

  it("renders CampaignsByAccount with campaigns", () => {
    render(<CampaignsByAccount campanhas={mockCampanhas} />);
    expect(screen.getByText("Campanhas por Conta")).toBeInTheDocument();
  });

  it("displays all accounts", () => {
    render(<CampaignsByAccount campanhas={mockCampanhas} />);
    expect(screen.getByText("SP - Interior")).toBeInTheDocument();
    expect(screen.getByText("RJ - Capital")).toBeInTheDocument();
  });

  it("displays all campaigns", () => {
    render(<CampaignsByAccount campanhas={mockCampanhas} />);
    expect(screen.getByText("Reforma Cozinha")).toBeInTheDocument();
    expect(screen.getByText("Reforma Banheiro")).toBeInTheDocument();
    expect(screen.getByText("Pintura Residencial")).toBeInTheDocument();
  });

  it("displays campaign metrics correctly", () => {
    render(<CampaignsByAccount campanhas={mockCampanhas} />);
    expect(screen.getByText(/R\$5.200/)).toBeInTheDocument();
    expect(screen.getByText(/4\.50%/)).toBeInTheDocument();
    expect(screen.getByText(/R\$78\.50/)).toBeInTheDocument();
  });

  it("displays sentiment percentages", () => {
    render(<CampaignsByAccount campanhas={mockCampanhas} />);
    expect(screen.getByText(/82% positivo/)).toBeInTheDocument();
    expect(screen.getByText(/75% positivo/)).toBeInTheDocument();
    expect(screen.getByText(/88% positivo/)).toBeInTheDocument();
  });

  it("displays demographics", () => {
    render(<CampaignsByAccount campanhas={mockCampanhas} />);
    expect(screen.getByText(/35-54, Feminino/)).toBeInTheDocument();
    expect(screen.getByText(/45-64, Misto/)).toBeInTheDocument();
    expect(screen.getByText(/25-44, Feminino/)).toBeInTheDocument();
  });

  it("displays best hours for each campaign", () => {
    render(<CampaignsByAccount campanhas={mockCampanhas} />);
    expect(screen.getByText(/19h-22h/)).toBeInTheDocument();
    expect(screen.getByText(/20h-23h/)).toBeInTheDocument();
    expect(screen.getByText(/18h-21h/)).toBeInTheDocument();
  });

  it("displays action buttons for each campaign", () => {
    render(<CampaignsByAccount campanhas={mockCampanhas} />);
    const analyzeButtons = screen.getAllByRole("button", { name: "Analisar" });
    expect(analyzeButtons).toHaveLength(3);
    const pauseButtons = screen.getAllByRole("button", { name: "Pausar" });
    expect(pauseButtons).toHaveLength(3);
    const scaleButtons = screen.getAllByRole("button", { name: "Escalar" });
    expect(scaleButtons).toHaveLength(3);
  });

  it("handles empty campaigns array", () => {
    render(<CampaignsByAccount campanhas={[]} />);
    expect(screen.getByText("Campanhas por Conta")).toBeInTheDocument();
  });

  it("renders multiple campaigns per account", () => {
    render(<CampaignsByAccount campanhas={mockCampanhas} />);
    const spInterior = screen.getByText("SP - Interior").parentElement;
    expect(within(spInterior!).getByText("Reforma Cozinha")).toBeInTheDocument();
    expect(within(spInterior!).getByText("Reforma Banheiro")).toBeInTheDocument();
  });

  it("formats currency values in Brazilian locale", () => {
    render(<CampaignsByAccount campanhas={mockCampanhas} />);
    expect(screen.getByText(/R\$5.200/)).toBeInTheDocument();
    expect(screen.getByText(/R\$3.500/)).toBeInTheDocument();
    expect(screen.getByText(/R\$6.800/)).toBeInTheDocument();
  });
});

describe("SentimentAnalysis Component", () => {
  const mockProps = {
    positivo: 78,
    negativo: 15,
    neutro: 7,
    exemplos_positivos: [
      { texto: "Ótimo trabalho!", score: 0.95 },
      { texto: "Muito bom", score: 0.87 },
    ],
    exemplos_negativos: [
      { texto: "Discordo", score: -0.89 },
      { texto: "Não acredito", score: -0.76 },
    ],
    insight: "Mensagem está ressoando bem com a base",
  };

  it("renders SentimentAnalysis with title", () => {
    render(<SentimentAnalysis {...mockProps} />);
    expect(screen.getByText("Análise de Sentimento (30 dias)")).toBeInTheDocument();
  });

  it("displays positive sentiment percentage", () => {
    render(<SentimentAnalysis {...mockProps} />);
    expect(screen.getByText("Positivo")).toBeInTheDocument();
    expect(screen.getByText("78%")).toBeInTheDocument();
  });

  it("displays negative sentiment percentage", () => {
    render(<SentimentAnalysis {...mockProps} />);
    expect(screen.getByText("Negativo")).toBeInTheDocument();
    expect(screen.getByText("15%")).toBeInTheDocument();
  });

  it("displays neutral sentiment percentage", () => {
    render(<SentimentAnalysis {...mockProps} />);
    expect(screen.getByText("Neutro")).toBeInTheDocument();
    expect(screen.getByText("7%")).toBeInTheDocument();
  });

  it("displays positive examples", () => {
    render(<SentimentAnalysis {...mockProps} />);
    expect(screen.getByText("Exemplos Positivos")).toBeInTheDocument();
    expect(screen.getByText(/Ótimo trabalho/)).toBeInTheDocument();
    expect(screen.getByText(/Muito bom/)).toBeInTheDocument();
  });

  it("displays negative examples", () => {
    render(<SentimentAnalysis {...mockProps} />);
    expect(screen.getByText("Exemplos Negativos")).toBeInTheDocument();
    expect(screen.getByText(/Discordo/)).toBeInTheDocument();
    expect(screen.getByText(/Não acredito/)).toBeInTheDocument();
  });

  it("displays insight text", () => {
    render(<SentimentAnalysis {...mockProps} />);
    expect(screen.getByText(/Mensagem está ressoando bem com a base/)).toBeInTheDocument();
  });

  it("shows sentiment bars with correct widths", () => {
    const { container } = render(<SentimentAnalysis {...mockProps} />);
    const bars = container.querySelectorAll(".bg-green-500, .bg-red-500, .bg-gray-500");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("handles extreme sentiment values", () => {
    render(
      <SentimentAnalysis
        positivo={100}
        negativo={0}
        neutro={0}
        exemplos_positivos={[{ texto: "Perfect", score: 1.0 }]}
        exemplos_negativos={[]}
        insight="All positive"
      />
    );
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("limits examples to 2 per sentiment type", () => {
    render(
      <SentimentAnalysis
        {...mockProps}
        exemplos_positivos={[
          { texto: "Example 1", score: 0.9 },
          { texto: "Example 2", score: 0.85 },
          { texto: "Example 3", score: 0.8 },
        ]}
      />
    );
    const positiveExamples = screen.getAllByText(/Example/);
    expect(positiveExamples.length).toBeLessThanOrEqual(4);
  });

  it("displays insight with lightbulb emoji", () => {
    render(<SentimentAnalysis {...mockProps} />);
    const insightText = screen.getByText(/💡 Insight:/);
    expect(insightText).toBeInTheDocument();
  });
});

describe("PredictionsCard Component", () => {
  const mockPrevisoes = [
    {
      cluster: "Reforma Residencial",
      periodo: "7-14 dias",
      tendencia_percentual: 12,
      confianca: 87,
      drivers: ["budget_increase", "seasonal_demand"],
      sugestao: "Escalar gasto para capturar demanda",
    },
    {
      cluster: "Pinturas Comerciais",
      periodo: "7-30 dias",
      tendencia_percentual: -5,
      confianca: 72,
      drivers: ["market_saturation"],
      sugestao: "Reduzir gasto e ajustar targeting",
    },
  ];

  it("renders PredictionsCard with title", () => {
    render(<PredictionsCard previsoes={mockPrevisoes} />);
    expect(screen.getByText("Previsões (7-30 dias)")).toBeInTheDocument();
  });

  it("displays cluster names", () => {
    render(<PredictionsCard previsoes={mockPrevisoes} />);
    expect(screen.getByText("Reforma Residencial")).toBeInTheDocument();
    expect(screen.getByText("Pinturas Comerciais")).toBeInTheDocument();
  });

  it("displays positive trend with up emoji", () => {
    render(<PredictionsCard previsoes={mockPrevisoes} />);
    expect(screen.getByText(/📈 12%/)).toBeInTheDocument();
  });

  it("displays negative trend with down emoji", () => {
    render(<PredictionsCard previsoes={mockPrevisoes} />);
    expect(screen.getByText(/📉 5%/)).toBeInTheDocument();
  });

  it("displays confidence levels", () => {
    render(<PredictionsCard previsoes={mockPrevisoes} />);
    expect(screen.getByText(/Confiança: 87%/)).toBeInTheDocument();
    expect(screen.getByText(/Confiança: 72%/)).toBeInTheDocument();
  });

  it("displays drivers", () => {
    render(<PredictionsCard previsoes={mockPrevisoes} />);
    expect(screen.getByText(/budget_increase, seasonal_demand/)).toBeInTheDocument();
    expect(screen.getByText(/market_saturation/)).toBeInTheDocument();
  });

  it("displays suggestions", () => {
    render(<PredictionsCard previsoes={mockPrevisoes} />);
    expect(screen.getByText(/Escalar gasto para capturar demanda/)).toBeInTheDocument();
    expect(screen.getByText(/Reduzir gasto e ajustar targeting/)).toBeInTheDocument();
  });

  it("handles empty predictions array", () => {
    render(<PredictionsCard previsoes={[]} />);
    expect(screen.getByText("Previsões (7-30 dias)")).toBeInTheDocument();
  });

  it("formats prediction with multiple drivers", () => {
    render(<PredictionsCard previsoes={mockPrevisoes} />);
    const driverText = screen.getByText(/budget_increase, seasonal_demand/);
    expect(driverText).toBeInTheDocument();
  });

  it("renders single driver correctly", () => {
    render(<PredictionsCard previsoes={mockPrevisoes} />);
    const driverText = screen.getByText(/market_saturation/);
    expect(driverText).toBeInTheDocument();
  });
});

describe("RecommendationHistory Component", () => {
  const mockHistorico = [
    {
      data: "05/05",
      titulo: "Aumentar SP em R$5k",
      status: "executada" as const,
      resultado: "CPEE melhorou 5%",
    },
    {
      data: "04/05",
      titulo: "Revisar criativo RJ",
      status: "nao_executada" as const,
      resultado: "N/A",
    },
    {
      data: "03/05",
      titulo: "Escalar BA - melhor sentimento",
      status: "pendente" as const,
      resultado: "Em análise",
    },
  ];

  it("renders RecommendationHistory with title", () => {
    render(<RecommendationHistory historico={mockHistorico} />);
    expect(screen.getByText("Histórico de Recomendações")).toBeInTheDocument();
  });

  it("displays table headers", () => {
    render(<RecommendationHistory historico={mockHistorico} />);
    expect(screen.getByText("Data")).toBeInTheDocument();
    expect(screen.getByText("Recomendação")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Resultado")).toBeInTheDocument();
  });

  it("displays all recommendations", () => {
    render(<RecommendationHistory historico={mockHistorico} />);
    expect(screen.getByText("Aumentar SP em R$5k")).toBeInTheDocument();
    expect(screen.getByText("Revisar criativo RJ")).toBeInTheDocument();
    expect(screen.getByText("Escalar BA - melhor sentimento")).toBeInTheDocument();
  });

  it("displays execution status with checkmark", () => {
    render(<RecommendationHistory historico={mockHistorico} />);
    expect(screen.getByText(/✓ EXECUTADA/)).toBeInTheDocument();
  });

  it("displays ignored status with X", () => {
    render(<RecommendationHistory historico={mockHistorico} />);
    expect(screen.getByText(/✗ IGNORADA/)).toBeInTheDocument();
  });

  it("displays pending status with hourglass", () => {
    render(<RecommendationHistory historico={mockHistorico} />);
    expect(screen.getByText(/⏳ PENDENTE/)).toBeInTheDocument();
  });

  it("displays dates correctly", () => {
    render(<RecommendationHistory historico={mockHistorico} />);
    expect(screen.getByText("05/05")).toBeInTheDocument();
    expect(screen.getByText("04/05")).toBeInTheDocument();
    expect(screen.getByText("03/05")).toBeInTheDocument();
  });

  it("displays results for each recommendation", () => {
    render(<RecommendationHistory historico={mockHistorico} />);
    expect(screen.getByText("CPEE melhorou 5%")).toBeInTheDocument();
    expect(screen.getByText("N/A")).toBeInTheDocument();
    expect(screen.getByText("Em análise")).toBeInTheDocument();
  });

  it("handles empty history", () => {
    render(<RecommendationHistory historico={[]} />);
    expect(screen.getByText("Histórico de Recomendações")).toBeInTheDocument();
  });

  it("renders table with responsive styling", () => {
    const { container } = render(<RecommendationHistory historico={mockHistorico} />);
    const table = container.querySelector("table");
    expect(table).toBeInTheDocument();
  });

  it("applies hover effect styling to rows", () => {
    const { container } = render(<RecommendationHistory historico={mockHistorico} />);
    const rows = container.querySelectorAll("tbody tr");
    expect(rows.length).toBe(3);
  });
});

describe("ExportButtons Component", () => {
  it("renders ExportButtons with all three buttons", () => {
    render(<ExportButtons />);
    expect(screen.getByRole("button", { name: /Exportar Relatório PDF/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /CSV Completo/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Compartilhar com Time/ })).toBeInTheDocument();
  });

  it("renders PDF export button", () => {
    render(<ExportButtons />);
    const pdfButton = screen.getByRole("button", { name: /Exportar Relatório PDF/ });
    expect(pdfButton).toBeInTheDocument();
    expect(pdfButton).toHaveTextContent("📊");
  });

  it("renders CSV export button", () => {
    render(<ExportButtons />);
    const csvButton = screen.getByRole("button", { name: /CSV Completo/ });
    expect(csvButton).toBeInTheDocument();
    expect(csvButton).toHaveTextContent("📥");
  });

  it("renders share button", () => {
    render(<ExportButtons />);
    const shareButton = screen.getByRole("button", { name: /Compartilhar com Time/ });
    expect(shareButton).toBeInTheDocument();
    expect(shareButton).toHaveTextContent("📋");
  });

  it("all buttons are clickable", async () => {
    render(<ExportButtons />);
    const user = userEvent.setup();
    const pdfButton = screen.getByRole("button", { name: /Exportar Relatório PDF/ });
    await user.click(pdfButton);
    expect(pdfButton).toBeInTheDocument();
  });

  it("buttons have proper spacing", () => {
    const { container } = render(<ExportButtons />);
    const buttonContainer = container.querySelector(".flex.gap-4");
    expect(buttonContainer).toBeInTheDocument();
  });

  it("buttons are responsive with flex-wrap", () => {
    const { container } = render(<ExportButtons />);
    const buttonContainer = container.querySelector(".flex.gap-4.mb-6.flex-wrap");
    expect(buttonContainer).toBeInTheDocument();
  });

  it("buttons have correct styling classes", () => {
    const { container } = render(<ExportButtons />);
    const buttons = container.querySelectorAll("button");
    buttons.forEach((button) => {
      expect(button).toHaveClass("rounded");
      expect(button).toHaveClass("font-bold");
      expect(button).toHaveClass("transition");
    });
  });
});
