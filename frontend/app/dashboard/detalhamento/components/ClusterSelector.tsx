"use client";

interface Props {
  clusters: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  max?: number;
}

export default function ClusterSelector({
  clusters,
  selected,
  onChange,
  max = 5,
}: Props) {
  const toggle = (c: string) => {
    if (selected.includes(c)) onChange(selected.filter((x) => x !== c));
    else if (selected.length < max) onChange([...selected, c]);
  };

  if (clusters.length === 0) {
    return (
      <div className="bg-podemos-secondary rounded-lg p-4 mb-6 text-sm text-gray-400">
        Sem clusters disponíveis no momento.
      </div>
    );
  }

  return (
    <div className="bg-podemos-secondary rounded-lg p-4 mb-6">
      <h3 className="text-white font-bold mb-3">
        Selecione até {max} clusters para comparar
        <span className="text-xs text-gray-400 ml-2">
          ({selected.length}/{max})
        </span>
      </h3>
      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
        {clusters.map((c) => (
          <button
            key={c}
            onClick={() => toggle(c)}
            disabled={!selected.includes(c) && selected.length >= max}
            className={`text-xs px-3 py-1 rounded border transition ${
              selected.includes(c)
                ? "bg-podemos-accent text-black border-podemos-accent font-bold"
                : "bg-transparent text-gray-300 border-gray-700 hover:border-podemos-accent disabled:opacity-30"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}
