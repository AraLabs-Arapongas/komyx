"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { login } from "../actions";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/page";

export type DevAccount = { label: string; email: string; password: string };

export function LoginForm({ next, initialError, devAccounts = [] }: { next?: string; initialError?: string; devAccounts?: DevAccount[] }) {
  const [state, action] = useActionState(login, undefined);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  return (
    <Card>
      <CardBody className="pt-5 space-y-4">
        {devAccounts.length ? (
          <Field label="Conta de teste (só em desenvolvimento)" htmlFor="dev_account">
            <Select id="dev_account" defaultValue="" onChange={(e) => { const a = devAccounts.find((x) => x.email === e.target.value); if (a) { setEmail(a.email); setPassword(a.password); } }}>
              <option value="">Selecionar…</option>
              {devAccounts.map((a) => <option key={a.email} value={a.email}>{a.label} · {a.email}</option>)}
            </Select>
          </Field>
        ) : null}
        <form action={action} className="space-y-4">
          {next ? <input type="hidden" name="next" value={next} /> : null}
          {(state && !state.ok) || initialError ? <Alert>{initialError ?? (state && !state.ok ? state.error : "")}</Alert> : null}
          <Field label="E-mail" htmlFor="email" error={fe.email}>
            <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="Senha" htmlFor="password" error={fe.password}>
            <Input id="password" name="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>
          <SubmitButton className="w-full" size="lg" pendingText="Entrando...">Entrar</SubmitButton>
        </form>
        <p className="text-center text-sm text-muted">
          Ainda não tem conta? <Link href="/signup" className="text-brand font-medium">Criar buffet</Link>
        </p>
      </CardBody>
    </Card>
  );
}
