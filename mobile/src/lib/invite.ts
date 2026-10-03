import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { WEB_URL } from "./supabase";

/**
 * Lets the party owner pick a photo and shrinks it on the device (longest side 1600 px, JPEG 0.82)
 * before it leaves the phone. Returns null when they cancel.
 */
export async function pickInvitePhoto(): Promise<{ uri: string } | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error("Permita o acesso às fotos para escolher a arte do convite.");
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1, allowsEditing: false, exif: false });
  if (res.canceled || !res.assets[0]) return null;
  const a = res.assets[0];
  const scale = Math.min(1, 1600 / Math.max(a.width || 1600, a.height || 1600));
  const ctx = ImageManipulator.ImageManipulator.manipulate(a.uri);
  if (scale < 1) ctx.resize({ width: Math.round((a.width || 1600) * scale) });
  const ref = await ctx.renderAsync();
  const out = await ref.saveAsync({ compress: 0.82, format: ImageManipulator.SaveFormat.JPEG });
  return { uri: out.uri };
}

/** Saves title, message and/or photo of the invite through the site's endpoint (INVITE_EDIT token). */
export async function saveInvite(inviteToken: string, patch: { title?: string; message?: string; photoUri?: string }) {
  const form = new FormData();
  if (patch.title !== undefined) form.append("invite_title", patch.title);
  if (patch.message !== undefined) form.append("invite_message", patch.message);
  if (patch.photoUri) form.append("image", { uri: patch.photoUri, name: "convite.jpg", type: "image/jpeg" } as unknown as Blob);
  const res = await fetch(`${WEB_URL}/api/invite/${inviteToken}`, { method: "POST", body: form });
  const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; imageUrl?: string | null };
  if (!res.ok || !json.ok) throw new Error(json.error ?? "Não foi possível salvar o convite.");
  return json;
}
