"use client";

import { usePathname } from "next/navigation";
import { BrowserTabs } from "@/components/ui/browser-tabs";

const TABS = [
  { key: "empresa", label: "Empresa", href: "/configuracoes/empresa" },
  { key: "pagina-publica", label: "Página pública", href: "/configuracoes/pagina-publica" },
  { key: "comercial", label: "Comercial", href: "/configuracoes/comercial" },
  { key: "contrato", label: "Contrato", href: "/configuracoes/contrato" },
  { key: "equipe", label: "Equipe", href: "/configuracoes/equipe" },
];

/** Configurações sections as browser-style tabs (one route each). */
export function SettingsTabs() {
  const pathname = usePathname();
  const active = TABS.find((t) => pathname.startsWith(t.href))?.key ?? "empresa";
  return (
    <div className="border-b border-border px-2 md:px-4 pt-3">
      <BrowserTabs tabs={TABS} active={active} label="Seções das configurações" />
    </div>
  );
}
