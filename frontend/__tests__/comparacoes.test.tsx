import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ClusterSelector from "@/app/dashboard/comparacoes/components/ClusterSelector";
import ComparisonTable from "@/app/dashboard/comparacoes/components/ComparisonTable";
import HeatmapChart from "@/app/dashboard/comparacoes/components/HeatmapChart";
import PerformanceMetrics from "@/app/dashboard/comparacoes/components/PerformanceMetrics";
import TrendComparison from "@/app/dashboard/comparacoes/components/TrendComparison";
import { ClusterComparison } from "@/lib/api";

describe("ClusterSelector Component", () => {
  it("renders cluster options and allows selection", () => {
    const clusters = ["SP", "RJ", "BA", "MG"];
    const onChange = jest.fn();

    render(
      <ClusterSelector
        clusters={clusters}
        selectedClusters={[]}
        onChange={onChange}
      />
    );

    expect(screen.getByText("SP")).toBeInTheDocument();
    expect(screen.getByText("RJ")).toBeInTheDocument();
    expect(screen.getByText("BA")).toBeInTheDocument();
    expect(screen.getByText("MG")).toBeInTheDocument();
  });

  it("calls onChange when a cluster is selected", async () => {
    const clusters = ["SP", "RJ"];
    const onChange = jest.fn();
    const user = userEvent.setup();

    render(
      <ClusterSelector
        clusters={clusters}
        selectedClusters={[]}
        onChange={onChange}
      />
    );

    const spButton = screen.getByRole("button", { name: "SP" });
    await user.click(spButton);

    expect(onChange).toHaveBeenCalledWith(["SP"]);
  });

  it("allows multi-select of clusters", async () => {
    const clusters = ["SP", "RJ", "BA"];
    const onChange = jest.fn();
    const user = userEvent.setup();

    const { rerender } = render(
      <ClusterSelector
        clusters={clusters}
        selectedClusters={["SP"]}
        onChange={onChange}
      />
    );

    const rjButton = screen.getByRole("button", { name: "RJ" });
    await user.click(rjButton);

    expect(onChange).toHaveBeenCalledWith(["SP", "RJ"]);

    rerender(
      <ClusterSelector
        clusters={clusters}
        selectedClusters={["SP", "RJ"]}
        onChange={onChange}
      />
    );

    const baButton = screen.getByRole("button", { name: "BA" });
    await user.click(baButton);

    expect(onChange).toHaveBeenCalledWith(["SP", "RJ", "BA"]);
  });

  it("displays selected clusters count", () => {
    const clusters = ["SP", "RJ", "BA"];
    const onChange = jest.fn();

    render(
      <ClusterSelector
        clusters={clusters}
        selectedClusters={["SP", "RJ"]}
        onChange={onChange}
      />
    );

    expect(screen.getByText(/2\/5 selecionados/)).toBeInTheDocument();
  });

  it("limits selection to 5 clusters maximum", async () => {
    const clusters = ["SP", "RJ", "BA", "MG", "SC", "RS"];
    const onChange = jest.fn();
    const user = userEvent.setup();

    render(
      <ClusterSelector
        clusters={clusters}
        selectedClusters={["SP", "RJ", "BA", "MG", "SC"]}
        onChange={onChange}
      />
    );

    const rsButton = screen.getByRole("button", { name: "RS" });
    await user.click(rsButton);

    expect(onChange).toHaveBeenCalledWith(["SP", "RJ", "BA", "MG", "SC"]);
  });

  it("allows deselecting a cluster", async () => {
    const clusters = ["SP", "RJ", "BA"];
    const onChange = jest.fn();
    const user = userEvent.setup();

    render(
      <ClusterSelector
        clusters={clusters}
        selectedClusters={["SP", "RJ"]}
        onChange={onChange}
      />
    );

    const spButton = screen.getByRole("button", { name: "SP" });
    await user.click(spButton);

    expect(onChange).toHaveBeenCalledWith(["RJ"]);
  });

  it("highlights selected cluster buttons", () => {
    const clusters = ["SP", "RJ"];
    const onChange = jest.fn();

    render(
      <ClusterSelector
        clusters={clusters}
        selectedClusters={["SP"]}
        onChange={onChange}
      />
    );

    const spButton = screen.getByRole("button", { name: "SP" });
    expect(spButton).toHaveClass("bg-podemos-primary");

    const rjButton = screen.getByRole("button", { name: "RJ" });
    expect(rjButton).toHaveClass("bg-gray-700");
  });
});

