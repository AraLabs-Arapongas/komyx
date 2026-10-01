import { supabase } from "./supabase";

export type Reservation = {
  event: { id: string; title: string | null; starts_at: string; ends_at: string; status: string; expires_at: string | null; adults: number | null; children: number | null; celebrant_name: string | null; pix_txid: string | null; invite_title: string | null; invite_message: string | null; invite_image_url: string | null; customer: { name: string; whatsapp: string } };
  org: { name: string; legal_name: string | null; city: string | null; slug: string; logo_url: string | null; whatsapp: string | null; pix_key: string | null; address: string | null; show_prices_public: boolean; pre_reservation_validity_hours: number };
  quote: { id: string; status: string; total: number; decided_at: string | null; items: { description: string; quantity: number; unit_price: number; total: number }[]; installments: { label: string; percent: number; amount: number; rule: string; days_before: number | null; due_date: string | null; sequence: number }[] } | null;
  contract: { number: number; status: string; token: string } | null;
  quote_token: string | null;
  guest_token: string | null;
  paid: number;
  guests: { name: string; adults: number; children: number }[];
};

export async function loadReservation(token: string) {
  const { data, error } = await supabase.rpc("reservation_by_token", { p_token: token });
  if (error) throw new Error(error.message);
  return (data as Reservation | null) ?? null;
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
  if (error) throw new Error(error.message.replace(/^.*?: /, ""));
}
