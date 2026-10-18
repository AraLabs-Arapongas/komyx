"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/data/session";

/** Komyx's own to-do list (/admin/pendencias), kept in staging only. Plain form actions: the page re-renders with the change. */

const SECTIONS = ["voce", "app", "produto"] as const;

export async function addTodo(formData: FormData) {
  await requireAdmin();
  if (process.env.VERCEL_ENV === "production") return;
  const parsed = z.object({ section: z.enum(SECTIONS), title: z.string().trim().min(1).max(500) }).safeParse({ section: formData.get("section"), title: formData.get("title") });
  if (!parsed.success) return;
  const admin = createAdminClient();
  const { data: last } = await admin.from("platform_todos").select("sort_order").eq("section", parsed.data.section).is("done_at", null).order("sort_order", { ascending: false }).limit(1).maybeSingle();
  await admin.from("platform_todos").insert({ ...parsed.data, sort_order: (last?.sort_order ?? 0) + 1 });
  revalidatePath("/admin/pendencias");
}

export async function toggleTodo(formData: FormData) {
  await requireAdmin();
  if (process.env.VERCEL_ENV === "production") return;
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return;
  const admin = createAdminClient();
  const { data } = await admin.from("platform_todos").select("done_at").eq("id", id.data).maybeSingle();
  if (!data) return;
  await admin.from("platform_todos").update({ done_at: data.done_at ? null : new Date().toISOString() }).eq("id", id.data);
  revalidatePath("/admin/pendencias");
}

export async function deleteTodo(formData: FormData) {
  await requireAdmin();
  if (process.env.VERCEL_ENV === "production") return;
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return;
  await createAdminClient().from("platform_todos").delete().eq("id", id.data);
  revalidatePath("/admin/pendencias");
}

export async function setTodoPriority(formData: FormData) {
  await requireAdmin();
  if (process.env.VERCEL_ENV === "production") return;
  const parsed = z.object({ id: z.string().uuid(), priority: z.union([z.literal(""), z.coerce.number().int().min(1).max(99)]) }).safeParse({ id: formData.get("id"), priority: formData.get("priority") ?? "" });
  if (!parsed.success) return;
  await createAdminClient().from("platform_todos").update({ priority: parsed.data.priority === "" ? null : parsed.data.priority }).eq("id", parsed.data.id);
  revalidatePath("/admin/pendencias");
}
