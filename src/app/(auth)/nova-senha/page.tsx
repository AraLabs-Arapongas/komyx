import { NewPasswordForm } from "./new-password-form";

export const metadata = { title: "Nova senha" };

/**
 * Reached from the recovery / welcome e-mail via /auth/confirm (which signs the person in first), or
 * forced by requireProfile after the admin set a temporary password (?obrigatoria=1).
 */
export default async function NewPasswordPage({ searchParams }: PageProps<"/nova-senha">) {
  const sp = await searchParams;
  return <NewPasswordForm required={sp.obrigatoria === "1"} />;
}
