"use client";

import { useState } from "react";
import { Download, ChevronDown } from "lucide-react";
import { exportToCSV, exportToPDF, exportToJSON, ExportData } from "@/lib/export";

interface ExportButtonProps {
  data: Record<string, unknown>[];
  columns: Array<{ key: string; label: string }>;
  title: string;
  isLoading?: boolean;
}

export default function ExportButton({
  data,
  columns,
  title,
  isLoading = false,
}: ExportButtonProps) {
  const [showMenu, setShowMenu] = useState(false);

  const handleExport = (format: "csv" | "pdf" | "json") => {
    const timestamp = new Date().toLocaleString("pt-BR");

    if (format === "csv") {
      exportToCSV({ title, timestamp, data, columns });
    } else if (format === "pdf") {
      exportToPDF({ title, timestamp, data, columns });
    } else if (format === "json") {
      exportToJSON(
        {
          title,
          timestamp,
          data,
          metadata: {
            totalRecords: data.length,
            columns: columns.map((c) => c.label),
          },
        },
        title.toLowerCase().replace(/\s+/g, "_")
      );
    }

    setShowMenu(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={isLoading || data.length === 0}
        className="flex items-center gap-2 px-4 py-2 bg-podemos-accent text-black rounded hover:bg-opacity-80 disabled:opacity-50 disabled:cursor-not-allowed transition font-semibold"
      >
        <Download size={18} />
        <span>Exportar</span>
        <ChevronDown size={16} />
      </button>

      {showMenu && (
        <div className="absolute top-full right-0 mt-2 bg-podemos-dark border border-podemos-accent/30 rounded shadow-lg z-10 min-w-40">
          <button
            onClick={() => handleExport("csv")}
            className="w-full text-left px-4 py-2 hover:bg-podemos-accent/20 text-gray-300 hover:text-white transition border-b border-podemos-accent/20"
          >
            📊 Exportar para CSV
          </button>
          <button
            onClick={() => handleExport("pdf")}
            className="w-full text-left px-4 py-2 hover:bg-podemos-accent/20 text-gray-300 hover:text-white transition border-b border-podemos-accent/20"
          >
            📄 Exportar para PDF
          </button>
          <button
            onClick={() => handleExport("json")}
            className="w-full text-left px-4 py-2 hover:bg-podemos-accent/20 text-gray-300 hover:text-white transition"
          >
            ⚙️ Exportar para JSON
          </button>
        </div>
      )}
    </div>
  );
}
