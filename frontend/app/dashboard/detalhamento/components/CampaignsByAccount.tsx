"use client";

import type { MetricaConta, Criativo } from "@/lib/types";

const BRL = (n: number) =>
  n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });

interface Props {
  metricas: MetricaConta[];
  criativos: Criativo[];
  accountFilter?: string[];
}

export default function CampaignsByAccount({
  metricas,
  criativos,
  accountFilter,
}: Props) {
  const accounts =
    accountFilter && accountFilter.length > 0
      ? metricas.filter((m) => accountFilter.includes(m.account_id))
      : metricas;

  if (accounts.length === 0) {
    return (
      <div className="bg-podemos-secondary rounded-lg p-4 mb-6 text-sm text-gray-400">
        Sem contas no filtro atual.
      </div>
    );
  }

  return (
    <div className="bg-podemos-secondary rounded-lg p-6 mb-6">
      <h3 className="text-white font-bold mb-4">Campanhas por Conta</h3>
      <div className="space-y-6">
        {accounts.map((m) => {
          const creats = criativos
            .filter((c) => c.account_id === m.account_id)
            .slice(0, 5);
          return (
            <div
              key={m.account_id}
              className="border border-gray-700 rounded p-4"
            >
              <div className="flex justify-between items-baseline mb-3">
                <h4 className="text-podemos-accent font-bold">{m.nome}</h4>
                <span className="text-sm text-gray-400">{BRL(m.spend)}</span>
              </div>
              <div className="text-xs text-gray-400 mb-3 flex flex-wrap gap-4">
                <span>
                  CPEE:{" "}
                  <strong className="text-white">{BRL(m.cpee)}</strong>
                </span>
                <span>
                  CTR:{" "}
                  <strong className="text-white">
                    {m.ctr.toFixed(2)}%
                  </strong>
                </span>
                <span>
                  CPC: <strong className="text-white">{BRL(m.cpc)}</strong>
                </span>
                <span>
                  Leads: <strong className="text-white">{m.leads}</strong>
                </span>
                <span>
                  Impressões:{" "}
                  <strong className="text-white">
                    {m.impressoes.toLocaleString("pt-BR")}
                  </strong>
                </span>
              </div>

              {creats.length > 0 && (
                <>
                  <p className="text-xs text-gray-500 mb-2 mt-3">
                    Top 5 criativos por gasto:
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                    {creats.map((c) => (
                      <div
                        key={c.ad_id}
                        className="bg-podemos-dark rounded p-2 text-xs"
                      >
                        {c.thumbnail_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={c.thumbnail_url}
                            alt=""
                            className="w-full h-20 object-cover rounded mb-1"
                          />
                        ) : (
                          <div className="w-full h-20 bg-gray-800 rounded mb-1 flex items-center justify-center text-2xl">
                            {c.pauta === "VID"
                              ? "🎬"
                              : c.pauta === "CAR"
                                ? "🎠"
                                : "🖼️"}
                          </div>
                        )}
                        <p className="text-white truncate" title={c.ad_nome}>
                          {c.ad_nome}
                        </p>
                        <p className="text-gray-400">
                          {BRL(c.spend)} · CPEE {BRL(c.cpee)}
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
