import { supabase } from "./supabase";

export type ReservationGuest = { id: string; name: string; adults: number; children: number; source: "MANUAL" | "PUBLIC" | "CLIENT"; checked_in: boolean; notes: string | null };
export type ChangeRequest = { id: string; kind: "EXTRA" | "PEOPLE" | "PAYMENT_NOTICE" | "OTHER"; message: string | null; payload: Record<string, unknown> | null; status: "PENDING" | "APPROVED" | "REJECTED"; created_at: string };
export type Addon = { id: string; name: string; price: number; description: string | null };

export type Reservation = {
  event: { id: string; title: string | null; starts_at: string; ends_at: string; status: string; expires_at: string | null; adults: number | null; children: number | null; celebrant_name: string | null; celebrant_age: number | null; pix_txid: string | null; invite_title: string | null; invite_message: string | null; invite_image_url: string | null; theme: string | null; customer: { name: string; whatsapp: string } };
  org: { name: string; legal_name: string | null; city: string | null; slug: string; logo_url: string | null; whatsapp: string | null; pix_key: string | null; address: string | null; show_prices_public: boolean; pre_reservation_validity_hours: number };
  package: { name: string; included_adults: number; included_children: number; extra_adult_price: number; extra_child_price: number } | null;
  quote: { id: string; status: string; total: number; decided_at: string | null; adults: number; children: number; items: { description: string; quantity: number; unit_price: number; total: number }[]; installments: { label: string; percent: number; amount: number; rule: string; days_before: number | null; due_date: string | null; sequence: number }[] } | null;
  extras: { id: string; description: string; quantity: number; unit_price: number; total: number }[];
  contract: { number: number; status: string; token: string } | null;
  quote_token: string | null;
  guest_token: string | null;
  invite_token: string | null;
  paid: number;
  guests: ReservationGuest[];
  requests: ChangeRequest[];
  addons: Addon[];
};

export async function loadReservation(token: string) {
  const { data, error } = await supabase.rpc("reservation_by_token", { p_token: token });
  if (error) throw new Error(error.message);
  return (data as Reservation | null) ?? null;
}

const clean = (m: string) => m.replace(/^.*?: /, "");

export async function addReservationGuest(token: string, name: string, adults: number, children: number) {
  const { data, error } = await supabase.rpc("reservation_add_guest", { p_token: token, p_name: name, p_adults: adults, p_children: children });
  if (error) throw new Error(clean(error.message));
  return data as string;
}

export async function removeReservationGuest(token: string, guestId: string) {
  const { data, error } = await supabase.rpc("reservation_remove_guest", { p_token: token, p_guest_id: guestId });
  if (error) throw new Error(clean(error.message));
  return Boolean(data);
}

export async function requestChange(token: string, kind: ChangeRequest["kind"], message: string, payload?: Record<string, unknown>) {
  const { data, error } = await supabase.rpc("reservation_request_change", { p_token: token, p_kind: kind, p_message: message, p_payload: payload ?? null });
  if (error) throw new Error(clean(error.message));
  return data as string;
}

export type GuestLink = {
  event: { title: string | null; starts_at: string; ends_at: string; status: string; celebrant_name: string | null; celebrant_age: number | null; invite_title: string | null; invite_message: string | null; invite_image_url: string | null; customer_name: string };
  org: { name: string; address: string | null; city: string | null; whatsapp: string | null; logo_url: string | null };
  expired: boolean;
};

export async function loadGuestLink(token: string) {
  const { data, error } = await supabase.rpc("guest_link", { p_token: token });
  if (error) throw new Error(error.message);
  return (data as GuestLink | null) ?? null;
}

export async function confirmGuest(token: string, name: string, adults: number, children: number, notes?: string) {
  const { error } = await supabase.rpc("confirm_guest", { p_token: token, p_name: name, p_adults: adults, p_children: children, p_notes: notes ?? null });
  if (error) throw new Error(clean(error.message));
}
