"use client";

interface TopCluster {
  cluster: string;
  eem: number;
  cpee: number;
  gasto: number;
}

interface TopClustersProps {
  clusters: TopCluster[];
}

export default function TopClusters({ clusters }: TopClustersProps) {
  return (
    <div className="bg-podemos-secondary rounded-lg p-6">
      <h3 className="text-white font-bold mb-4">Top 5 Clusters</h3>
      <div className="space-y-2">
        {clusters.map((cluster, idx) => {
          const temperature = cluster.eem >= 2.0 ? "🔥" : cluster.eem >= 0.8 ? "🟡" : "🔵";
          return (
            <div key={idx} className="flex justify-between items-center p-2 border-b border-gray-700">
              <div>
                <p className="text-white font-bold">{temperature} {cluster.cluster}</p>
                <p className="text-xs text-gray-400">EEM: {cluster.eem.toFixed(2)} | CPEE: R${cluster.cpee.toFixed(2)}</p>
              </div>
              <p className="text-podemos-accent font-bold">R${cluster.gasto.toLocaleString()}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
