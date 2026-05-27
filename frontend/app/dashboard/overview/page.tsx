"use client";

import { useState, useEffect } from "react";
import { useOverview, useAvailableAccounts, useDashboardExport } from "@/lib/api";
import DashboardFilters from "../components/DashboardFilters";
import ExportButton from "../components/ExportButton";
import { RealtimeStatus, useRealtimeUpdates } from "@/lib/realtime";
import KPICards from "./components/KPICards";
import AlertsSection from "./components/AlertsSection";
import MetricsGrid from "./components/MetricsGrid";
import FunnelChart from "./components/FunnelChart";
import CpeeClassification from "./components/CpeeClassification";
import TrendChart from "./components/TrendChart";
import TopClusters from "./components/TopClusters";

export default function OverviewPage() {
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });

  const { data: accountsData, isLoading: accountsLoading } = useAvailableAccounts();
  const { data, isLoading, error } = useOverview({
    accounts: selectedAccounts.length > 0 ? selectedAccounts : accountsData,
    startDate: dateRange.start,
    endDate: dateRange.end,
  });

  const { data: exportData } = useDashboardExport({
    accounts: selectedAccounts.length > 0 ? selectedAccounts : accountsData,
    startDate: dateRange.start,
    endDate: dateRange.end,
  });

  const { isConnected, updateSource } = useRealtimeUpdates(
    ["overview", "snapshots"],
    "snapshots_diarios",
    30000
  );

  // Initialize selected accounts when accounts data loads
  useEffect(() => {
    if (accountsData && accountsData.length > 0 && selectedAccounts.length === 0) {
      setSelectedAccounts(accountsData);
    }
  }, [accountsData, selectedAccounts]);

  if (isLoading || accountsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-400">Carregando dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-red-500">Erro ao carregar dados</p>
      </div>
    );
  }

  if (!data || !accountsData) return null;

  // Prepare export data
  const exportColumns = [
    { key: "data", label: "Data" },
    { key: "account_id", label: "Conta" },
    { key: "spend", label: "Gasto (R$)" },
    { key: "impressoes", label: "Impressões" },
    { key: "cliques", label: "Cliques" },
    { key: "leads", label: "Leads" },
    { key: "cpee", label: "CPEE" },
    { key: "ctr", label: "CTR (%)" },
    { key: "cpc", label: "CPC (R$)" },
    { key: "cpm", label: "CPM (R$)" },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Visão Geral - Campanha Principal</h1>
            <p className="text-gray-400">
              Resumo executivo de {dateRange.start} a {dateRange.end}
            </p>
          </div>
          <div className="text-right">
            <RealtimeStatus isConnected={isConnected} updateSource={updateSource} />
          </div>
        </div>

        {/* Filters and Export */}
        <DashboardFilters
          accounts={accountsData}
          selectedAccounts={selectedAccounts}
          onAccountsChange={setSelectedAccounts}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          isLoading={isLoading}
        />

        {/* Export Button */}
        <div className="flex justify-end mb-6">
          <ExportButton
            data={exportData?.snapshots || []}
            columns={exportColumns}
            title={`Dashboard CPEE - ${dateRange.start} a ${dateRange.end}`}
            isLoading={isLoading}
          />
        </div>
      </div>

      <KPICards kpis={data.kpis.slice(0, 5)} />

      <AlertsSection alerts={data.alerts} recommendations={data.recommendations} />

      <MetricsGrid kpis={data.kpis} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <FunnelChart
          data={[
            { stage: "Alcance", value: 4600000 },
            { stage: "Impressões", value: 6200000 },
            { stage: "Engajamento", value: 4700000 },
            { stage: "Cliques", value: 125000 },
            { stage: "Leads", value: 876 },
          ]}
        />
        <CpeeClassification hot={5} warm={8} cold={3} pending={2} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <TrendChart title="Tendência CPEE (7 dias)" data={data.cpee_trend} />
        <TrendChart
          title="Gasto Diário (7 dias)"
          data={data.budget_breakdown.map((b, idx) => ({
            date: `Dia ${idx + 1}`,
            value: b.value as number,
          }))}
        />
      </div>

      <TopClusters clusters={data.top_clusters} />
    </div>
  );
}
