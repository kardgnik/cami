import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SCRIPT_TEMA } from "@/components/alternar-tema";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Gestão de Assinaturas",
  description: "Gestão de mesas, jogadores, mestres e pagamentos.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: o script abaixo adiciona a classe "dark" antes do React hidratar
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
