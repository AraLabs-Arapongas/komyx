import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { Alert, Linking } from "react-native";
import { addReservationGuest, loadReservation, removeReservationGuest, requestChange, type ChangeRequest, type Reservation } from "./client";
import { formatCurrency, whatsappUrl } from "./format";
import { allocateInstallments } from "./installments";
import type { EventStatus } from "./labels";
import { buildPixPayload } from "./pix";
import { WEB_URL } from "./supabase";

/**
 * Everything the party owner's tabs (Festa, Pagamento, Convidados, Convite, Local) derive from one
 * reservation: money, Pix, capacity, links. Computed once here so the tabs stay presentational.
 */
export type ReservationView = ReturnType<typeof derive>;

function derive(r: Reservation, token: string) {
  const { event: ev, org, quote } = r;
  const status = ev.status as EventStatus;
  const showPrices = org.show_prices_public;
  const installments = quote ? allocateInstallments(quote.installments, r.paid, ev.starts_at, quote.decided_at) : [];
  const extrasTotal = r.extras.reduce((a, x) => a + Number(x.total ?? x.quantity * x.unit_price), 0);
  const total = (quote?.total ?? 0) + extrasTotal;
  const balance = Math.max(0, Math.round((total - r.paid) * 100) / 100);
  const deposit = installments[0]?.amountNum ?? null;
  const needsDeposit = status === "PRE_RESERVED" && r.paid <= 0;
  const txid = ev.pix_txid ?? `FESTA${ev.id.replace(/-/g, "").slice(0, 10).toUpperCase()}`;
  const pixAmount = needsDeposit ? deposit : balance > 0 && status !== "CANCELLED" && status !== "EXPIRED" ? balance : null;
  const pix = org.pix_key && pixAmount ? buildPixPayload({ key: org.pix_key, merchantName: org.legal_name || org.name, merchantCity: (org.city || "SAO PAULO").split("/")[0], amount: pixAmount, txid, description: `${txid} ${needsDeposit ? "sinal" : "saldo"} festa` }) : null;
  const pageUrl = `${WEB_URL}/r/${token}`;
  const guestUrl = r.guest_token ? `${WEB_URL}/g/${r.guest_token}` : null;
  const inviteEditUrl = r.invite_token ? `${WEB_URL}/i/${r.invite_token}` : null;
  const daysLeft = Math.ceil((new Date(ev.starts_at).getTime() - Date.now()) / 86_400_000);
  const guestsPeople = r.guests.reduce((a, g) => a + g.adults + g.children, 0);
  const address = org.address ? `${org.address}${org.city && !org.address.toLowerCase().includes(org.city.split("/")[0].toLowerCase()) ? `, ${org.city}` : ""}` : org.city ?? null;
  const mapsUrl = address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : null;
  const pending = r.requests.filter((x) => x.status === "PENDING");
  const first = ev.customer.name.split(" ")[0];
  const title = ev.title ?? `Festa de ${ev.customer.name}`;
  /** Expired or cancelled: the party tabs close; only talking to the buffet remains. */
  const locked = status === "EXPIRED" || status === "CANCELLED";
  const wa = (msg: string) => { if (org.whatsapp) Linking.openURL(whatsappUrl(org.whatsapp, msg)); };

  const contractedA = ev.adults ?? 0, contractedC = ev.children ?? 0;
  const confA = r.guests.reduce((a, g) => a + g.adults, 0), confC = r.guests.reduce((a, g) => a + g.children, 0);
  const overA = Math.max(0, confA - contractedA), overC = Math.max(0, confC - contractedC);
  const leftA = Math.max(0, contractedA - confA), leftC = Math.max(0, contractedC - confC);
  const priceA = Number(r.package?.extra_adult_price ?? 0), priceC = Number(r.package?.extra_child_price ?? 0);
  const capacity = { contractedA, contractedC, confA, confC, overA, overC, leftA, leftC, priceA, priceC, overCost: overA * priceA + overC * priceC };

  return { r, ev, org, quote, status, showPrices, installments, extrasTotal, total, balance, deposit, needsDeposit, txid, pixAmount, pix, pageUrl, guestUrl, inviteEditUrl, daysLeft, guestsPeople, address, mapsUrl, pending, first, title, locked, wa, capacity, balanceLabel: balance > 0 ? `Falta ${formatCurrency(balance)}` : "Tudo pago" };
}

export type AskInput = { kind: ChangeRequest["kind"]; message: string; payload?: Record<string, unknown> };

export function useReservationView(token: string) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["reservation", token], queryFn: () => loadReservation(token) });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["reservation", token] });
  const ask = useMutation({
    mutationFn: (v: AskInput) => requestChange(token, v.kind, v.message, v.payload),
    onSuccess: () => { invalidate(); Alert.alert("Pedido enviado", "O buffet recebeu e confirma com você."); },
    onError: (e) => Alert.alert("Pedido", (e as Error).message),
  });
  const addGuest = useMutation({
    mutationFn: (v: { name: string; adults: number; children: number }) => addReservationGuest(token, v.name, v.adults, v.children),
    onSuccess: invalidate,
    onError: (e) => Alert.alert("Convidado", (e as Error).message),
  });
  const removeGuest = useMutation({ mutationFn: (id: string) => removeReservationGuest(token, id), onSuccess: invalidate, onError: (e) => Alert.alert("Convidado", (e as Error).message) });
  const view = useMemo(() => (q.data ? derive(q.data, token) : null), [q.data, token]);
  return { q, view, ask, addGuest, removeGuest, invalidate };
}
