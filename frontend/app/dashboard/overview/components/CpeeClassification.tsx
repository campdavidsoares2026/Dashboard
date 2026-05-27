"use client";

interface ClassificationProps {
  hot: number;
  warm: number;
  cold: number;
  pending?: number;
}

export default function CpeeClassification({ hot, warm, cold, pending = 0 }: ClassificationProps) {
  return (
    <div className="bg-podemos-secondary rounded-lg p-6 mb-6">
      <h3 className="text-white font-bold mb-4">Classificação CPEE</h3>
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-3xl font-bold text-red-500 mb-1">🔥</p>
          <p className="text-white font-bold">{hot}</p>
          <p className="text-xs text-gray-400">Quentes</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-yellow-500 mb-1">🟡</p>
          <p className="text-white font-bold">{warm}</p>
          <p className="text-xs text-gray-400">Mornos</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-blue-500 mb-1">🔵</p>
          <p className="text-white font-bold">{cold}</p>
          <p className="text-xs text-gray-400">Frios</p>
        </div>
      </div>
      {pending > 0 && <p className="text-center text-xs text-gray-400 mt-3">+ {pending} em aquecimento</p>}
    </div>
  );
}
