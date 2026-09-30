"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function archiveRequest(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("public_requests").update({ status: "ARCHIVED" }).eq("id", id);
  revalidatePath("/solicitacoes");
  revalidatePath("/home");
}

export async function reopenRequest(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("public_requests").update({ status: "NEW" }).eq("id", id);
  revalidatePath("/solicitacoes");
  revalidatePath("/home");
}