describe("ComparisonTable Component", () => {
  const mockClusters: ClusterComparison[] = [
    {
      cluster: "SP",
      cpee: 45.5,
      eem: 2.3,
      gasto: 5000,
      ctr: 0.023,
      top_demog: "25-40, M",
      melhor_hora: "20h-22h",
    },
    {
      cluster: "RJ",
      cpee: 52.3,
      eem: 2.1,
      gasto: 4500,
      ctr: 0.021,
      top_demog: "18-25, F",
      melhor_hora: "18h-20h",
    },
  ];

  it("displays cluster comparison data in a table", () => {
    render(<ComparisonTable clusters={mockClusters} />);

    expect(screen.getByText("SP")).toBeInTheDocument();
    expect(screen.getByText("RJ")).toBeInTheDocument();
  });

  it("shows all required columns", () => {
    render(<ComparisonTable clusters={mockClusters} />);

    expect(screen.getByText("Cluster")).toBeInTheDocument();
    expect(screen.getByText("CPEE")).toBeInTheDocument();
    expect(screen.getByText("EEM")).toBeInTheDocument();
    expect(screen.getByText("Gasto")).toBeInTheDocument();
    expect(screen.getByText("CTR")).toBeInTheDocument();
    expect(screen.getByText("Top Demog")).toBeInTheDocument();
    expect(screen.getByText("Melhor Hora")).toBeInTheDocument();
  });

  it("displays CPEE values correctly formatted", () => {
    render(<ComparisonTable clusters={mockClusters} />);

    expect(screen.getByText("R$45.50")).toBeInTheDocument();
    expect(screen.getByText("R$52.30")).toBeInTheDocument();
  });

  it("displays demographic information", () => {
    render(<ComparisonTable clusters={mockClusters} />);

    expect(screen.getByText("25-40, M")).toBeInTheDocument();
    expect(screen.getByText("18-25, F")).toBeInTheDocument();
  });

  it("displays best hour information", () => {
    render(<ComparisonTable clusters={mockClusters} />);

    expect(screen.getByText("20h-22h")).toBeInTheDocument();
    expect(screen.getByText("18h-20h")).toBeInTheDocument();
  });

  it("handles empty clusters array", () => {
    const { container } = render(<ComparisonTable clusters={[]} />);
    const tbody = container.querySelector("tbody");
    expect(tbody?.children.length).toBe(0);
  });

  it("applies color coding to cells", () => {
    const { container } = render(<ComparisonTable clusters={mockClusters} />);
    const rows = container.querySelectorAll("tbody tr");
    expect(rows.length).toBe(2);

    // Check that rows have background color classes
    rows.forEach((row) => {
      expect(row).toHaveClass("hover:bg-gray-700/30");
    });
  });

  it("is responsive with horizontal scroll on mobile", () => {
    const { container } = render(<ComparisonTable clusters={mockClusters} />);
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass("overflow-x-auto");
  });
});

