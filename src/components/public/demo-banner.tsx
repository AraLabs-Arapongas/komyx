import Link from "next/link";

/** Strip on top of the Komyx demo buffet (organizations.is_demo): a showcase, its requests are not real. */
export function DemoBanner() {
  return (
    <div className="px-4 py-2 text-center text-sm" style={{ background: "var(--sun)", color: "var(--ink)" }}>
      <span className="font-semibold">Buffet de demonstração do Komyx</span> · Os pedidos feitos aqui não são reais.{" "}
      <Link href="/signup" className="font-bold underline underline-offset-2 whitespace-nowrap">Quero o Komyx no meu buffet</Link>
    </div>
  );
}
