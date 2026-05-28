"use client";

import { useMemo, useState } from "react";
import { useAccounts, useMetricasConta, useSnapshots } from "@/lib/queries";
import {
  aggregateSnapshots,
  buildCpeeTrend,
  buildSpendTrend,
  classifyCPEE,
  generateRecommendations,
  predictCpeeNextDays,
} from "@/lib/compute";
import KPICards from "./components/KPICards";
import AlertsSection from "./components/AlertsSection";
import MetricsGrid from "./components/MetricsGrid";
import FunnelChart from "./components/FunnelChart";
import CpeeClassification from "./components/CpeeClassification";
import TrendChart from "./components/TrendChart";
import PredictionCard from "./components/PredictionCard";
import TopClusters from "./components/TopClusters";

const today = new Date().toISOString().slice(0, 10);
const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

const BRL = (n: number) =>
  n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });

export default function VisaoGeralPage() {
  const [start, setStart] = useState(weekAgo);
  const [end, setEnd] = useState(today);
  const [selected, setSelected] = useState<string[]>([]);

  const accountsQ = useAccounts();
  const accountsToUse = selected.length > 0 ? selected : accountsQ.data;
  const snapsQ = useSnapshots({ start, end, accounts: accountsToUse });
  const metricasQ = useMetricasConta();

  const isLoading =
    accountsQ.isLoading || snapsQ.isLoading || metricasQ.isLoading;
  const error = accountsQ.error || snapsQ.error || metricasQ.error;

  const data = useMemo(() => {
    const snaps = snapsQ.data ?? [];
    const metricas = metricasQ.data ?? [];
    const totals = aggregateSnapshots(snaps);
    const cpeeTrend = buildCpeeTrend(snaps);
    const spendTrend = buildSpendTrend(snaps);
    const prediction = predictCpeeNextDays(cpeeTrend, 7);
    const alerts = generateRecommendations(metricas);
    const classCounts = metricas.reduce(
      (acc, m) => {
        const c = m.classificacao_cpee || classifyCPEE(m.cpee);
        if (c === "BOM") acc.bom++;
        else if (c === "MEDIO") acc.medio++;
        else if (c === "RUIM") acc.ruim++;
        else acc.semDados++;
        return acc;
      },
      { bom: 0, medio: 0, ruim: 0, semDados: 0 }
    );
    return { totals, cpeeTrend, spendTrend, prediction, alerts, classCounts };
  }, [snapsQ.data, metricasQ.data]);

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-900/20 border-l-4 border-red-500 p-4 rounded">
          <p className="text-red-300 font-bold">Erro ao carregar dados</p>
          <p className="text-xs text-red-400 mt-2 font-mono">
            {String(error)}
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="h-10 w-64 bg-podemos-secondary rounded animate-pulse mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-24 bg-podemos-secondary rounded animate-pulse"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-podemos-secondary rounded animate-pulse" />
          <div className="h-64 bg-podemos-secondary rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-1">Visão Geral</h1>
        <p className="text-sm text-gray-400">
          {start} → {end} · {(accountsToUse ?? []).length} conta(s)
        </p>
      </div>

      <div className="bg-podemos-secondary rounded-lg p-4 mb-6 flex flex-wrap gap-3 items-end">
        <label className="text-sm text-gray-300">
          De
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="ml-2 px-2 py-1 bg-podemos-dark text-white rounded border border-gray-700"
          />
        </label>
        <label className="text-sm text-gray-300">
          Até
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="ml-2 px-2 py-1 bg-podemos-dark text-white rounded border border-gray-700"
          />
        </label>
        <div className="flex flex-wrap gap-2 ml-auto">
          {(accountsQ.data ?? []).map((a) => {
            const active = selected.length === 0 || selected.includes(a);
            return (
              <button
                key={a}
                onClick={() =>
                  setSelected((prev) =>
                    prev.includes(a)
                      ? prev.filter((x) => x !== a)
                      : [...prev, a]
                  )
                }
                className={`text-xs px-3 py-1 rounded border transition ${
                  active
                    ? "bg-podemos-accent text-black border-podemos-accent"
                    : "bg-transparent text-gray-400 border-gray-700"
                }`}
              >
                {a.slice(-4)}
              </button>
            );
          })}
        </div>
      </div>

      <KPICards totals={data.totals} alertCount={data.alerts.length} />
      <AlertsSection alerts={data.alerts} />
      <MetricsGrid totals={data.totals} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <FunnelChart totals={data.totals} />
        <CpeeClassification
          bom={data.classCounts.bom}
          medio={data.classCounts.medio}
          ruim={data.classCounts.ruim}
          semDados={data.classCounts.semDados}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <TrendChart
          title="CPEE — últimos dias"
          data={data.cpeeTrend}
          format={BRL}
        />
        <TrendChart
          title="Gasto diário"
          data={data.spendTrend}
          color="#F39C12"
          format={BRL}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <PredictionCard prediction={data.prediction} />
        <TopClusters accounts={accountsToUse} />
      </div>
    </div>
  );
}
