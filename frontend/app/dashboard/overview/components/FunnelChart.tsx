"use client";

interface FunnelData {
  stage: string;
  value: number;
}

interface FunnelChartProps {
  data: FunnelData[];
}

export default function FunnelChart({ data }: FunnelChartProps) {
  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <div className="bg-podemos-secondary rounded-lg p-6 mb-6">
      <h3 className="text-white font-bold mb-4">Funil de Conversão</h3>
      <div className="space-y-3">
        {data.map((item, idx) => {
          const width = (item.value / maxValue) * 100;
          return (
            <div key={idx}>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-300">{item.stage}</span>
                <span className="text-sm font-bold text-podemos-accent">{item.value.toLocaleString()}</span>
              </div>
              <div className="h-8 bg-gray-700 rounded overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-podemos-accent to-podemos-primary transition-all"
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
