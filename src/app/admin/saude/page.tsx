import Link from "next/link";
import { requireAdmin } from "@/lib/data/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageBody, PageHeader } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatDateTime } from "@/lib/utils";
import { getConfigSanity, getCronStatus, getMessageCounts, getRealOrgIds, getRecentFailures, getStuckNotifications } from "./data";

export const metadata = { title: "Saúde · Admin Komyx" };
export const dynamic = "force-dynamic";

const KIND_LABELS: Record<string, string> = {
  notification: "Notificação",
  password_reset: "Redefinir senha",
  sms_otp: "Código SMS",
  announcement: "Aviso",
  resend: "Reenvio",
  test: "Teste",
};

function Stat({ title, sent, failed }: { title: string; sent: number; failed: number }) {
  return (
    <div className={cn("rounded-2xl border bg-surface p-4", failed ? "border-red-200" : "border-border")}>
      <p className="text-xs text-muted">{title}</p>
      <p className="text-2xl font-semibold mt-1">{sent}</p>
      <p className={cn("text-xs", failed ? "text-red-600 font-medium" : "text-muted")}>{failed ? `${failed} com falha` : "nenhuma falha"}</p>
    </div>
  );
}

export default async function AdminHealthPage() {
  await requireAdmin();
  const admin = createAdminClient();
  const realOrgIds = await getRealOrgIds(admin);
  const [cron, counts, failures, stuck] = await Promise.all([
    getCronStatus(admin),
    getMessageCounts(admin),
    getRecentFailures(admin),
    getStuckNotifications(admin, realOrgIds),
  ]);
  const config = getConfigSanity();
  const cronProblems = cron.filter((j) => j.problem).length;

  return (
    <>
      <PageHeader title="Saúde" subtitle="Rotinas agendadas, envios e configuração" />
      <PageBody className="space-y-4 max-w-5xl">
        <Card>
          <CardHeader title="Rotinas agendadas" subtitle={cronProblems ? `${cronProblems} com problema` : "pg_cron no banco"} />
          <CardBody>
            {cron.length ? (
              <ul className="divide-y divide-border">
                {cron.map((j) => (
                  <li key={j.jobname} className={cn("py-3 flex flex-wrap items-start justify-between gap-3", j.problem && "-mx-2 px-2 rounded-xl bg-red-50")}>
                    <div className="min-w-0">
                      <p className="font-medium">{j.label}</p>
                      <p className="text-xs text-muted"><code>{j.jobname}</code> · <code>{j.schedule}</code> · última execução {j.lastStart ? formatDateTime(j.lastStart) : "nunca"}</p>
                      {j.lastStatus === "failed" && j.lastMessage ? <p className="text-xs text-red-700 mt-1 break-words">{j.lastMessage}</p> : null}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {j.problem ? <Badge tone="red">{j.problem}</Badge> : <Badge tone="green">{j.lastStatus === "succeeded" ? "ok" : (j.lastStatus ?? "ok")}</Badge>}
                      <Badge tone={j.failures7d ? "red" : "zinc"}>{j.failures7d} {j.failures7d === 1 ? "falha" : "falhas"} em 7 dias</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted">Nenhuma rotina agendada encontrada (pg_cron).</p>}
          </CardBody>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat title="E-mails enviados (24h)" sent={counts.email.d1.sent} failed={counts.email.d1.failed} />
          <Stat title="E-mails enviados (7d)" sent={counts.email.d7.sent} failed={counts.email.d7.failed} />
          <Stat title="SMS enviados (24h)" sent={counts.sms.d1.sent} failed={counts.sms.d1.failed} />
          <Stat title="SMS enviados (7d)" sent={counts.sms.d7.sent} failed={counts.sms.d7.failed} />
        </div>

        <Card>
          <CardHeader
            title="Últimas falhas de envio"
            subtitle="As 30 mais recentes"
            action={failures.length ? <Link href="/admin/emails?status=failed" className="text-sm text-brand font-medium whitespace-nowrap">Reenviar na tela de E-mails</Link> : null}
          />
          <CardBody>
            {failures.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted text-left">
                    <tr><th className="py-2 pr-3 font-medium">Data</th><th className="py-2 pr-3 font-medium">Canal</th><th className="py-2 pr-3 font-medium">Tipo</th><th className="py-2 pr-3 font-medium">Destinatário</th><th className="py-2 font-medium">Erro</th></tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {failures.map((f) => (
                      <tr key={f.id} className="align-top">
                        <td className="py-2 pr-3 whitespace-nowrap">{formatDateTime(f.created_at)}</td>
                        <td className="py-2 pr-3"><Badge tone={f.channel === "sms" ? "amber" : "slate"}>{f.channel === "sms" ? "SMS" : "E-mail"}</Badge></td>
                        <td className="py-2 pr-3 whitespace-nowrap">{KIND_LABELS[f.kind] ?? f.kind}</td>
                        <td className="py-2 pr-3"><span className="break-all">{f.to_address}</span>{f.orgName ? <span className="block text-xs text-muted">{f.orgName}</span> : null}</td>
                        <td className="py-2 text-xs text-red-700 break-words max-w-xs">{f.error ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-sm text-muted">Nenhuma falha registrada. Os envios aparecem aqui assim que forem registrados no log.</p>}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={`Notificações sem e-mail · ${stuck.count}`} subtitle="Criadas há mais de 10 minutos (últimos 7 dias) e ainda sem envio: o webhook de e-mail não rodou." />
          <CardBody>
            {stuck.rows.length ? (
              <ul className="divide-y divide-border text-sm">
                {stuck.rows.map((n) => (
                  <li key={n.id} className="py-2 flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate">{n.title}{n.organizations?.name ? <span className="text-muted"> · {n.organizations.name}</span> : null}</span>
                    <span className="text-xs text-muted whitespace-nowrap">{formatDateTime(n.created_at)}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted">Tudo enviado: nenhuma notificação parada.</p>}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Configuração" subtitle="Só mostra se está configurado; os valores nunca aparecem aqui." />
          <CardBody>
            <ul className="divide-y divide-border text-sm">
              <li className="py-2 flex items-center justify-between gap-3"><span><code>EMAIL_PROVIDER</code> <span className="text-muted">· envio de e-mail</span></span><Badge tone={config.emailProvider === "log" ? "amber" : "green"}>{config.emailProvider}</Badge></li>
              <li className="py-2 flex items-center justify-between gap-3"><span><code>SMS_PROVIDER</code> <span className="text-muted">· envio de SMS</span></span><Badge tone={config.smsProvider === "log" ? "amber" : "green"}>{config.smsProvider}</Badge></li>
              {config.keys.map((k) => (
                <li key={k.name} className="py-2 flex items-center justify-between gap-3">
                  <span><code>{k.name}</code> <span className="text-muted">· {k.hint}</span></span>
                  <Badge tone={k.set ? "green" : "red"}>{k.set ? "configurado" : "não configurado"}</Badge>
                </li>
              ))}
            </ul>
            {config.emailProvider === "log" || config.smsProvider === "log" ? <p className="text-xs text-muted mt-2">Provedor &quot;log&quot; só escreve no console do servidor: nada sai de verdade.</p> : null}
          </CardBody>
        </Card>
      </PageBody>
    </>
  );
}
