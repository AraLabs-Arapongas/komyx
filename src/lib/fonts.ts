import { Nunito, Fraunces, Source_Sans_3, Space_Grotesk, Inter } from "next/font/google";

// Three font pairings for public pages (buffet page + Komyx landing); the theme picks one via a class.
// "Festa" uses Nunito for both display and body (heavy 900 for titles): round, friendly, no serifs.
const nunito = Nunito({ subsets: ["latin"], weight: ["400", "600", "700", "800", "900"], variable: "--font-festa-body" });
const fraunces = Fraunces({ subsets: ["latin"], weight: ["500", "700", "800"], variable: "--font-elegante-display" });
const sourceSans = Source_Sans_3({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-elegante-body" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-moderno-display" });
const inter = Inter({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-moderno-body" });

export const publicFontClass = `${nunito.variable} ${fraunces.variable} ${sourceSans.variable} ${spaceGrotesk.variable} ${inter.variable}`;
