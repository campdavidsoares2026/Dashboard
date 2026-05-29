"use client";

import { useMemo, useState } from "react";
import type { HorarioCell } from "@/lib/types";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const METRICS = [
  { key: "spend", label: "Gasto", fmt: (n: number) => `R$ ${n.toFixed(0)}` },
  { key: "ctr", label: "CTR", fmt: (n: number) => `${n.toFixed(2)}%` },
  { key: "cpc", label: "CPC", fmt: (n: number) => `R$ ${n.toFixed(2)}` },
  { key: "impressoes", label: "Impressões", fmt: (n: number) => n.toLocaleString("pt-BR") },
  { key: "cliques", label: "Cliques", fmt: (n: number) => n.toLocaleString("pt-BR") },
] as const;

interface Props {
  rows: HorarioCell[];
  accountFilter?: string[];
}

export default function HorariosHeatmap({ rows, accountFilter }: Props) {
  const [metric, setMetric] = useState<(typeof METRICS)[number]["key"]>("spend");

  const filtered = useMemo(
    () =>
      accountFilter && accountFilter.length > 0
        ? rows.filter((r) => accountFilter.includes(r.account_id))
        : rows,
    [rows, accountFilter]
  );

  // Agrega por hora (somando accounts)
  const byHour = useMemo(() => {
    const m = new Map<number, { spend: number; impressoes: number; cliques: number; ctr: number; cpc: number }>();
    for (let h = 0; h < 24; h++) m.set(h, { spend: 0, impressoes: 0, cliques: 0, ctr: 0, cpc: 0 });
    for (const r of filtered) {
      const cur = m.get(r.hora_int);
      if (!cur) continue;
      cur.spend += Number(r.spend) || 0;
      cur.impressoes += Number(r.impressoes) || 0;
      cur.cliques += Number(r.cliques) || 0;
    }
    // CTR/CPC computados sobre o agregado, não média simples
    for (const v of m.values()) {
      v.ctr = v.impressoes > 0 ? (v.cliques / v.impressoes) * 100 : 0;
      v.cpc = v.cliques > 0 ? v.spend / v.cliques : 0;
    }
    return m;
  }, [filtered]);

  // Max/min para escalar a cor
  const { min, max } = useMemo(() => {
    let mx = 0,
      mn = Number.POSITIVE_INFINITY;
    for (const v of byHour.values()) {
      const n = (v as Record<string, number>)[metric];
      if (n > mx) mx = n;
      if (n > 0 && n < mn) mn = n;
    }
    if (mn === Number.POSITIVE_INFINITY) mn = 0;
    return { min: mn, max: mx };
  }, [byHour, metric]);

  if (filtered.length === 0) {
    return (
      <div className="bg-podemos-secondary rounded-lg p-4 mb-6 text-sm text-gray-400">
        Sem dados de horários no período. (Coleta diária.)
      </div>
    );
  }

  // Encontrar pico
  const peak = useMemo(() => {
    let bestH = 0,
      bestV = 0;
    for (const [h, v] of byHour) {
      const n = (v as Record<string, number>)[metric];
      if (n > bestV) {
        bestV = n;
        bestH = h;
      }
    }
    return { hour: bestH, value: bestV };
  }, [byHour, metric]);

  const fmtMetric = METRICS.find((m) => m.key === metric)!.fmt;

  const colorFor = (n: number) => {
    if (n <= 0 || max <= 0) return "rgba(255,255,255,0.04)";
    const t = (n - min) / (max - min || 1);
    // Verde -> Amarelo -> Vermelho conforme melhor->pior. Para "gasto/impressoes"
    // grande = bom (mais reach). Para CPC, grande = ruim. Pra simplificar, sempre
    // gradiente de "frio (baixa atividade)" -> "quente (alta atividade)".
    // hue de 200 (azul) -> 30 (laranja)
    const hue = 200 - t * 170;
    const sat = 70 + t * 20;
    const light = 38 + t * 12;
    return `hsl(${hue}, ${sat}%, ${light}%)`;
  };

  return (
    <div className="bg-podemos-secondary rounded-lg p-6 mb-6">
      <div className="flex justify-between items-baseline mb-4 flex-wrap gap-3">
        <h3 className="text-white font-bold">
          Horários — pico do dia · 24h (últimos 30 dias)
        </h3>
        <div className="flex gap-1 flex-wrap">
          {METRICS.map((m) => (
            <button
              key={m.key}
              onClick={() => setMetric(m.key)}
              className={`text-xs px-2 py-1 rounded transition ${
                metric === m.key
                  ? "bg-podemos-accent text-black font-bold"
                  : "bg-podemos-dark text-gray-400 hover:text-white"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Heatmap horizontal (24 cells) */}
      <div className="grid grid-cols-24 gap-1 mb-3" style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}>
        {HOURS.map((h) => {
          const v = byHour.get(h)!;
          const n = (v as Record<string, number>)[metric];
          const isPeak = h === peak.hour && peak.value > 0;
          return (
            <div
              key={h}
              className="aspect-square rounded flex flex-col items-center justify-center relative"
              style={{
                background: colorFor(n),
                border: isPeak ? "2px solid var(--color-podemos-accent, #F39C12)" : "1px solid rgba(255,255,255,.06)",
              }}
              title={`${h.toString().padStart(2, "0")}h — ${fmtMetric(n)}`}
            >
              <div className="text-[10px] text-white/80 font-mono">
                {h.toString().padStart(2, "0")}
              </div>
              {n > 0 && (
                <div className="text-[9px] text-white font-bold leading-tight px-0.5 truncate w-full text-center">
                  {metric === "spend" ? `R$${n.toFixed(0)}` : metric === "ctr" ? `${n.toFixed(1)}%` : metric === "cpc" ? `R$${n.toFixed(2)}` : n >= 1000 ? `${(n/1000).toFixed(0)}k` : n.toFixed(0)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-between items-center text-xs text-gray-400">
        <span>0h ← madrugada</span>
        <span>
          Pico:{" "}
          <span className="text-podemos-accent font-bold">
            {peak.hour.toString().padStart(2, "0")}h
          </span>{" "}
          ({fmtMetric(peak.value)})
        </span>
        <span>noite → 23h</span>
      </div>
    </div>
  );
}
