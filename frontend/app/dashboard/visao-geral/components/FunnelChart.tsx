"use client";

import type { Totals } from "@/lib/compute";

interface Props {
  totals: Totals;
}

export default function FunnelChart({ totals }: Props) {
  const stages = [
    { name: "Alcance", value: totals.alcance },
    { name: "Impressões", value: totals.impressoes },
    { name: "Cliques", value: totals.cliques },
    { name: "Leads", value: totals.leads },
  ];
  const max = Math.max(...stages.map((s) => s.value), 1);

  return (
    <div className="bg-podemos-secondary rounded-lg p-6">
      <h3 className="text-white font-bold mb-4">Funil de Conversão</h3>
      <div className="space-y-3">
        {stages.map((s) => {
          const pct = (s.value / max) * 100;
          return (
            <div key={s.name}>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-300">{s.name}</span>
                <span className="text-sm font-bold text-podemos-accent">
                  {s.value.toLocaleString("pt-BR")}
                </span>
              </div>
              <div className="h-7 bg-gray-700 rounded overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-podemos-accent to-podemos-primary transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