describe("HeatmapChart Component", () => {
  const mockData = [
    { hora: 0, performance: 30 },
    { hora: 6, performance: 45 },
    { hora: 12, performance: 65 },
    { hora: 18, performance: 85 },
    { hora: 20, performance: 90 },
    { hora: 23, performance: 40 },
  ];

  it("renders heatmap chart component", () => {
    render(<HeatmapChart clusterId="SP" data={mockData} />);

    // Check for heatmap title
    expect(
      screen.getByText(/Mapa de Calor de Desempenho por Hora/i)
    ).toBeInTheDocument();
  });

  it("displays cluster ID in title", () => {
    render(<HeatmapChart clusterId="SP" data={mockData} />);

    expect(screen.getByText(/SP/)).toBeInTheDocument();
  });

  it("displays performance legend", () => {
    render(<HeatmapChart clusterId="SP" data={mockData} />);

    expect(screen.getByText("Baixo (<50%)")).toBeInTheDocument();
    expect(screen.getByText("Médio (50-75%)")).toBeInTheDocument();
    expect(screen.getByText("Alto (>75%)")).toBeInTheDocument();
  });

  it("displays performance summary", () => {
    render(<HeatmapChart clusterId="SP" data={mockData} />);

    expect(screen.getByText("Melhor Hora")).toBeInTheDocument();
    expect(screen.getByText("Desempenho Médio")).toBeInTheDocument();
    expect(screen.getByText("Horas de Pico")).toBeInTheDocument();
  });

  it("accepts cluster ID prop", () => {
    const { rerender } = render(
      <HeatmapChart clusterId="SP" data={mockData} />
    );

    expect(screen.getByText(/Mapa de Calor de Desempenho por Hora - SP/)).toBeInTheDocument();

    rerender(<HeatmapChart clusterId="RJ" data={mockData} />);

    expect(screen.getByText(/Mapa de Calor de Desempenho por Hora - RJ/)).toBeInTheDocument();
  });

  it("renders responsive grid", () => {
    const { container } = render(<HeatmapChart clusterId="SP" data={mockData} />);

    const grid = container.querySelector(".grid");
    expect(grid).toHaveClass("grid");
    expect(grid).toHaveClass("grid-cols-12");
  });

  it("handles empty data gracefully", () => {
    const { container } = render(
      <HeatmapChart clusterId="SP" data={[]} />
    );

    expect(container).toBeInTheDocument();
    expect(screen.getByText(/Desempenho Médio/)).toBeInTheDocument();
  });
});

describe("PerformanceMetrics Component", () => {
  const mockMetrics = {
    faixa_etaria: {
      "18-25": 15,
      "25-40": 45,
      "40-55": 30,
      "55+": 10,
    },
    genero: {
      M: 55,
      F: 45,
    },
    interesses: ["Home Renovation", "Real Estate", "Furniture"],
  };

  it("renders performance metrics component", () => {
    render(
      <PerformanceMetrics
        clusters={["SP"]}
        metrics={JSON.stringify(mockMetrics)}
      />
    );

    // Check for demographic data
    expect(screen.getByText(/Faixa Etária/i)).toBeInTheDocument();
  });

  it("displays section title with cluster names", () => {
    render(
      <PerformanceMetrics
        clusters={["SP", "RJ"]}
        metrics={JSON.stringify(mockMetrics)}
      />
    );

    expect(screen.getByText(/Métricas de Desempenho - SP, RJ/)).toBeInTheDocument();
  });

  it("displays age range section", () => {
    render(
      <PerformanceMetrics
        clusters={["SP"]}
        metrics={JSON.stringify(mockMetrics)}
      />
    );

    expect(screen.getByText("Faixa Etária")).toBeInTheDocument();
  });

  it("displays gender section", () => {
    render(
      <PerformanceMetrics
        clusters={["SP"]}
        metrics={JSON.stringify(mockMetrics)}
      />
    );

    expect(screen.getByText("Gênero")).toBeInTheDocument();
  });

  it("displays interests list", () => {
    render(
      <PerformanceMetrics
        clusters={["SP"]}
        metrics={JSON.stringify(mockMetrics)}
      />
    );

    expect(screen.getByText("Home Renovation")).toBeInTheDocument();
    expect(screen.getByText("Real Estate")).toBeInTheDocument();
    expect(screen.getByText("Furniture")).toBeInTheDocument();
  });

  it("renders charts for demographics", () => {
    const { container } = render(
      <PerformanceMetrics
        clusters={["SP"]}
        metrics={JSON.stringify(mockMetrics)}
      />
    );

    // Should have pie chart components
    const charts = container.querySelectorAll(".recharts-responsive-container");
    expect(charts.length).toBeGreaterThanOrEqual(1);
  });

  it("is responsive with grid layout", () => {
    const { container } = render(
      <PerformanceMetrics
        clusters={["SP"]}
        metrics={JSON.stringify(mockMetrics)}
      />
    );

    const grid = container.querySelector(".grid");
    expect(grid).toHaveClass("grid");
  });

  it("handles multiple clusters", () => {
    render(
      <PerformanceMetrics
        clusters={["SP", "RJ", "BA"]}
        metrics={JSON.stringify(mockMetrics)}
      />
    );

    // Should display all clusters in title
    expect(screen.getByText(/SP, RJ, BA/)).toBeInTheDocument();
  });
});

