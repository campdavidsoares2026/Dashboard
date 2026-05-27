import { render, screen } from "@testing-library/react";
import KPICards from "@/app/dashboard/overview/components/KPICards";
import MetricsGrid from "@/app/dashboard/overview/components/MetricsGrid";
import AlertsSection from "@/app/dashboard/overview/components/AlertsSection";
import FunnelChart from "@/app/dashboard/overview/components/FunnelChart";
import CpeeClassification from "@/app/dashboard/overview/components/CpeeClassification";
import TrendChart from "@/app/dashboard/overview/components/TrendChart";
import TopClusters from "@/app/dashboard/overview/components/TopClusters";
import { Alert } from "@/lib/api";

describe("KPICards Component", () => {
  it("renders KPI cards with correct count", () => {
    const kpis = [
      { label: "Gasto Total", value: 45000, unit: "R$", trend: 5, trend_direction: "up" as const, metadata: undefined },
      { label: "Leads", value: 876, unit: "", trend: 12.5, trend_direction: "up" as const, metadata: undefined },
    ];
    const { container } = render(<KPICards kpis={kpis} />);
    const cards = container.querySelectorAll("[class*='bg-podemos-secondary']");
    expect(cards.length).toBeGreaterThanOrEqual(2);
  });

  it("displays KPI label correctly", () => {
    const kpis = [
      { label: "Gasto Total", value: 45000, unit: "R$", trend: 5, trend_direction: "up" as const, metadata: undefined },
    ];
    render(<KPICards kpis={kpis} />);
    expect(screen.getByText("Gasto Total")).toBeInTheDocument();
  });

  it("displays KPI value and unit", () => {
    const kpis = [
      { label: "Gasto Total", value: 45000, unit: "R$", trend: 5, trend_direction: "up" as const, metadata: undefined },
    ];
    render(<KPICards kpis={kpis} />);
    expect(screen.getByText("R$")).toBeInTheDocument();
  });

  it("shows trend indicator with up arrow for positive trend", () => {
    const kpis = [
      { label: "CTR", value: 2.4, unit: "%", trend: 5.2, trend_direction: "up" as const, metadata: undefined },
    ];
    render(<KPICards kpis={kpis} />);
    expect(screen.getByText(/↑/)).toBeInTheDocument();
  });

  it("shows trend indicator with down arrow for negative trend", () => {
    const kpis = [
      { label: "CPC", value: 45.5, unit: "R$", trend: 2.1, trend_direction: "down" as const, metadata: undefined },
    ];
    render(<KPICards kpis={kpis} />);
    expect(screen.getByText(/↓/)).toBeInTheDocument();
  });

  it("displays metadata when provided", () => {
    const kpis = [
      { label: "Frequência", value: 3.2, unit: "", trend: 0.4, trend_direction: "up" as const, metadata: "Avg por usuário" },
    ];
    render(<KPICards kpis={kpis} />);
    expect(screen.getByText("Avg por usuário")).toBeInTheDocument();
  });

  it("handles empty KPI array", () => {
    const { container } = render(<KPICards kpis={[]} />);
    expect(container.querySelectorAll("[class*='bg-podemos-secondary']").length).toBe(0);
  });

  it("renders responsive grid classes", () => {
    const kpis = [
      { label: "Test", value: 100, unit: "", trend: undefined, trend_direction: undefined, metadata: undefined },
    ];
    const { container } = render(<KPICards kpis={kpis} />);
    const grid = container.firstChild;
    expect(grid).toHaveClass("grid");
    expect(grid).toHaveClass("gap-4");
  });
});

