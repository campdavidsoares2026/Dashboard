"use client";

import { Alert } from "@/lib/api";

interface AlertsSectionProps {
  alerts: Alert[];
  recommendations: Alert[];
}

export default function AlertsSection({ alerts, recommendations }: AlertsSectionProps) {
  const all = [...recommendations, ...alerts];

  return (
    <div className="mb-6">
      <h2 className="text-lg font-bold text-white mb-4">Alertas & Recomendações Inteligentes</h2>
      <div className="space-y-3">
        {all.map((alert) => (
          <div
            key={alert.id}
            className={`p-4 rounded-lg border-l-4 ${
              alert.type === "warning"
                ? "bg-red-900/20 border-red-500"
                : alert.type === "success"
                ? "bg-green-900/20 border-green-500"
                : "bg-blue-900/20 border-blue-500"
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-bold text-white">{alert.title}</p>
                <p className="text-sm text-gray-300">{alert.reason}</p>
              </div>
              {alert.sentiment && <span className="text-xs bg-podemos-accent text-black px-2 py-1 rounded">{alert.sentiment}</span>}
            </div>
            <div className="flex gap-2">
              {alert.actions.map((action, idx) => (
                <button
                  key={idx}
                  className="text-xs bg-podemos-accent text-black px-3 py-1 rounded hover:bg-opacity-80"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
