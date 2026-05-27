"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface TrendComparisonProps {
  clusters: string[];
  data: { [key: string]: number[] };
}

const COLORS = ["#E74C3C", "#F39C12", "#27AE60", "#3498DB", "#9B59B6"];

export default function TrendComparison({
  clusters,
  data,
}: TrendComparisonProps) {
  // Transform data from { cluster: [values] } to array of { day: X, cluster1: Y, cluster2: Z }
  const maxDays = Math.max(
    ...clusters.map((c) => data[c]?.length || 0)
  );

  const chartData = Array.from({ length: maxDays }, (_, i) => ({
    day: `Dia ${i + 1}`,
    ...Object.fromEntries(
      clusters.map((c) => [c, data[c]?.[i] ?? null])
    ),
  }));

  return (
    <div className="bg-podemos-secondary rounded-lg p-6 mb-6">
      <h3 className="text-white font-bold mb-4">
        Comparação de Tendências (7 Dias)
      </h3>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis dataKey="day" stroke="#888" />
          <YAxis stroke="#888" />
          <Tooltip
            contentStyle={{
              backgroundColor: "#2C3E50",
              border: "1px solid #E74C3C",
              borderRadius: "4px",
            }}
            labelStyle={{ color: "#fff" }}
          />
          <Legend
            wrapperStyle={{ paddingTop: "20px" }}
            iconType="line"
          />
          {clusters.map((cluster, idx) => (
            <Line
              key={cluster}
              type="monotone"
              dataKey={cluster}
              stroke={COLORS[idx % COLORS.length]}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
