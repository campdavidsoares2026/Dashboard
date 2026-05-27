"use client";

import { KPICard } from "@/lib/api";

interface MetricsGridProps {
  kpis: KPICard[];
}

export default function MetricsGrid({ kpis }: MetricsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      {kpis.map((kpi, idx) => (
        <div key={idx} className="bg-podemos-secondary rounded-lg p-4 border border-gray-700 hover:border-podemos-accent transition">
          <p className="text-xs text-gray-400 mb-1">{kpi.label}</p>
          <p className="text-xl font-bold text-white mb-1">{kpi.value}{kpi.unit}</p>
          {kpi.metadata && <p className="text-xs text-podemos-accent">{kpi.metadata}</p>}
        </div>
      ))}
    </div>
  );
}
