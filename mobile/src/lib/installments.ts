import { formatDate } from "./format";

export type InstallmentLike = { label: string; amount: number | string; rule: string; days_before: number | null; due_date: string | null; sequence?: number };
export type InstallmentStatus = "PAID" | "PARTIAL" | "OVERDUE" | "PENDING";
export type AllocatedInstallment<T extends InstallmentLike> = T & { amountNum: number; paid: number; remaining: number; due: Date | null; status: InstallmentStatus };

export function installmentDueDate(i: Pick<InstallmentLike, "rule" | "days_before" | "due_date">, eventStartsAt: string, acceptedAt?: string | null): Date | null {
  if (i.rule === "ON_ACCEPT") return acceptedAt ? new Date(acceptedAt) : null;
  if (i.rule === "FIXED_DATE" && i.due_date) return new Date(`${i.due_date}T23:59:59-03:00`);
  const days = i.days_before ?? 0;
  return new Date(new Date(eventStartsAt).getTime() - days * 86_400_000);
}

/** Spreads the total paid over the installments in order; mirrors the web app. */
export function allocateInstallments<T extends InstallmentLike>(installments: T[], paidTotal: number, eventStartsAt: string, acceptedAt?: string | null, now = new Date()): AllocatedInstallment<T>[] {
  let left = Math.max(0, paidTotal);
  return [...installments]
    .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
    .map((i) => {
      const amountNum = Number(i.amount);
      const paid = Math.min(amountNum, left);
      left = Math.max(0, left - paid);
      const remaining = Math.max(0, Math.round((amountNum - paid) * 100) / 100);
      const due = installmentDueDate(i, eventStartsAt, acceptedAt);
      const status: InstallmentStatus =
        amountNum > 0 && remaining <= 0.005 ? "PAID" : paid > 0 ? "PARTIAL" : due && due.getTime() < now.getTime() ? "OVERDUE" : "PENDING";
      return { ...i, amountNum, paid, remaining, due, status };
    });
}

export const INSTALLMENT_STATUS_LABEL: Record<InstallmentStatus, string> = { PAID: "Paga", PARTIAL: "Parcial", OVERDUE: "Atrasada", PENDING: "Em aberto" };
export const INSTALLMENT_STATUS_TONE: Record<InstallmentStatus, "green" | "amber" | "red" | "zinc"> = { PAID: "green", PARTIAL: "amber", OVERDUE: "red", PENDING: "zinc" };

export function dueShort(due: Date | null) {
  return due ? formatDate(due) : "na aceitação";
}
