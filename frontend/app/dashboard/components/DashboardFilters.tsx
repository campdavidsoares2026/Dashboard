"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface DashboardFiltersProps {
  accounts: string[];
  selectedAccounts: string[];
  onAccountsChange: (accounts: string[]) => void;
  dateRange: { start: string; end: string };
  onDateRangeChange: (range: { start: string; end: string }) => void;
  isLoading?: boolean;
}

export default function DashboardFilters({
  accounts,
  selectedAccounts,
  onAccountsChange,
  dateRange,
  onDateRangeChange,
  isLoading = false,
}: DashboardFiltersProps) {
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showDatePresets, setShowDatePresets] = useState(false);

  const datePresets = [
    { label: "Últimos 7 dias", days: 7 },
    { label: "Últimos 14 dias", days: 14 },
    { label: "Últimos 30 dias", days: 30 },
    { label: "Últimos 90 dias", days: 90 },
  ];

  const getDateRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    return {
      start: start.toISOString().split("T")[0],
      end: end.toISOString().split("T")[0],
    };
  };

  const toggleAccount = (account: string) => {
    if (selectedAccounts.includes(account)) {
      onAccountsChange(selectedAccounts.filter((a) => a !== account));
    } else {
      onAccountsChange([...selectedAccounts, account]);
    }
  };

  const toggleAllAccounts = () => {
    if (selectedAccounts.length === accounts.length) {
      onAccountsChange([]);
    } else {
      onAccountsChange(accounts);
    }
  };

  return (
    <div className="bg-podemos-secondary border border-podemos-accent/20 rounded-lg p-4 mb-6">
      <div className="flex flex-wrap gap-4 items-center">
        {/* Account Filter */}
        <div className="relative">
          <button
            onClick={() => setShowAccountMenu(!showAccountMenu)}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-podemos-dark border border-podemos-accent/30 rounded hover:border-podemos-accent/50 disabled:opacity-50 transition"
          >
            <span className="text-sm">
              {selectedAccounts.length === 0
                ? "Todas as Contas"
                : `${selectedAccounts.length} Conta${selectedAccounts.length !== 1 ? "s" : ""}`}
            </span>
            <ChevronDown size={16} />
          </button>

          {showAccountMenu && (
            <div className="absolute top-full left-0 mt-2 bg-podemos-dark border border-podemos-accent/30 rounded shadow-lg z-10 min-w-48">
              <div className="p-2">
                <button
                  onClick={toggleAllAccounts}
                  className="w-full text-left px-3 py-2 hover:bg-podemos-accent/10 rounded text-sm text-podemos-accent font-semibold"
                >
                  {selectedAccounts.length === accounts.length ? "Desselecionar Tudo" : "Selecionar Tudo"}
                </button>
                <div className="border-t border-podemos-accent/20 my-2" />
                {accounts.map((account) => (
                  <label
                    key={account}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-podemos-accent/10 rounded cursor-pointer text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selectedAccounts.includes(account)}
                      onChange={() => toggleAccount(account)}
                      className="w-4 h-4"
                    />
                    <span className="text-gray-300">{account}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Date Range Filter */}
        <div className="relative">
          <button
            onClick={() => setShowDatePresets(!showDatePresets)}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-podemos-dark border border-podemos-accent/30 rounded hover:border-podemos-accent/50 disabled:opacity-50 transition text-sm"
          >
            <span>
              {dateRange.start} até {dateRange.end}
            </span>
            <ChevronDown size={16} />
          </button>

          {showDatePresets && (
            <div className="absolute top-full left-0 mt-2 bg-podemos-dark border border-podemos-accent/30 rounded shadow-lg z-10 min-w-48">
              <div className="p-2">
                {datePresets.map((preset) => (
                  <button
                    key={preset.days}
                    onClick={() => {
                      onDateRangeChange(getDateRange(preset.days));
                      setShowDatePresets(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-podemos-accent/10 rounded text-sm text-gray-300 hover:text-white transition"
                  >
                    {preset.label}
                  </button>
                ))}
                <div className="border-t border-podemos-accent/20 my-2" />
                <div className="p-2">
                  <label className="block text-xs text-gray-400 mb-1">Data Inicial</label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) =>
                      onDateRangeChange({ ...dateRange, start: e.target.value })
                    }
                    className="w-full px-2 py-1 bg-podemos-dark border border-podemos-accent/30 rounded text-sm text-white"
                  />
                </div>
                <div className="p-2">
                  <label className="block text-xs text-gray-400 mb-1">Data Final</label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) =>
                      onDateRangeChange({ ...dateRange, end: e.target.value })
                    }
                    className="w-full px-2 py-1 bg-podemos-dark border border-podemos-accent/30 rounded text-sm text-white"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Reset Button */}
        <button
          onClick={() => {
            onAccountsChange(accounts);
            onDateRangeChange(getDateRange(7));
          }}
          disabled={isLoading}
          className="px-4 py-2 bg-podemos-dark border border-podemos-accent/30 rounded hover:border-podemos-accent/50 disabled:opacity-50 transition text-sm text-gray-300 hover:text-white"
        >
          Redefinir
        </button>
      </div>
    </div>
  );
}