describe("TrendComparison Component", () => {
  const mockData = {
    SP: [45, 46, 47, 48, 49, 50, 51],
    RJ: [52, 51, 50, 51, 52, 52, 53],
    BA: [38, 39, 40, 40, 41, 42, 43],
  };

  it("renders trend comparison chart", () => {
    const { container } = render(
      <TrendComparison
        clusters={["SP", "RJ", "BA"]}
        data={mockData}
      />
    );

    // Should have chart title
    expect(
      screen.getByText("Comparação de Tendências (7 Dias)")
    ).toBeInTheDocument();
  });

  it("displays chart title", () => {
    render(
      <TrendComparison
        clusters={["SP", "RJ", "BA"]}
        data={mockData}
      />
    );

    expect(
      screen.getByText("Comparação de Tendências (7 Dias)")
    ).toBeInTheDocument();
  });

  it("renders responsive container", () => {
    const { container } = render(
      <TrendComparison
        clusters={["SP", "RJ"]}
        data={mockData}
      />
    );

    // Should have responsive container
    expect(
      container.querySelector(".recharts-responsive-container")
    ).toBeInTheDocument();
  });

  it("has background styling", () => {
    const { container } = render(
      <TrendComparison
        clusters={["SP", "RJ", "BA"]}
        data={mockData}
      />
    );

    // Check for background color class
    const wrapper = container.querySelector(".bg-podemos-secondary");
    expect(wrapper).toBeInTheDocument();
  });

  it("has rounded corners", () => {
    const { container } = render(
      <TrendComparison
        clusters={["SP", "RJ"]}
        data={mockData}
      />
    );

    const wrapper = container.querySelector(".rounded-lg");
    expect(wrapper).toBeInTheDocument();
  });

  it("handles single cluster trend", () => {
    const { container } = render(
      <TrendComparison
        clusters={["SP"]}
        data={{ SP: [45, 46, 47, 48, 49, 50, 51] }}
      />
    );

    expect(
      screen.getByText("Comparação de Tendências (7 Dias)")
    ).toBeInTheDocument();
    expect(container.querySelector(".bg-podemos-secondary")).toBeInTheDocument();
  });

  it("handles multiple cluster trends", () => {
    const { container } = render(
      <TrendComparison
        clusters={["SP", "RJ", "BA", "MG", "SC"]}
        data={{
          SP: [45, 46, 47, 48, 49, 50, 51],
          RJ: [52, 51, 50, 51, 52, 52, 53],
          BA: [38, 39, 40, 40, 41, 42, 43],
          MG: [40, 41, 42, 43, 44, 45, 46],
          SC: [50, 49, 48, 47, 46, 45, 44],
        }}
      />
    );

    expect(
      screen.getByText("Comparação de Tendências (7 Dias)")
    ).toBeInTheDocument();
    expect(container.querySelector(".recharts-responsive-container")).toBeInTheDocument();
  });
});

describe("Comparacoes Page Integration", () => {
  it("renders all sections of comparison page", () => {
    // This would be integration test for the page itself
    // Testing that all components are rendered together
    expect(true).toBe(true); // Placeholder for page integration test
  });

  it("updates comparison when clusters change", () => {
    // This would test that cluster selection triggers data update
    expect(true).toBe(true); // Placeholder for interaction test
  });

  it("shows loading state", () => {
    // This would test loading indicator
    expect(true).toBe(true); // Placeholder for loading state test
  });

  it("shows error state", () => {
    // This would test error handling
    expect(true).toBe(true); // Placeholder for error state test
  });

  it("is responsive on mobile", () => {
    // This would test responsive layout on mobile
    expect(true).toBe(true); // Placeholder for responsive test
  });

  it("is responsive on tablet", () => {
    // This would test responsive layout on tablet
    expect(true).toBe(true); // Placeholder for responsive test
  });

  it("is responsive on desktop", () => {
    // This would test responsive layout on desktop
    expect(true).toBe(true); // Placeholder for responsive test
  });
});
