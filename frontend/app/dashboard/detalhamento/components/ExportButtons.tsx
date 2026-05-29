"use client";

import { useState } from "react";

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

const BRL = (n: number) =>
  (Number(n) || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  });
const NUM = (n: number) => (Number(n) || 0).toLocaleString("pt-BR");

interface PDFData {
  snapshots: Row[];
  criativos: Row[];
  clusters: Row[];
  periodLabel?: string;
}

/**
 * Gera PDF executivo: capa + totais + top criativos + top clusters.
 * Lazy-loads jspdf no clique pra não inflar o bundle inicial.
 */
async function generatePDF({ snapshots, criativos, clusters, periodLabel }: PDFData) {
  // Dynamic imports — jspdf é pesado (~200KB); só carrega quando necessário.
  const jsPDF = (await import("jspdf")).default;
  type Doc = InstanceType<typeof jsPDF>;
  const autoTableMod = await import("jspdf-autotable");
  const autoTable: (doc: Doc, opts: object) => void =
    (autoTableMod as unknown as { default?: (d: Doc, o: object) => void }).default ??
    (autoTableMod as unknown as (d: Doc, o: object) => void);

  const doc: Doc = new jsPDF({ unit: "mm", format: "a4" });
  const page = { w: 210, h: 297 };
  const stamp = new Date().toLocaleString("pt-BR");

  // ─── CAPA ────────────────────────────────────────────────────────
  doc.setFillColor(44, 62, 80); // var(--podemos-dark)
  doc.rect(0, 0, page.w, 60, "F");
  doc.setTextColor(243, 156, 18); // var(--podemos-accent)
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("CPEE Dashboard", 14, 25);
  doc.setFontSize(11);
  doc.setTextColor(232, 232, 232);
  doc.setFont("helvetica", "normal");
  doc.text("Dep. Federal David Soares · Podemos · São Paulo", 14, 33);
  doc.setFontSize(9);
  doc.text(`Período: ${periodLabel ?? "—"}  ·  Gerado em: ${stamp}`, 14, 41);

  let cursorY = 72;

  // ─── TOTAIS (agregados de snapshots) ──────────────────────────────
  interface Totals { spend: number; leads: number; impressoes: number; alcance: number; cliques: number; eq: number; }
  const totals: Totals = snapshots.reduce<Totals>(
    (a, s) => ({
      spend: a.spend + (Number(s.spend) || 0),
      leads: a.leads + (Number(s.leads) || 0),
      impressoes: a.impressoes + (Number(s.impressoes) || 0),
      alcance: a.alcance + (Number(s.alcance) || 0),
      cliques: a.cliques + (Number(s.cliques) || 0),
      eq: a.eq + (Number(s.eq) || 0),
    }),
    { spend: 0, leads: 0, impressoes: 0, alcance: 0, cliques: 0, eq: 0 }
  );
  const cpee = totals.leads > 0 ? totals.spend / totals.leads : 0;
  const ctr = totals.impressoes > 0 ? (totals.cliques / totals.impressoes) * 100 : 0;

  doc.setTextColor(44, 62, 80);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Resumo do período", 14, cursorY);
  cursorY += 6;

  autoTable(doc, {
    startY: cursorY,
    head: [["Métrica", "Valor"]],
    body: [
      ["CPEE Consolidado", BRL(cpee)],
      ["Gasto Total", BRL(totals.spend)],
      ["Leads", NUM(totals.leads)],
      ["EQ (engajamento qualificado)", NUM(totals.eq)],
      ["Impressões", NUM(totals.impressoes)],
      ["Alcance", NUM(totals.alcance)],
      ["Cliques", NUM(totals.cliques)],
      ["CTR", `${ctr.toFixed(2)}%`],
    ],
    headStyles: { fillColor: [243, 156, 18], textColor: 0, fontStyle: "bold" },
    bodyStyles: { textColor: [44, 62, 80] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
    margin: { left: 14, right: 14 },
  });

  cursorY =
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
      .finalY + 12;

  // ─── TOP 10 CRIATIVOS ───────────────────────────────────────────
  if (criativos.length) {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Top 10 criativos por gasto", 14, cursorY);
    cursorY += 4;

    const topCreats = [...criativos]
      .sort((a, b) => (Number(b.spend) || 0) - (Number(a.spend) || 0))
      .slice(0, 10);
    autoTable(doc, {
      startY: cursorY,
      head: [["Criativo", "Pauta", "Gasto", "CPEE", "CTR", "Classific."]],
      body: topCreats.map((c) => [
        String(c.ad_nome ?? "—").substring(0, 38),
        String(c.pauta ?? "—"),
        BRL(Number(c.spend) || 0),
        BRL(Number(c.cpee) || 0),
        `${(Number(c.ctr) || 0).toFixed(2)}%`,
        String(c.classificacao ?? "—"),
      ]),
      headStyles: { fillColor: [243, 156, 18], textColor: 0 },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        2: { halign: "right" },
        3: { halign: "right" },
        4: { halign: "right" },
        5: { halign: "center" },
      },
      margin: { left: 14, right: 14 },
    });

    cursorY =
      (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
        .finalY + 12;
  }

  // ─── TOP 10 CLUSTERS ─────────────────────────────────────────────
  if (clusters.length) {
    if (cursorY > page.h - 60) {
      doc.addPage();
      cursorY = 20;
    }
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Top 10 clusters por gasto", 14, cursorY);
    cursorY += 4;

    const topClusters = [...clusters]
      .sort((a, b) => (Number(b.spend) || 0) - (Number(a.spend) || 0))
      .slice(0, 10);
    autoTable(doc, {
      startY: cursorY,
      head: [["Cluster", "Gasto", "CPEE", "CTR", "Classific."]],
      body: topClusters.map((c) => [
        String(c.cluster_nome ?? "—").substring(0, 42),
        BRL(Number(c.spend) || 0),
        BRL(Number(c.cpee) || 0),
        `${(Number(c.ctr) || 0).toFixed(2)}%`,
        String(c.classificacao ?? "—"),
      ]),
      headStyles: { fillColor: [243, 156, 18], textColor: 0 },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        1: { halign: "right" },
        2: { halign: "right" },
        3: { halign: "right" },
        4: { halign: "center" },
      },
      margin: { left: 14, right: 14 },
    });
  }

  // ─── Footer com paginação ───────────────────────────────────────
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Página ${i} de ${total}`, page.w - 14, page.h - 8, { align: "right" });
    doc.text("CPEE Dashboard · paineltv-david.vercel.app", 14, page.h - 8);
  }

  doc.save(`relatorio-cpee-${new Date().toISOString().slice(0, 10)}.pdf`);
}

interface Props {
  snapshots: Row[];
  criativos: Row[];
  clusters: Row[];
  periodLabel?: string;
}

export default function ExportButtons({
  snapshots,
  criativos,
  clusters,
  periodLabel,
}: Props) {
  const stamp = new Date().toISOString().slice(0, 10);
  const [generating, setGenerating] = useState(false);

  const handlePDF = async () => {
    try {
      setGenerating(true);
      await generatePDF({ snapshots, criativos, clusters, periodLabel });
    } catch (e) {
      console.error("[PDF] failed", e);
      alert("Erro ao gerar PDF — verifique o console");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      <button
        onClick={handlePDF}
        disabled={generating || snapshots.length === 0}
        className="px-4 py-2 bg-red-600 text-white rounded font-bold text-sm hover:bg-red-700 disabled:opacity-30 flex items-center gap-2"
      >
        {generating ? "⏳ Gerando…" : "📄 Exportar PDF"}
      </button>
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
