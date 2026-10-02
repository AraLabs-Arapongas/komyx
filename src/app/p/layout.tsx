import { publicFontClass } from "@/lib/fonts";

/** Public buffet pages get their own typographic identity (the app keeps Geist). */
export default function PublicLayout({ children }: LayoutProps<"/p">) {
  return (
    <div className={`${publicFontClass} public-theme flex-1 flex flex-col`}>
      {children}
    </div>
  );
}
