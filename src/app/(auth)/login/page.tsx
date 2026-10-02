import { LoginForm, type DevAccount } from "./login-form";

export const metadata = { title: "Entrar" };

/** Seed accounts from supabase/seed.sql. Only offered when running `next dev`. */
const DEV_ACCOUNTS: DevAccount[] = [
  { label: "Dona (owner · Festa & Cia, premium)", email: "dona@festabuffet.test", password: "senha12345" },
  { label: "Equipe (staff · Festa & Cia)", email: "ana@festabuffet.test", password: "senha12345" },
  { label: "Admin Komyx (plataforma)", email: "admin@komyx.test", password: "senha12345" },
  { label: "Outro buffet (owner · Alegria Kids, básico)", email: "joao@alegriakids.test", password: "senha12345" },
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
