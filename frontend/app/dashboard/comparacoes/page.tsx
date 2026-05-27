"use client";

import { useState, useMemo } from "react";
import { useComparacao } from "@/lib/api";
import ClusterSelector from "./components/ClusterSelector";
import ComparisonTable from "./components/ComparisonTable";
import HeatmapChart from "./components/HeatmapChart";
import PerformanceMetrics from "./components/PerformanceMetrics";
import TrendComparison from "./components/TrendComparison";

const AVAILABLE_CLUSTERS = ["SP", "RJ", "BA", "MG", "SC", "RS", "PE"];

interface HeatmapData {
  hora: number;
  performance: number;
}

export default function ComparacoesPage() {
  const [selectedClusters, setSelectedClusters] = useState<string[]>(["SP", "RJ"]);
  const { data, isLoading, error } = useComparacao(selectedClusters);

  // Mock heatmap data for each cluster
  const heatmapData: { [key: string]: HeatmapData[] } = useMemo(() => {
    return {
      SP: Array.from({ length: 24 }, (_, i) => ({
        hora: i,
        performance: 30 + Math.sin(i / 4) * 40 + Math.random() * 20,
      })),
      RJ: Array.from({ length: 24 }, (_, i) => ({
        hora: i,
        performance: 35 + Math.sin(i / 5) * 35 + Math.random() * 25,
      })),
      BA: Array.from({ length: 24 }, (_, i) => ({
        hora: i,
        performance: 25 + Math.cos(i / 3) * 35 + Math.random() * 20,
      })),
      MG: Array.from({ length: 24 }, (_, i) => ({
        hora: i,
        performance: 40 + Math.sin(i / 6) * 30 + Math.random() * 15,
      })),
      SC: Array.from({ length: 24 }, (_, i) => ({
        hora: i,
        performance: 45 + Math.cos(i / 4) * 25 + Math.random() * 20,
      })),
      RS: Array.from({ length: 24 }, (_, i) => ({
        hora: i,
        performance: 38 + Math.sin(i / 5) * 35 + Math.random() * 20,
      })),
      PE: Array.from({ length: 24 }, (_, i) => ({
        hora: i,
        performance: 30 + Math.cos(i / 4) * 40 + Math.random() * 25,
      })),
    };
  }, []);

  // Mock trend data for each cluster (7 days)
  const trendData: { [key: string]: number[] } = useMemo(() => {
    return {
      SP: [45, 46, 47, 48, 49, 50, 51],
      RJ: [52, 51, 50, 51, 52, 52, 53],
      BA: [38, 39, 40, 40, 41, 42, 43],
      MG: [40, 41, 42, 43, 44, 45, 46],
      SC: [50, 49, 48, 47, 46, 45, 44],
      RS: [42, 43, 44, 44, 45, 46, 47],
      PE: [35, 36, 37, 38, 39, 40, 41],
    };
  }, []);

  // Mock performance metrics
  const metricsData = {
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
    interesses: ["Home Renovation", "Real Estate", "Interior Design"],
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-400">Carregando comparação...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-red-500">Erro ao carregar dados de comparação</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">
          Análise Comparativa de Clusters
        </h1>
        <p className="text-gray-400">Compare múltiplos clusters em detalhes com heatmaps e tendências</p>
      </div>

      {/* Section 1: Cluster Selection */}
      <ClusterSelector
        clusters={AVAILABLE_CLUSTERS}
        selectedClusters={selectedClusters}
        onChange={setSelectedClusters}
      />

      {/* Section 2: Comparison Table */}
      {data && data.clusters.length > 0 && (
        <ComparisonTable clusters={data.clusters} />
      )}

      {/* Section 3: Heatmaps and Performance Metrics */}
      {selectedClusters.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Left column: First cluster heatmap */}
          <div>
            <HeatmapChart
              clusterId={selectedClusters[0]}
              data={heatmapData[selectedClusters[0]] || []}
            />
          </div>

          {/* Right column: Performance Metrics */}
          <div>
            <PerformanceMetrics
              clusters={selectedClusters}
              metrics={JSON.stringify(metricsData)}
            />
          </div>
        </div>
      )}

      {/* Additional heatmaps for other selected clusters */}
      {selectedClusters.length > 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {selectedClusters.slice(1).map((cluster) => (
            <HeatmapChart
              key={`heatmap-${cluster}`}
              clusterId={cluster}
              data={heatmapData[cluster] || []}
            />
          ))}
        </div>
      )}

      {/* Section 4: Trend Comparison */}
      {selectedClusters.length > 0 && (
        <TrendComparison
          clusters={selectedClusters}
          data={trendData}
        />
      )}
    </div>
  );
}
