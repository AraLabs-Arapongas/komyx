import { publicFontClass } from "@/lib/fonts";

/** Guest-facing invite pages share the festive public identity (Nunito, berry, cream paper). */
export default function InviteLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${publicFontClass} public-theme font-festa flex-1 flex flex-col`}>{children}</div>;
}
