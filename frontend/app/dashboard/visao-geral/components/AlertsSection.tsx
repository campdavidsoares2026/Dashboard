"use client";

import type { Alert } from "@/lib/compute";

interface Props {
  alerts: Alert[];
}

export default function AlertsSection({ alerts }: Props) {
  if (alerts.length === 0) {
    return (
      <div className="bg-podemos-secondary rounded-lg p-4 mb-6 text-sm text-gray-400 border-l-4 border-green-500">
        ✓ Sem alertas. Todas as métricas dentro das metas.
      </div>
    );
  }

  return (
    <div className="mb-6">
      <h2 className="text-lg font-bold text-white mb-3">
        Alertas ({alerts.length})
      </h2>
      <div className="space-y-2">
        {alerts.map((a) => (
          <div
            key={a.id}
            className={`p-3 rounded-lg border-l-4 ${
              a.type === "warning"
                ? "bg-red-900/20 border-red-500"
                : a.type === "success"
                  ? "bg-green-900/20 border-green-500"
                  : "bg-blue-900/20 border-blue-500"
            }`}
          >
            <div className="flex justify-between items-start gap-3">
              <div>
                <p className="font-bold text-white text-sm">{a.title}</p>
                <p className="text-xs text-gray-300 mt-1">{a.reason}</p>
              </div>
              <span className="text-xs text-gray-400 whitespace-nowrap">
                {a.cluster}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
