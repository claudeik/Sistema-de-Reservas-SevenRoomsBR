import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dguests NextGen × EPOC POS — Reservas, Fila Virtual, Mapa em Tempo Real & CRM 360º",
  description:
    "Plataforma avançada de reservas de restaurantes, fila virtual com QR Code, CRM com enriquecimento por CPF (Wangari Data Hub + SalesBox) e integração nativa bidirecional com o PDV EPOC.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <meta name="color-scheme" content="dark light" />
      </head>
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-amber-500/30 selection:text-amber-200">
        {children}
      </body>
    </html>
  );
}