describe("AlertsSection Component", () => {
  const mockAlerts: Alert[] = [
    {
      id: "1",
      cluster: "Campaign A",
      type: "warning",
      title: "Alto CPC detectado",
      reason: "CPC subiu 15% em relação à média",
      actions: [{ label: "Investigar", action: "investigate" }],
      sentiment: "negativo",
    },
  ];

  const mockRecommendations: Alert[] = [
    {
      id: "2",
      cluster: "Campaign B",
      type: "success",
      title: "Performance em alta",
      reason: "CTR acima da média histórica",
      actions: [{ label: "Ampliar orçamento", action: "increase_budget" }],
      sentiment: "positivo",
    },
  ];

  it("renders alerts and recommendations combined", () => {
    render(<AlertsSection alerts={mockAlerts} recommendations={mockRecommendations} />);
    expect(screen.getByText("Alertas & Recomendações Inteligentes")).toBeInTheDocument();
  });

  it("displays alert title and reason", () => {
    render(<AlertsSection alerts={mockAlerts} recommendations={[]} />);
    expect(screen.getByText("Alto CPC detectado")).toBeInTheDocument();
    expect(screen.getByText("CPC subiu 15% em relação à média")).toBeInTheDocument();
  });

  it("displays recommendation title and reason", () => {
    render(<AlertsSection alerts={[]} recommendations={mockRecommendations} />);
    expect(screen.getByText("Performance em alta")).toBeInTheDocument();
    expect(screen.getByText("CTR acima da média histórica")).toBeInTheDocument();
  });

  it("renders action buttons", () => {
    render(<AlertsSection alerts={mockAlerts} recommendations={mockRecommendations} />);
    expect(screen.getByText("Investigar")).toBeInTheDocument();
    expect(screen.getByText("Ampliar orçamento")).toBeInTheDocument();
  });

  it("displays sentiment badge when provided", () => {
    render(<AlertsSection alerts={mockAlerts} recommendations={mockRecommendations} />);
    expect(screen.getByText("negativo")).toBeInTheDocument();
    expect(screen.getByText("positivo")).toBeInTheDocument();
  });

  it("handles empty alerts and recommendations", () => {
    const { container } = render(<AlertsSection alerts={[]} recommendations={[]} />);
    expect(screen.getByText("Alertas & Recomendações Inteligentes")).toBeInTheDocument();
    expect(container.querySelectorAll(".space-y-3 > div").length).toBe(0);
  });

  it("applies correct styles for warning alerts", () => {
    const { container } = render(<AlertsSection alerts={mockAlerts} recommendations={[]} />);
    const alertCard = container.querySelector(".border-l-4");
    expect(alertCard).toHaveClass("bg-red-900/20");
    expect(alertCard).toHaveClass("border-red-500");
  });

  it("applies correct styles for success alerts", () => {
    const { container } = render(<AlertsSection alerts={[]} recommendations={mockRecommendations} />);
    const successCard = container.querySelector(".border-l-4");
    expect(successCard).toHaveClass("bg-green-900/20");
    expect(successCard).toHaveClass("border-green-500");
  });
});

describe("MetricsGrid Component", () => {
  it("renders metrics grid with KPIs", () => {
    const kpis = [
      { label: "CPEE", value: 45.5, unit: "R$", trend: undefined, trend_direction: undefined, metadata: undefined },
      { label: "EEM", value: 1.8, unit: "", trend: 5, trend_direction: "up" as const, metadata: "Engagement Rate" },
    ];
    render(<MetricsGrid kpis={kpis} />);
    expect(screen.getByText("CPEE")).toBeInTheDocument();
    expect(screen.getByText("EEM")).toBeInTheDocument();
  });

  it("displays metric values", () => {
    const kpis = [
      { label: "CTR", value: 2.4, unit: "%", trend: undefined, trend_direction: undefined, metadata: undefined },
    ];
    render(<MetricsGrid kpis={kpis} />);
    expect(screen.getByText("2.4%")).toBeInTheDocument();
  });

  it("displays metadata when available", () => {
    const kpis = [
      { label: "Lead Rate", value: 0.35, unit: "%", trend: undefined, trend_direction: undefined, metadata: "From clicks" },
    ];
    render(<MetricsGrid kpis={kpis} />);
    expect(screen.getByText("From clicks")).toBeInTheDocument();
  });

  it("renders responsive grid layout", () => {
    const kpis = [
      { label: "Test 1", value: 1, unit: "", trend: undefined, trend_direction: undefined, metadata: undefined },
      { label: "Test 2", value: 2, unit: "", trend: undefined, trend_direction: undefined, metadata: undefined },
    ];
    const { container } = render(<MetricsGrid kpis={kpis} />);
    const grid = container.firstChild;
    expect(grid).toHaveClass("grid");
    expect(grid).toHaveClass("gap-4");
  });

  it("applies hover effect on metric cards", () => {
    const kpis = [
      { label: "Metric", value: 100, unit: "", trend: undefined, trend_direction: undefined, metadata: undefined },
    ];
    const { container } = render(<MetricsGrid kpis={kpis} />);
    const card = container.querySelector(".hover\\:border-podemos-accent");
    expect(card).toBeInTheDocument();
  });

  it("handles empty metrics array", () => {
    const { container } = render(<MetricsGrid kpis={[]} />);
    expect(container.querySelectorAll(".rounded-lg").length).toBe(0);
  });
});

