"use client";

import { useState } from "react";
import Link from "next/link";

export default function DashboardLayout() {
  const [activeTab, setActiveTab] = useState("overview");

  const tabs = [
    { id: "overview", label: "📊 Overview", href: "/dashboard/overview" },
    { id: "comparacoes", label: "🔄 Comparações", href: "/dashboard/comparacoes" },
    { id: "insights", label: "🧠 Insights Profundos", href: "/dashboard/insights" },
  ];

  return (
    <div className="min-h-screen bg-podemos-dark">
      <div className="bg-podemos-secondary border-b border-podemos-accent/20 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold text-podemos-accent">CPEE Dashboard</h1>
              <p className="text-sm text-gray-400">Última atualização: há 2 minutos</p>
            </div>
            <div className="text-sm text-gray-400">
              <button className="bg-podemos-accent text-black px-4 py-2 rounded hover:bg-opacity-80">
                Atualizar
              </button>
            </div>
          </div>

          <div className="flex gap-2 border-b border-gray-700">
            {tabs.map((tab) => (
              <Link
                key={tab.id}
                href={tab.href}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 font-medium transition ${
                  activeTab === tab.id
                    ? "text-podemos-accent border-b-2 border-podemos-accent"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Placeholder for child routes */}
      </div>
    </div>
  );
}
