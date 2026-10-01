import Link from "next/link";
import { ShieldCheck, Building2, LayoutDashboard, ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/data/session";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const profile = await requireAdmin();
  const links = [
    { href: "/admin", label: "Visão geral", icon: LayoutDashboard },
    { href: "/admin/buffets", label: "Buffets", icon: Building2 },
  ];
  return (
    <div className="flex min-h-screen">
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border bg-stone-900 text-stone-100 min-h-screen sticky top-0">
        <div className="px-5 py-5 border-b border-stone-800">
          <p className="font-semibold inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-amber-400" /> Festeja Admin</p>
          <p className="text-xs text-stone-400 truncate">{profile.email}</p>
        </div>
        <nav className="p-3 space-y-0.5">
          {links.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-stone-200 hover:bg-stone-800"><Icon className="h-4.5 w-4.5" /> {label}</Link>
          ))}
        </nav>
        <div className="mt-auto p-3 space-y-1">
          <Link href="/home" className="flex items-center gap-2 px-3 py-2 text-sm text-stone-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Voltar ao app</Link>
          <form action="/auth/signout" method="post"><button className="w-full text-left text-sm text-stone-400 hover:text-white px-3 py-2">Sair</button></form>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <div className="md:hidden sticky top-0 z-20 bg-stone-900 text-stone-100 px-4 h-12 flex items-center gap-4 text-sm">
          <Link href="/admin" className="font-semibold inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-amber-400" /> Admin</Link>
          <Link href="/admin/buffets">Buffets</Link>
          <Link href="/home" className="ml-auto text-stone-400">App</Link>
        </div>
        {children}
      </div>
    </div>
  );
}
