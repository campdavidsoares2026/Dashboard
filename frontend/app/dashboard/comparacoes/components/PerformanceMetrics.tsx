"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface PerformanceMetricsProps {
  clusters: string[];
  metrics: string;
}

interface MetricsData {
  faixa_etaria?: { [key: string]: number };
  genero?: { [key: string]: number };
  interesses?: string[];
}

const COLORS = ["#E74C3C", "#F39C12", "#27AE60", "#3498DB"];

export default function PerformanceMetrics({
  clusters,
  metrics,
}: PerformanceMetricsProps) {
  let metricsData: MetricsData = {};

  try {
    metricsData = JSON.parse(metrics);
  } catch (e) {
    metricsData = {
      faixa_etaria: { "18-25": 15, "25-40": 45, "40-55": 30, "55+": 10 },
      genero: { M: 55, F: 45 },
      interesses: ["Home Renovation", "Real Estate", "Furniture"],
    };
  }

  const faixaEtariaData = metricsData.faixa_etaria
    ? Object.entries(metricsData.faixa_etaria).map(([key, value]) => ({
        name: key,
        value: value as number,
      }))
    : [];

  const generoData = metricsData.genero
    ? Object.entries(metricsData.genero).map(([key, value]) => ({
        name: key === "M" ? "Masculino" : "Feminino",
        value: value as number,
      }))
    : [];

  return (
    <div className="bg-podemos-secondary rounded-lg p-6 mb-6">
      <h3 className="text-white font-bold mb-6">
        Métricas de Desempenho - {clusters.join(", ")}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Faixa Etária */}
        <div>
          <h4 className="text-podemos-primary font-bold mb-4 text-sm">
            Faixa Etária
          </h4>
          {faixaEtariaData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={faixaEtariaData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {faixaEtariaData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#2C3E50",
                    border: "1px solid #E74C3C",
                  }}
                  formatter={(value) => `${value}%`}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-gray-400 text-sm">Sem dados disponíveis</div>
          )}
        </div>

        {/* Gênero */}
        <div>
          <h4 className="text-podemos-accent font-bold mb-4 text-sm">
            Gênero
          </h4>
          {generoData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={generoData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {generoData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#2C3E50",
                    border: "1px solid #F39C12",
                  }}
                  formatter={(value) => `${value}%`}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-gray-400 text-sm">Sem dados disponíveis</div>
          )}
        </div>

        {/* Interesses */}
        <div>
          <h4 className="text-podemos-light font-bold mb-4 text-sm">
            Principais Interesses
          </h4>
          <div className="space-y-2">
            {metricsData.interesses && metricsData.interesses.length > 0 ? (
              metricsData.interesses.map((interesse, idx) => (
                <div
                  key={idx}
                  className="bg-gray-700 rounded px-3 py-2 text-sm text-gray-200 flex items-center"
                >
                  <div className="w-2 h-2 rounded-full bg-podemos-accent mr-2" />
                  {interesse}
                </div>
              ))
            ) : (
              <div className="text-gray-400 text-sm">Sem dados disponíveis</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
