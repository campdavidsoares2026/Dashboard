"use client";

import { KPICard } from "@/lib/api";

interface KPICardsProps {
  kpis: KPICard[];
}

export default function KPICards({ kpis }: KPICardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
      {kpis.map((kpi, idx) => (
        <div
          key={idx}
          className="bg-podemos-secondary rounded-lg p-4 border border-podemos-accent/20"
        >
          <p className="text-sm text-gray-400 mb-2">{kpi.label}</p>
          <p className="text-2xl font-bold text-podemos-accent">
            {kpi.value}
            <span className="text-lg ml-1">{kpi.unit}</span>
          </p>
          {kpi.trend && (
            <p className={`text-sm mt-2 ${kpi.trend_direction === "up" ? "text-green-400" : "text-red-400"}`}>
              {kpi.trend_direction === "up" ? "↑" : "↓"} {Math.abs(kpi.trend)}%
            </p>
          )}
          {kpi.metadata && <p className="text-xs text-gray-500 mt-1">{kpi.metadata}</p>}
        </div>
      ))}
    </div>
  );
}
