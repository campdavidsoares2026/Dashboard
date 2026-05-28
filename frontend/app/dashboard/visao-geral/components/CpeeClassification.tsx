"use client";

interface Props {
  bom: number;
  medio: number;
  ruim: number;
  semDados: number;
}

export default function CpeeClassification({
  bom,
  medio,
  ruim,
  semDados,
}: Props) {
  return (
    <div className="bg-podemos-secondary rounded-lg p-6">
      <h3 className="text-white font-bold mb-4">Classificação CPEE</h3>
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-3xl mb-1">🟢</p>
          <p className="text-white font-bold text-xl">{bom}</p>
          <p className="text-xs text-gray-400">Bom (&lt;100)</p>
        </div>
        <div className="text-center">
          <p className="text-3xl mb-1">🟡</p>
          <p className="text-white font-bold text-xl">{medio}</p>
          <p className="text-xs text-gray-400">Médio (100-199)</p>
        </div>
        <div className="text-center">
          <p className="text-3xl mb-1">🔴</p>
          <p className="text-white font-bold text-xl">{ruim}</p>
          <p className="text-xs text-gray-400">Ruim (≥200)</p>
        </div>
      </div>
      {semDados > 0 && (
        <p className="text-center text-xs text-gray-400 mt-3">
          + {semDados} sem dados
        </p>
      )}
    </div>
  );
}
