"use client";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";

interface HeatmapData {
  hora: number;
  performance: number;
}

interface HeatmapChartProps {
  clusterId: string;
  data: HeatmapData[];
}

const getHeatColor = (value: number): string => {
  if (value >= 75) return "#27AE60"; // Green - hot/high performance
  if (value >= 50) return "#F39C12"; // Orange - warm/medium performance
  return "#E74C3C"; // Red - cold/low performance
};

export default function HeatmapChart({
  clusterId,
  data,
}: HeatmapChartProps) {
  // Create grid data for heatmap display
  const gridData = Array.from({ length: 24 }, (_, hour) => {
    const dataPoint = data.find((d) => d.hora === hour);
    return {
      hour,
      performance: dataPoint?.performance ?? 50,
      label: `${String(hour).padStart(2, "0")}:00`,
    };
  });

  const getPerformanceLevel = (value: number): string => {
    if (value >= 75) return "Alto";
    if (value >= 50) return "Médio";
    return "Baixo";
  };

  return (
    <div className="bg-podemos-secondary rounded-lg p-6 mb-6">
      <h3 className="text-white font-bold mb-4">
        Mapa de Calor de Desempenho por Hora - {clusterId}
      </h3>

      {/* Visual Heatmap Grid */}
      <div className="mb-6">
        <div className="grid grid-cols-12 gap-1">
          {gridData.map((item) => (
            <div
              key={item.hour}
              className="flex flex-col items-center"
              title={`${item.label}: ${item.performance}%`}
            >
              <div
                className="w-full aspect-square rounded cursor-pointer hover:opacity-80 transition flex items-center justify-center text-xs font-bold text-white"
                style={{
                  backgroundColor: getHeatColor(item.performance),
                }}
              >
                <span className="hidden lg:inline">{item.hour}</span>
              </div>
              <span className="text-xs text-gray-400 mt-1">
                {String(item.hour).padStart(2, "0")}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-6 text-sm">
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded"
            style={{ backgroundColor: "#E74C3C" }}
          />
          <span className="text-gray-300">Baixo (&lt;50%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded"
            style={{ backgroundColor: "#F39C12" }}
          />
          <span className="text-gray-300">Médio (50-75%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded"
            style={{ backgroundColor: "#27AE60" }}
          />
          <span className="text-gray-300">Alto (&gt;75%)</span>
        </div>
      </div>

      {/* Performance Chart */}
      <div className="mt-6">
        <h4 className="text-gray-300 text-sm font-semibold mb-4">
          Detalhe de Desempenho por Hora
        </h4>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart
            margin={{ top: 20, right: 20, bottom: 60, left: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis
              type="number"
              dataKey="hour"
              name="Hora"
              stroke="#888"
              domain={[0, 23]}
              ticks={[0, 3, 6, 9, 12, 15, 18, 21, 23]}
              tickFormatter={(value) => `${String(value).padStart(2, "0")}:00`}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              type="number"
              dataKey="performance"
              name="Performance"
              stroke="#888"
              domain={[0, 100]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#2C3E50",
                border: "1px solid #E74C3C",
                borderRadius: "4px",
              }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => {
                return typeof value === "number" ? [`${value.toFixed(1)}%`, "Performance"] : [];
              }}
              labelFormatter={(value: any) => `${String(value).padStart(2, "0")}:00`}
            />
            <Scatter
              name="Performance"
              data={gridData}
              fill="#E74C3C"
            >
              {gridData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getHeatColor(entry.performance)}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Performance Summary */}
      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="bg-gray-800 rounded p-3">
          <div className="text-xs text-gray-400">Melhor Hora</div>
          <div className="text-white font-bold">
            {
              gridData.reduce((best, current) =>
                current.performance > best.performance ? current : best
              ).label
            }
          </div>
        </div>
        <div className="bg-gray-800 rounded p-3">
          <div className="text-xs text-gray-400">Desempenho Médio</div>
          <div className="text-white font-bold">
            {(
              gridData.reduce((sum, item) => sum + item.performance, 0) /
              gridData.length
            ).toFixed(1)}
            %
          </div>
        </div>
        <div className="bg-gray-800 rounded p-3">
          <div className="text-xs text-gray-400">Horas de Pico</div>
          <div className="text-white font-bold">
            {gridData.filter((item) => item.performance >= 75).length}
          </div>
        </div>
      </div>
    </div>
  );
}
