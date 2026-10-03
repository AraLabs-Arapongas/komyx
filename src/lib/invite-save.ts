import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type InvitePatch = { title?: string | null; message?: string | null; file?: File | null };

/**
 * Updates the invite (title, message, art) of the event behind an INVITE_EDIT link. Shared by the
 * web editor's Server Action and the app's upload endpoint. Returns the new image URL when a file
 * was stored. Throws a message meant for the user on validation errors.
 */
export async function saveInviteByToken(token: string, patch: InvitePatch): Promise<{ imageUrl: string | null }> {
  if (token.length < 20) throw new Error("Este link não está mais disponível.");
  const admin = createAdminClient();
  const { data: link } = await admin
    .from("public_links")
    .select("id, organization_id, event_id, expires_at, events(id, status)")
    .eq("token", token)
    .eq("type", "INVITE_EDIT")
    .eq("active", true)
    .maybeSingle();
  if (!link || !link.events) throw new Error("Este link não está mais disponível.");
  if (link.expires_at && new Date(link.expires_at) < new Date()) throw new Error("Este link não está mais disponível.");
  if (link.events.status === "CANCELLED") throw new Error("Esta festa foi cancelada.");

  const update: { invite_updated_at: string; invite_title?: string | null; invite_message?: string | null; invite_image_url?: string } = { invite_updated_at: new Date().toISOString() };
  if (patch.title !== undefined) update.invite_title = patch.title;
  if (patch.message !== undefined) update.invite_message = patch.message;
  let imageUrl: string | null = null;
  const file = patch.file;
  if (file && file.size > 0) {
    if (file.size > 8 * 1024 * 1024) throw new Error("Imagem muito grande (máx. 8MB).");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Use JPG, PNG ou WebP.");
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${link.organization_id}/invites/${link.event_id}-${Date.now()}.${ext}`;
    const { error: upErr } = await admin.storage.from("org-media").upload(path, file, { contentType: file.type, upsert: true });
    if (upErr) throw new Error(upErr.message);
    imageUrl = admin.storage.from("org-media").getPublicUrl(path).data.publicUrl;
    update.invite_image_url = imageUrl;
  }
  const { error } = await admin.from("events").update(update).eq("id", link.event_id);
  if (error) throw new Error("Não foi possível salvar o convite.");
  return { imageUrl };
}
