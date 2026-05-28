"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Props {
  data: { date: string; value: number }[];
  title: string;
  color?: string;
  format?: (n: number) => string;
}

export default function TrendChart({
  data,
  title,
  color = "#E74C3C",
  format,
}: Props) {
  return (
    <div className="bg-podemos-secondary rounded-lg p-6">
      <h3 className="text-white font-bold mb-4">{title}</h3>
      {data.length === 0 ? (
        <p className="text-sm text-gray-400">Sem dados no período.</p>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis dataKey="date" stroke="#888" fontSize={11} />
            <YAxis stroke="#888" fontSize={11} tickFormatter={format} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#2C3E50",
                border: "1px solid #E74C3C",
              }}
              formatter={(value) => {
                const n = typeof value === "number" ? value : Number(value);
                return format ? format(n) : String(n);
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
