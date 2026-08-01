import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ConsorPro — Chega de planilha para controlar suas comissões",
  description: "Registre a venda. O ConsorPro calcula comissão, parcelas e mostra quanto você vai receber e quando.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className={`${inter.className} min-h-full flex flex-col`}>
        {children}
      </body>
    </html>
  );
}
