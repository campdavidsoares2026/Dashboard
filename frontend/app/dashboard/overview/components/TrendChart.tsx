"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface TrendData {
  date: string;
  value: number;
}

interface TrendChartProps {
  data: TrendData[];
  title: string;
}

export default function TrendChart({ data, title }: TrendChartProps) {
  return (
    <div className="bg-podemos-secondary rounded-lg p-6 mb-6">
      <h3 className="text-white font-bold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis dataKey="date" stroke="#888" />
          <YAxis stroke="#888" />
          <Tooltip contentStyle={{ backgroundColor: "#2C3E50", border: "1px solid #E74C3C" }} />
          <Line type="monotone" dataKey="value" stroke="#E74C3C" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
