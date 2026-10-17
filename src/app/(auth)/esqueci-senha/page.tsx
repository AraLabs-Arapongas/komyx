import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata = { title: "Esqueci minha senha" };

export default async function ForgotPasswordPage({ searchParams }: PageProps<"/esqueci-senha">) {
  const sp = await searchParams;
  return <ForgotPasswordForm expired={sp.expirado === "1"} />;
}
