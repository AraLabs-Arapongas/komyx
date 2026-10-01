"use client";

import { useEffect } from "react";

export const RESERVATIONS_KEY = "festeja:reservations";
export type RememberedReservation = { token: string; date: string; org: string; savedAt: string };

/** Keeps this reservation on the visitor's device so the buffet page can bring them back here. */
export function RememberReservation({ token, date, org }: { token: string; date: string; org: string }) {
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RESERVATIONS_KEY);
      const list: RememberedReservation[] = raw ? JSON.parse(raw) : [];
      const next = [{ token, date, org, savedAt: new Date().toISOString() }, ...list.filter((r) => r.token !== token)].slice(0, 5);
      localStorage.setItem(RESERVATIONS_KEY, JSON.stringify(next));
    } catch {}
  }, [token, date, org]);
  return null;
}
