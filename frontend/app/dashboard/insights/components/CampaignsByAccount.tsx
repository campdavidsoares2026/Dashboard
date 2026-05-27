"use client";

interface Campaign {
  name: string;
  gasto: number;
  ctr: number;
  cpl: number;
  sentimento: number;
  demog_top: string;
  melhor_hora: string;
}

interface CampaignsByAccountProps {
  campanhas: Array<{ account: string; campaigns: Campaign[] }>;
}

export default function CampaignsByAccount({ campanhas }: CampaignsByAccountProps) {
  return (
    <div className="bg-podemos-secondary rounded-lg p-6 mb-6">
      <h3 className="text-white font-bold text-lg mb-4">Campanhas por Conta</h3>
      <div className="space-y-4">
        {campanhas.map((account, accIdx) => (
          <div key={accIdx} className="border border-gray-700 rounded p-4">
            <h4 className="text-podemos-primary font-bold mb-3">{account.account}</h4>
            {account.campaigns.map((campaign, campIdx) => (
              <div key={campIdx} className="mb-3 p-3 bg-gray-800 rounded">
                <div className="flex justify-between mb-2">
                  <p className="text-white font-bold">{campaign.name}</p>
                  <p className="text-podemos-primary">R${campaign.gasto.toLocaleString("pt-BR")}</p>
                </div>
                <div className="text-xs text-gray-400 space-y-1">
                  <p>CTR: {(campaign.ctr * 100).toFixed(2)}% | CPL: R${campaign.cpl.toFixed(2)}</p>
                  <p>Sentimento: {campaign.sentimento}% positivo | Demog: {campaign.demog_top}</p>
                  <p>Melhor hora: {campaign.melhor_hora}</p>
                </div>
                <div className="flex gap-2 mt-3">
                  <button className="text-xs bg-podemos-primary text-white px-3 py-1 rounded hover:opacity-80 transition">
                    Analisar
                  </button>
                  <button className="text-xs bg-gray-700 text-white px-3 py-1 rounded hover:bg-gray-600 transition">
                    Pausar
                  </button>
                  <button className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition">
                    Escalar
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
