"use client";

import { useMemo } from "react";
import type { DemografiaCell } from "@/lib/types";

const AGES = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"] as const;
const GENDERS = [
  { key: "male", label: "Homens", color: "#3A589D" },
  { key: "female", label: "Mulheres", color: "#E74C3C" },
  { key: "unknown", label: "N/D", color: "#7A8AAF" },
] as const;

const BRL = (n: number) =>
  n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
const PCT = (n: number, total: number) =>
  total > 0 ? `${((n / total) * 100).toFixed(1)}%` : "—";

interface Props {
  rows: DemografiaCell[];
  accountFilter?: string[];
}

export default function DemografiaChart({ rows, accountFilter }: Props) {
  const filtered = useMemo(
    () =>
      accountFilter && accountFilter.length > 0
        ? rows.filter((r) => accountFilter.includes(r.account_id))
        : rows,
    [rows, accountFilter]
  );

  // Agrega por (age, gender) somando os accounts visíveis
  const grid = useMemo(() => {
    const m = new Map<string, { spend: number; eq: number; cpee: number }>();
    let total = 0;
    for (const r of filtered) {
      const key = `${r.age}|${r.gender}`;
      const cur = m.get(key) ?? { spend: 0, eq: 0, cpee: 0 };
      cur.spend += Number(r.spend) || 0;
      cur.eq += Number(r.eq) || 0;
      m.set(key, cur);
      total += Number(r.spend) || 0;
    }
    // CPEE consolidado por célula
    for (const [k, v] of m) {
      v.cpee = v.eq > 0 ? v.spend / v.eq : 0;
    }
    return { cells: m, total };
  }, [filtered]);

  // Pegar max para escalar barras
  const maxSpend = useMemo(() => {
    let max = 0;
    for (const v of grid.cells.values()) if (v.spend > max) max = v.spend;
    return max;
  }, [grid]);

  if (filtered.length === 0) {
    return (
      <div className="bg-podemos-secondary rounded-lg p-4 mb-6 text-sm text-gray-400">
        Sem dados demográficos no período. (Coleta diária; dados aparecem após
        primeiro cron.)
      </div>
    );
  }

  return (
    <div className="bg-podemos-secondary rounded-lg p-6 mb-6 overflow-x-auto">
      <div className="flex justify-between items-baseline mb-4">
        <h3 className="text-white font-bold">Demografia (últimos 30 dias)</h3>
        <div className="flex gap-4 text-xs">
          {GENDERS.map((g) => (
            <span key={g.key} className="flex items-center gap-2 text-gray-300">
              <span
                className="w-3 h-3 rounded-sm"
                style={{ background: g.color }}
              />
              {g.label}
            </span>
          ))}
        </div>
      </div>

      <table className="w-full text-sm">
        <thead className="border-b border-gray-700">
          <tr className="text-gray-400 text-xs">
            <th className="text-left p-2">Idade</th>
            {GENDERS.map((g) => (
              <th key={g.key} className="text-right p-2">
                {g.label}
              </th>
            ))}
            <th className="text-right p-2">Total</th>
          </tr>
        </thead>
        <tbody>
          {AGES.map((age) => {
            let rowTotal = 0;
            GENDERS.forEach((g) => {
              rowTotal += grid.cells.get(`${age}|${g.key}`)?.spend ?? 0;
            });
            return (
              <tr
                key={age}
                className="border-b border-gray-700/50 hover:bg-podemos-dark/30"
              >
                <td className="p-2 text-white font-medium">{age}</td>
                {GENDERS.map((g) => {
                  const cell = grid.cells.get(`${age}|${g.key}`);
                  const spend = cell?.spend ?? 0;
                  const cpee = cell?.cpee ?? 0;
                  const width = maxSpend > 0 ? (spend / maxSpend) * 100 : 0;
                  return (
                    <td key={g.key} className="p-2">
                      <div className="flex items-center justify-end gap-2">
                        <div className="flex-1 max-w-[120px] h-2 bg-gray-800 rounded overflow-hidden">
                          <div
                            className="h-full"
                            style={{
                              width: `${width}%`,
                              background: g.color,
                              opacity: width > 0 ? 1 : 0.2,
                            }}
                          />
                        </div>
                        <div className="text-right min-w-[70px]">
                          <div className="text-white text-xs font-mono">
                            {BRL(spend)}
                          </div>
                          {cpee > 0 && (
                            <div className="text-gray-500 text-[10px]">
                              CPEE {BRL(cpee)}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  );
                })}
                <td className="p-2 text-right text-podemos-accent font-bold">
                  {PCT(rowTotal, grid.total)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="text-xs text-gray-500 mt-3">
        Total no período:{" "}
        <span className="text-white font-bold">{BRL(grid.total)}</span> ·{" "}
        {filtered.length} célula{filtered.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
