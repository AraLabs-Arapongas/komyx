import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { IS_INDEXABLE, OG_IMAGE, SITE_NAME, SITE_URL } from "@/lib/seo";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Komyx", template: "%s · Komyx" },
  description: "Agenda, reservas, orçamentos, convidados e pagamentos para o seu buffet.",
  applicationName: SITE_NAME,
  // Previews (and local builds) stay out of Google; only VERCEL_ENV=production is indexable.
  robots: { index: IS_INDEXABLE, follow: IS_INDEXABLE },
  openGraph: { type: "website", siteName: SITE_NAME, locale: "pt_BR", images: [OG_IMAGE] },
  twitter: { card: "summary_large_image", images: [OG_IMAGE.url] },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Komyx" },
};

export const viewport: Viewport = {
  themeColor: "#c2410c",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
