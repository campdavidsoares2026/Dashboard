"use client";

import type { Totals } from "@/lib/compute";

const BRL = (n: number) =>
  n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
const NUM = (n: number) => n.toLocaleString("pt-BR");

interface KPICardsProps {
  totals: Totals;
  alertCount: number;
}

export default function KPICards({ totals, alertCount }: KPICardsProps) {
  const cards = [
    { label: "CPEE Consolidado", value: BRL(totals.cpee), accent: true },
    { label: "Gasto do Período", value: BRL(totals.spend) },
    { label: "Leads", value: NUM(totals.leads) },
    { label: "EQ", value: NUM(totals.eq) },
    {
      label: "Alertas",
      value: String(alertCount),
      accent: alertCount > 0,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
      {cards.map((c, i) => (
        <div
          key={i}
          className="bg-podemos-secondary rounded-lg p-4 border border-podemos-accent/20"
        >
          <p className="text-sm text-gray-400 mb-2">{c.label}</p>
          <p
            className={`text-2xl font-bold ${c.accent ? "text-podemos-accent" : "text-white"}`}
          >
            {c.value}
          </p>
        </div>
      ))}
    </div>
  );
}
