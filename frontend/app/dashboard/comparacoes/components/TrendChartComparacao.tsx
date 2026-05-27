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

interface TrendLine {
  cluster: string;
  color: string;
}

interface TrendChartComparacaoProps {
  data: any[];
  lines: TrendLine[];
}

const colors = ["#E74C3C", "#F39C12", "#27AE60", "#3498DB", "#9B59B6"];

export default function TrendChartComparacao({
  data,
  lines,
}: TrendChartComparacaoProps) {
  return (
    <div className="bg-podemos-secondary rounded-lg p-6 mb-6">
      <h3 className="text-white font-bold mb-4">
        Tendência CPEE (14 dias) - Comparação
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis dataKey="date" stroke="#888" />
          <YAxis stroke="#888" />
          <Tooltip
            contentStyle={{ backgroundColor: "#2C3E50", border: "1px solid #E74C3C" }}
          />
          <Legend />
          {lines.map((line, idx) => (
            <Line
              key={line.cluster}
              type="monotone"
              dataKey={line.cluster}
              stroke={colors[idx % colors.length]}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
