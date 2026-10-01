import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({ title, subtitle, back, action, className }: { title: string; subtitle?: string; back?: string; action?: React.ReactNode; className?: string }) {
  return (
    <header className={cn("sticky top-0 z-20 bg-background/90 backdrop-blur border-b border-border", className)}>
      <div className="mx-auto w-full max-w-3xl md:max-w-none md:px-6 px-4 h-14 flex items-center gap-2">
        {back ? (
          <Link href={back} className="-ml-2 h-10 w-10 inline-flex items-center justify-center rounded-lg hover:bg-stone-100" aria-label="Voltar">
            <ChevronLeft className="h-5 w-5" />
          </Link>
        ) : null}
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold truncate leading-tight">{title}</h1>
          {subtitle ? <p className="text-xs text-muted truncate">{subtitle}</p> : null}
        </div>
        {action}
      </div>
    </header>
  );
}

export function PageBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mx-auto w-full max-w-3xl md:max-w-none px-4 md:px-6 py-4 space-y-4 flex-1", className)} {...props} />;
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface/60 px-6 py-10 text-center">
      <p className="font-medium">{title}</p>
      {description ? <p className="text-sm text-muted mt-1">{description}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function Alert({ tone = "error", children }: { tone?: "error" | "success" | "info"; children: React.ReactNode }) {
  const cls = { error: "bg-red-50 text-red-700 border-red-200", success: "bg-emerald-50 text-emerald-700 border-emerald-200", info: "bg-sky-50 text-sky-700 border-sky-200" }[tone];
  return <div role={tone === "error" ? "alert" : "status"} className={cn("rounded-xl border px-3.5 py-2.5 text-sm", cls)}>{children}</div>;
}
