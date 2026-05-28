"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  {
    id: "visao-geral",
    label: "📊 Visão Geral",
    href: "/dashboard/visao-geral",
  },
  {
    id: "detalhamento",
    label: "🔍 Detalhamento",
    href: "/dashboard/detalhamento",
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active =
    tabs.find((t) => pathname?.startsWith(t.href))?.id ?? "visao-geral";

  return (
    <div className="min-h-screen bg-podemos-dark text-white">
      <header className="bg-podemos-secondary border-b border-podemos-accent/20 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold text-podemos-accent">
                CPEE Dashboard
              </h1>
              <p className="text-xs text-gray-400">
                Dados do Supabase · atualização a cada 5 min
              </p>
            </div>
            <Link
              href="/dashboard-cpee/painel.html"
              target="_blank"
              className="text-xs bg-podemos-accent text-black px-3 py-2 rounded hover:bg-opacity-80 font-bold"
            >
              📺 Painel TV
            </Link>
          </div>
          <nav className="flex gap-2 border-b border-gray-700">
            {tabs.map((t) => (
              <Link
                key={t.id}
                href={t.href}
                className={`px-4 py-3 font-medium transition ${
                  active === t.id
                    ? "text-podemos-accent border-b-2 border-podemos-accent"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {t.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="max-w-7xl mx-auto">{children}</main>
    </div>
  );
}