describe("FunnelChart Component", () => {
  const mockFunnelData = [
    { stage: "Alcance", value: 4600000 },
    { stage: "Impressões", value: 6200000 },
    { stage: "Engajamento", value: 4700000 },
    { stage: "Cliques", value: 125000 },
    { stage: "Leads", value: 876 },
  ];

  it("renders funnel chart title", () => {
    render(<FunnelChart data={mockFunnelData} />);
    expect(screen.getByText("Funil de Conversão")).toBeInTheDocument();
  });

  it("displays all funnel stages", () => {
    render(<FunnelChart data={mockFunnelData} />);
    expect(screen.getByText("Alcance")).toBeInTheDocument();
    expect(screen.getByText("Impressões")).toBeInTheDocument();
    expect(screen.getByText("Cliques")).toBeInTheDocument();
    expect(screen.getByText("Leads")).toBeInTheDocument();
  });

  it("displays stage values in correct format", () => {
    render(<FunnelChart data={mockFunnelData} />);
    expect(screen.getByText("4,600,000")).toBeInTheDocument();
    expect(screen.getByText("876")).toBeInTheDocument();
  });

  it("renders gradient bars for each stage", () => {
    const { container } = render(<FunnelChart data={mockFunnelData} />);
    const bars = container.querySelectorAll(".bg-gradient-to-r");
    expect(bars.length).toBe(mockFunnelData.length);
  });

  it("scales bar widths proportionally to values", () => {
    const { container } = render(<FunnelChart data={mockFunnelData} />);
    const bars = container.querySelectorAll(".bg-gradient-to-r");
    const firstBar = bars[0] as HTMLElement;
    const lastBar = bars[4] as HTMLElement;
    // First bar should be wider than last (4.6M > 876)
    expect(firstBar.style.width).not.toBe(lastBar.style.width);
  });

  it("handles single stage funnel", () => {
    render(<FunnelChart data={[{ stage: "Start", value: 1000 }]} />);
    expect(screen.getByText("Start")).toBeInTheDocument();
  });
});

describe("CpeeClassification Component", () => {
  it("displays classification header", () => {
    render(<CpeeClassification hot={5} warm={8} cold={3} />);
    expect(screen.getByText("Classificação CPEE")).toBeInTheDocument();
  });

  it("displays hot campaigns count and label", () => {
    render(<CpeeClassification hot={5} warm={8} cold={3} />);
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("Quentes")).toBeInTheDocument();
  });

  it("displays warm campaigns count and label", () => {
    render(<CpeeClassification hot={5} warm={8} cold={3} />);
    expect(screen.getAllByText("8")[0]).toBeInTheDocument();
    expect(screen.getByText("Mornos")).toBeInTheDocument();
  });

  it("displays cold campaigns count and label", () => {
    render(<CpeeClassification hot={5} warm={8} cold={3} />);
    expect(screen.getAllByText("3")[0]).toBeInTheDocument();
    expect(screen.getByText("Frios")).toBeInTheDocument();
  });

  it("displays pending count when greater than 0", () => {
    render(<CpeeClassification hot={5} warm={8} cold={3} pending={2} />);
    expect(screen.getByText("+ 2 em aquecimento")).toBeInTheDocument();
  });

  it("hides pending section when pending is 0", () => {
    const { container } = render(<CpeeClassification hot={5} warm={8} cold={3} pending={0} />);
    expect(container.textContent).not.toContain("+ 0");
  });

  it("renders classification grid layout", () => {
    const { container } = render(<CpeeClassification hot={5} warm={8} cold={3} />);
    const grid = container.querySelector(".grid-cols-3");
    expect(grid).toBeInTheDocument();
  });

  it("displays emojis for each category", () => {
    const { container } = render(<CpeeClassification hot={5} warm={8} cold={3} />);
    expect(container.textContent).toContain("🔥");
    expect(container.textContent).toContain("🟡");
    expect(container.textContent).toContain("🔵");
  });
});

