"use client";

import { useState } from "react";

interface ClusterSelectorProps {
  clusters: string[];
  selectedClusters: string[];
  onChange: (selected: string[]) => void;
}

export default function ClusterSelector({
  clusters,
  selectedClusters,
  onChange,
}: ClusterSelectorProps) {
  const toggle = (cluster: string) => {
    const updated = selectedClusters.includes(cluster)
      ? selectedClusters.filter((c) => c !== cluster)
      : [...selectedClusters, cluster].slice(0, 5); // max 5
    onChange(updated);
  };

  return (
    <div className="bg-podemos-secondary rounded-lg p-6 mb-6">
      <h3 className="text-white font-bold mb-4">
        Selecione Clusters para Comparar (máx. 5)
      </h3>
      <div className="flex flex-wrap gap-2">
        {clusters.map((cluster) => (
          <button
            key={cluster}
            onClick={() => toggle(cluster)}
            className={`px-4 py-2 rounded transition ${
              selectedClusters.includes(cluster)
                ? "bg-podemos-primary text-white font-bold"
                : "bg-gray-700 text-white hover:bg-gray-600"
            }`}
          >
            {cluster}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-3">
        {selectedClusters.length}/5 selecionados
      </p>
    </div>
  );
}
