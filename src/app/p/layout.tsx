import { Bricolage_Grotesque, Nunito, Fraunces, Source_Sans_3, Space_Grotesk, Inter } from "next/font/google";

// Three font pairings; the org theme picks one via a class on the wrapper.
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], weight: ["500", "700", "800"], variable: "--font-festa-display" });
const nunito = Nunito({ subsets: ["latin"], weight: ["400", "600", "700", "800"], variable: "--font-festa-body" });
const fraunces = Fraunces({ subsets: ["latin"], weight: ["500", "700", "800"], variable: "--font-elegante-display" });
const sourceSans = Source_Sans_3({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-elegante-body" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-moderno-display" });
const inter = Inter({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-moderno-body" });

/** Public buffet pages get their own typographic identity (the app keeps Geist). */
export default function PublicLayout({ children }: LayoutProps<"/p">) {
  return (
    <div className={`${bricolage.variable} ${nunito.variable} ${fraunces.variable} ${sourceSans.variable} ${spaceGrotesk.variable} ${inter.variable} public-theme flex-1 flex flex-col`}>
      {children}
    </div>
  );
}
