import { Bricolage_Grotesque, Nunito } from "next/font/google";

const display = Bricolage_Grotesque({ subsets: ["latin"], weight: ["500", "700", "800"], variable: "--font-display" });
const body = Nunito({ subsets: ["latin"], weight: ["400", "600", "700", "800"], variable: "--font-body" });

/** Public buffet pages get their own typographic identity (the app keeps Geist). */
export default function PublicLayout({ children }: LayoutProps<"/p">) {
  return <div className={`${display.variable} ${body.variable} public-theme flex-1 flex flex-col`}>{children}</div>;
}
