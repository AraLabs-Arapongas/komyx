import "server-only";
import React from "react";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { formatCurrency, formatDate, formatTime } from "@/lib/utils";
import { installmentDueLabel } from "@/lib/contract";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10.5, fontFamily: "Helvetica", color: "#1c1917" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 18, borderBottom: "1 solid #e7e2da", paddingBottom: 12 },
  brand: { fontSize: 16, fontFamily: "Helvetica-Bold", color: "#c2410c" },
  muted: { color: "#78716c" },
  h1: { fontSize: 14, fontFamily: "Helvetica-Bold", marginBottom: 6 },
  h2: { fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 14, marginBottom: 6 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottom: "0.5 solid #eee" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, marginTop: 4, borderTop: "1 solid #1c1917" },
  bold: { fontFamily: "Helvetica-Bold" },
  body: { lineHeight: 1.5 },
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, fontSize: 8, color: "#78716c", textAlign: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 6 },
  cell: { width: "45%" },
});

export type OrgPdf = { name: string; legal_name: string | null; document: string | null; address: string | null; whatsapp: string | null; pix_key: string | null };

export type QuotePdfData = {
  org: OrgPdf;
  customer: { name: string; whatsapp: string };
  event: { title: string; starts_at: string; ends_at: string; adults: number | null; children: number | null };
  quote: {
    id: string; status: string; subtotal: number | string; discount_total: number | string; total: number | string; notes: string | null; created_at: string;
    items: { description: string; quantity: number | string; unit_price: number | string; total: number | string | null }[];
    installments: { label: string; percent: number | string; amount: number | string; rule: string; days_before: number | null; due_date: string | null }[];
  };
};

const STATUS: Record<string, string> = { DRAFT: "Rascunho", SENT: "Enviado", ACCEPTED: "Aceito", REJECTED: "Recusado" };

function Header({ org, title, subtitle }: { org: OrgPdf; title: string; subtitle?: string }) {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.brand}>{org.name}</Text>
        {org.legal_name ? <Text style={styles.muted}>{org.legal_name}{org.document ? ` · ${org.document}` : ""}</Text> : null}
        {org.address ? <Text style={styles.muted}>{org.address}</Text> : null}
        {org.whatsapp ? <Text style={styles.muted}>WhatsApp {org.whatsapp}</Text> : null}
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={styles.h1}>{title}</Text>
        {subtitle ? <Text style={styles.muted}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

export function QuotePdf({ data }: { data: QuotePdfData }) {
  const { org, customer, event, quote } = data;
  const people = [event.adults ? `${event.adults} adultos` : null, event.children ? `${event.children} crianças` : null].filter(Boolean).join(" · ");
  return (
    <Document title={`Orçamento - ${event.title}`} author={org.name}>
      <Page size="A4" style={styles.page}>
        <Header org={org} title="Orçamento" subtitle={`${STATUS[quote.status] ?? quote.status} · ${formatDate(quote.created_at)}`} />
        <View style={styles.grid}>
          <View style={styles.cell}><Text style={styles.muted}>Cliente</Text><Text style={styles.bold}>{customer.name}</Text><Text>{customer.whatsapp}</Text></View>
          <View style={styles.cell}><Text style={styles.muted}>Evento</Text><Text style={styles.bold}>{event.title}</Text><Text>{formatDate(event.starts_at)} · {formatTime(event.starts_at)} às {formatTime(event.ends_at)}</Text>{people ? <Text>{people}</Text> : null}</View>
        </View>
        <Text style={styles.h2}>Itens</Text>
        {quote.items.map((it, i) => (
          <View key={i} style={styles.row}>
            <Text style={{ width: "58%" }}>{it.description}</Text>
            <Text style={{ width: "20%", textAlign: "right" }}>{Number(it.quantity)} × {formatCurrency(it.unit_price)}</Text>
            <Text style={{ width: "22%", textAlign: "right" }}>{formatCurrency(it.total)}</Text>
          </View>
        ))}
        <View style={styles.row}><Text>Subtotal</Text><Text>{formatCurrency(quote.subtotal)}</Text></View>
        {Number(quote.discount_total) > 0 ? <View style={styles.row}><Text>Desconto</Text><Text>- {formatCurrency(quote.discount_total)}</Text></View> : null}
        <View style={styles.totalRow}><Text style={[styles.bold, { fontSize: 12 }]}>Total</Text><Text style={[styles.bold, { fontSize: 12 }]}>{formatCurrency(quote.total)}</Text></View>
        {quote.installments.length ? (
          <>
            <Text style={styles.h2}>Forma de pagamento</Text>
            {quote.installments.map((i, idx) => (
              <View key={idx} style={styles.row}>
                <Text style={{ width: "60%" }}>{idx + 1}. {i.label} ({Number(i.percent)}%) — {installmentDueLabel(i, event.starts_at)}</Text>
                <Text style={{ width: "40%", textAlign: "right" }}>{formatCurrency(i.amount)}</Text>
              </View>
            ))}
            {org.pix_key ? <Text style={[styles.muted, { marginTop: 6 }]}>Chave Pix: {org.pix_key}</Text> : null}
          </>
        ) : null}
        {quote.notes ? (<><Text style={styles.h2}>Observações</Text><Text style={styles.body}>{quote.notes}</Text></>) : null}
        <Text style={styles.footer}>Gerado por Festeja · {org.name}</Text>
      </Page>
    </Document>
  );
}

export type ContractPdfData = { org: OrgPdf; number: number; content: string; status: string; accepted_at: string | null; accepted_name: string | null; created_at: string };

export function ContractPdf({ data }: { data: ContractPdfData }) {
  const paragraphs = data.content.split(/\n/);
  return (
    <Document title={`Contrato nº ${data.number}`} author={data.org.name}>
      <Page size="A4" style={styles.page}>
        <Header org={data.org} title={`Contrato nº ${data.number}`} subtitle={formatDate(data.created_at)} />
        {paragraphs.map((p, i) => {
          const isTitle = /^[A-ZÀ-Ú0-9][A-ZÀ-Ú0-9 .\-]{6,}$/.test(p.trim()) || /^\d+\.\s/.test(p.trim());
          return <Text key={i} style={[styles.body, isTitle ? styles.bold : {}, { marginBottom: p.trim() === "" ? 4 : 0 }]}>{p || " "}</Text>;
        })}
        {data.accepted_at ? (
          <View style={{ marginTop: 16, padding: 8, backgroundColor: "#ecfdf5", borderRadius: 4 }}>
            <Text style={styles.bold}>Aceite eletrônico</Text>
            <Text>Aceito por {data.accepted_name} em {formatDate(data.accepted_at)} às {formatTime(data.accepted_at)} pelo link do contrato.</Text>
          </View>
        ) : null}
        <Text style={styles.footer} fixed>Gerado por Festeja · {data.org.name}</Text>
      </Page>
    </Document>
  );
}

export async function pdfResponse(element: React.ReactElement, filename: string) {
  const buffer = await renderToBuffer(element as never);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