describe("TrendChart Component", () => {
  const mockTrendData = [
    { date: "Dia 1", value: 45.5 },
    { date: "Dia 2", value: 47.2 },
    { date: "Dia 3", value: 46.8 },
  ];

  it("renders chart title", () => {
    render(<TrendChart title="Tendência CPEE (7 dias)" data={mockTrendData} />);
    expect(screen.getByText("Tendência CPEE (7 dias)")).toBeInTheDocument();
  });

  it("renders line chart container with responsive wrapper", () => {
    const { container } = render(<TrendChart title="Test Chart" data={mockTrendData} />);
    // Recharts ResponsiveContainer renders in jsdom
    const wrapper = container.querySelector(".bg-podemos-secondary");
    expect(wrapper).toBeInTheDocument();
  });

  it("renders responsive container with chart", () => {
    const { container } = render(<TrendChart title="Test Chart" data={mockTrendData} />);
    // Check that the component is wrapped in the background container
    const bgContainer = container.querySelector(".bg-podemos-secondary");
    expect(bgContainer).toHaveClass("rounded-lg");
    expect(bgContainer).toHaveClass("p-6");
  });

  it("displays chart with proper container structure", () => {
    const { container } = render(<TrendChart title="Test Chart" data={mockTrendData} />);
    const parentDiv = container.querySelector(".bg-podemos-secondary");
    expect(parentDiv).toBeInTheDocument();
    // Check for h3 title element
    const title = parentDiv?.querySelector("h3");
    expect(title).toBeInTheDocument();
  });

  it("handles multiple data points in trend", () => {
    const manyPoints = Array.from({ length: 30 }, (_, i) => ({
      date: `Day ${i + 1}`,
      value: Math.random() * 100,
    }));
    render(<TrendChart title="30-Day Trend" data={manyPoints} />);
    expect(screen.getByText("30-Day Trend")).toBeInTheDocument();
  });

  it("handles single data point", () => {
    render(<TrendChart title="Single Point" data={[{ date: "Day 1", value: 50 }]} />);
    expect(screen.getByText("Single Point")).toBeInTheDocument();
  });
});

describe("TopClusters Component", () => {
  const mockClusters = [
    { cluster: "Campaign A", eem: 2.5, cpee: 45.5, gasto: 5000 },
    { cluster: "Campaign B", eem: 1.2, cpee: 52.3, gasto: 4500 },
    { cluster: "Campaign C", eem: 0.6, cpee: 65.2, gasto: 3000 },
  ];

  it("renders clusters section header", () => {
    render(<TopClusters clusters={mockClusters} />);
    expect(screen.getByText("Top 5 Clusters")).toBeInTheDocument();
  });

  it("displays cluster names", () => {
    render(<TopClusters clusters={mockClusters} />);
    expect(screen.getByText(/Campaign A/)).toBeInTheDocument();
    expect(screen.getByText(/Campaign B/)).toBeInTheDocument();
  });

  it("displays EEM and CPEE values", () => {
    render(<TopClusters clusters={mockClusters} />);
    expect(screen.getByText(/EEM: 2.5/)).toBeInTheDocument();
    expect(screen.getByText(/CPEE: R\$45.50/)).toBeInTheDocument();
  });

  it("displays spending amounts formatted as currency", () => {
    render(<TopClusters clusters={mockClusters} />);
    expect(screen.getByText("R$5,000")).toBeInTheDocument();
  });

  it("shows hot emoji for high EEM", () => {
    render(<TopClusters clusters={mockClusters} />);
    // Campaign A has EEM 2.5 (>= 2.0) should show 🔥
    expect(screen.getByText(/🔥 Campaign A/)).toBeInTheDocument();
  });

  it("shows warm emoji for medium EEM", () => {
    render(<TopClusters clusters={mockClusters} />);
    // Campaign B has EEM 1.2 (>= 0.8 and < 2.0) should show 🟡
    expect(screen.getByText(/🟡 Campaign B/)).toBeInTheDocument();
  });

  it("shows cold emoji for low EEM", () => {
    render(<TopClusters clusters={mockClusters} />);
    // Campaign C has EEM 0.6 (< 0.8) should show 🔵
    expect(screen.getByText(/🔵 Campaign C/)).toBeInTheDocument();
  });

  it("handles empty clusters array", () => {
    const { container } = render(<TopClusters clusters={[]} />);
    expect(screen.getByText("Top 5 Clusters")).toBeInTheDocument();
    expect(container.querySelectorAll(".border-b").length).toBe(0);
  });

  it("renders all clusters with proper spacing", () => {
    const { container } = render(<TopClusters clusters={mockClusters} />);
    const items = container.querySelectorAll(".border-b");
    expect(items.length).toBe(mockClusters.length);
  });
});
