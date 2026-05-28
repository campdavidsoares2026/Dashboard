"use client";

import type { Totals } from "@/lib/compute";

const NUM = (n: number) => n.toLocaleString("pt-BR");
const PCT = (n: number) => `${n.toFixed(2)}%`;
const BRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Props {
  totals: Totals;
}

export default function MetricsGrid({ totals }: Props) {
  const items = [
    { label: "Impressões", value: NUM(totals.impressoes), icon: "👁️" },
    { label: "Alcance", value: NUM(totals.alcance), icon: "👥" },
    { label: "ThruPlay", value: NUM(totals.thruplay), icon: "▶️" },
    { label: "Cliques", value: NUM(totals.cliques), icon: "🖱️" },
    { label: "Frequência", value: totals.frequencia.toFixed(2), icon: "🔄" },
    { label: "CTR", value: PCT(totals.ctr), icon: "📈" },
    { label: "CPC", value: BRL(totals.cpc), icon: "💰" },
    { label: "CPM", value: BRL(totals.cpm), icon: "📊" },
    { label: "CPL", value: BRL(totals.cpl), icon: "🎯" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
      {items.map((m, i) => (
        <div
          key={i}
          className="bg-podemos-secondary rounded-lg p-4 border border-gray-700"
        >
          <p className="text-xs text-gray-400 mb-1">
            {m.icon} {m.label}
          </p>
          <p className="text-xl font-bold text-white">{m.value}</p>
        </div>
      ))}
    </div>
  );
}
