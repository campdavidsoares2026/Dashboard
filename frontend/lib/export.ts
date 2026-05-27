import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export interface ExportData {
  title: string;
  timestamp: string;
  data: Record<string, unknown>[];
  columns: Array<{ key: string; label: string }>;
}

/**
 * Export data to CSV format
 */
export function exportToCSV(exportData: ExportData): void {
  const { title, timestamp, data, columns } = exportData;

  // Create CSV header
  const headers = columns.map((col) => col.label).join(",");

  // Create CSV rows
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const value = row[col.key];
        // Escape quotes and wrap in quotes if contains comma
        const stringValue = String(value ?? "");
        return stringValue.includes(",")
          ? `"${stringValue.replace(/"/g, '""')}"`
          : stringValue;
      })
      .join(",")
  );

  // Combine header and rows
  const csv = [
    `# ${title}`,
    `# Exportado em: ${timestamp}`,
    "",
    headers,
    ...rows,
  ].join("\n");

  // Download CSV
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${title.toLowerCase().replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export data to PDF format
 */
export function exportToPDF(exportData: ExportData): void {
  const { title, timestamp, data, columns } = exportData;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Add title
  doc.setFontSize(16);
  doc.setTextColor(52, 168, 224); // podemos-accent color
  doc.text(title, 14, 22);

  // Add timestamp
  doc.setFontSize(10);
  doc.setTextColor(156, 163, 175); // gray-400
  doc.text(`Exportado em: ${timestamp}`, 14, 32);

  // Add table
  const tableData = data.map((row) =>
    columns.map((col) => {
      const value = row[col.key];
      return String(value ?? "");
    })
  );

  autoTable(doc, {
    head: [columns.map((col) => col.label)],
    body: tableData,
    startY: 40,
    margin: { top: 10, right: 10, bottom: 10, left: 10 },
    headStyles: {
      fillColor: [52, 168, 224], // podemos-accent
      textColor: [0, 0, 0],
      fontStyle: "bold",
      fontSize: 11,
    },
    bodyStyles: {
      textColor: [200, 200, 200],
      fontSize: 10,
    },
    alternateRowStyles: {
      fillColor: [30, 30, 30],
    },
    didDrawPage: (data) => {
      // Add page number
      const pageCount = (doc as any).internal.getNumberOfPages();
      const pageSize = doc.internal.pageSize;
      const pageHeight = pageSize.getHeight();
      const pageWidth = pageSize.getWidth();

      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.text(
        `Página ${data.pageNumber} de ${pageCount}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
      );
    },
  });

  // Save PDF
  doc.save(
    `${title.toLowerCase().replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`
  );
}

/**
 * Export metrics snapshot as JSON
 */
export function exportToJSON(data: unknown, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${new Date().toISOString().split("T")[0]}.json`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Format number for display
 */
export function formatNumber(value: number, decimals: number = 2): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format currency for display
 */
export function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  return `${formatNumber(value, decimals)}%`;
}
