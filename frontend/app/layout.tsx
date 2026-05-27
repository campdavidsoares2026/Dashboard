import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "CPEE Dashboard | Campanha Eleitoral",
  description: "Dashboard de análise de campanha eleitoral com métricas CPEE e EEM",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-podemos-dark text-white">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
