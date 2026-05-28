"use client";

interface Row {
  [key: string]: unknown;
}

function toCSV(rows: Row[], filename: string) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    if (v == null) return "";
    const s = String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface Props {
  snapshots: Row[];
  criativos: Row[];
  clusters: Row[];
}

export default function ExportButtons({
  snapshots,
  criativos,
  clusters,
}: Props) {
  const stamp = new Date().toISOString().slice(0, 10);
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      <button
        onClick={() => toCSV(snapshots, `snapshots-${stamp}.csv`)}
        disabled={snapshots.length === 0}
        className="px-4 py-2 bg-podemos-accent text-black rounded font-bold text-sm hover:bg-opacity-80 disabled:opacity-30"
      >
        📥 CSV — Snapshots ({snapshots.length})
      </button>
      <button
        onClick={() => toCSV(criativos, `criativos-${stamp}.csv`)}
        disabled={criativos.length === 0}
        className="px-4 py-2 bg-podemos-secondary text-white border border-podemos-accent rounded font-bold text-sm hover:border-opacity-80 disabled:opacity-30"
      >
        📥 CSV — Criativos ({criativos.length})
      </button>
      <button
        onClick={() => toCSV(clusters, `clusters-${stamp}.csv`)}
        disabled={clusters.length === 0}
        className="px-4 py-2 bg-podemos-secondary text-white border border-podemos-accent rounded font-bold text-sm hover:border-opacity-80 disabled:opacity-30"
      >
        📥 CSV — Clusters ({clusters.length})
      </button>
    </div>
  );
}
