import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FPSO Atlântico | Explorador 3D",
  description: "Explore um FPSO inteiramente gerado em código. Oceano animado, sistemas selecionáveis e vista explodida interativa.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
