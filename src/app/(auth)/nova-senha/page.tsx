import { NewPasswordForm } from "./new-password-form";

export const metadata = { title: "Nova senha" };

/** Reached from the recovery email via /auth/confirm, which signs the person in first. */
export default function NewPasswordPage() {
  return <NewPasswordForm />;
}
