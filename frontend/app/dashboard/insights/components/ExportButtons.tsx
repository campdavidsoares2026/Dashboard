"use client";

export default function ExportButtons() {
  const handleExport = (format: "pdf" | "csv" | "share") => {
    console.log(`Exporting as ${format}`);
    // TODO: Implement actual export functionality
  };

  return (
    <div className="flex gap-4 mb-6 flex-wrap">
      <button
        onClick={() => handleExport("pdf")}
        className="flex items-center gap-2 bg-podemos-primary text-white px-6 py-3 rounded font-bold hover:opacity-80 transition"
      >
        📊 Exportar Relatório PDF
      </button>
      <button
        onClick={() => handleExport("csv")}
        className="flex items-center gap-2 bg-podemos-secondary text-white px-6 py-3 rounded font-bold border border-podemos-primary hover:border-opacity-80 transition"
      >
        📥 CSV Completo
      </button>
      <button
        onClick={() => handleExport("share")}
        className="flex items-center gap-2 bg-podemos-secondary text-white px-6 py-3 rounded font-bold border border-podemos-primary hover:border-opacity-80 transition"
      >
        📋 Compartilhar com Time
      </button>
    </div>
  );
}
