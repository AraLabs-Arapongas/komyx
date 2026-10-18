import { LoginForm, type DevAccount } from "./login-form";

export const metadata = { title: "Entrar" };

/** Seed accounts from supabase/seed.sql and supabase/seeds/. Only offered when running `next dev`. */
const DEV_ACCOUNTS: DevAccount[] = [
  { label: "Dona (owner · Festa & Cia, premium)", email: "dona@festabuffet.test", password: "senha12345" },
  { label: "Equipe (staff · Festa & Cia)", email: "ana@festabuffet.test", password: "senha12345" },
  { label: "Admin Komyx (plataforma)", email: "admin@komyx.test", password: "senha12345" },
  { label: "Outro buffet (owner · Alegria Kids, básico)", email: "joao@alegriakids.test", password: "senha12345" },
  // One buffet per subscription state (supabase/seeds/billing-states.sql).
  { label: "Assinatura · Em dia", email: "emdia@komyx.test", password: "senha12345" },
  { label: "Assinatura · Teste grátis sem CNPJ", email: "teste@komyx.test", password: "senha12345" },
  { label: "Assinatura · Vencido 1 dia (faixa amarela)", email: "vencido@komyx.test", password: "senha12345" },
  { label: "Assinatura · Vencido 9 dias (faixa vermelha)", email: "vencido9@komyx.test", password: "senha12345" },
  { label: "Assinatura · Pausado (dia 10)", email: "pausado@komyx.test", password: "senha12345" },
  { label: "Assinatura · Troca de plano agendada", email: "troca@komyx.test", password: "senha12345" },
  { label: "Assinatura · Cancelado", email: "cancelado@komyx.test", password: "senha12345" },
];

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  const error = typeof sp.error === "string" ? sp.error : undefined;
  const devAccounts = process.env.NODE_ENV === "development" ? DEV_ACCOUNTS : [];
  return (
    <LoginForm
      next={next}
      devAccounts={devAccounts}
      initialError={error === "profile" ? "Sua conta não está vinculada a um buffet. Fale com o responsável." : undefined}
    />
  );
}
