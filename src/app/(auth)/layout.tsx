import { KomyxMark } from "@/components/brand/komyx-logo";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 h-12 w-12 rounded-2xl bg-brand text-brand-fg grid place-items-center"><KomyxMark className="h-8 w-8" /></div>
          <h1 className="text-2xl font-semibold tracking-tight">Komyx</h1>
          <p className="text-sm text-muted mt-1">Gestão para buffets. Venda, organize e realize festas em um só lugar.</p>
        </div>
        {children}
      </div>
    </main>
  );
}
