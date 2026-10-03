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
  // Expo's global fetch rejects React Native file parts ({ uri, name, type }) with
  // "Unsupported FormDataPart implementation"; RN's XMLHttpRequest streams them from disk.
  const json = await new Promise<{ ok?: boolean; error?: string; imageUrl?: string | null }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${WEB_URL}/api/invite/${inviteToken}`);
    xhr.timeout = 60_000;
    xhr.onload = () => {
      let body: { ok?: boolean; error?: string; imageUrl?: string | null } = {};
      try { body = JSON.parse(xhr.responseText); } catch { /* non-JSON error page */ }
      if (xhr.status >= 200 && xhr.status < 300 && body.ok) resolve(body);
      else reject(new Error(body.error ?? `Não foi possível salvar o convite (erro ${xhr.status}).`));
    };
    xhr.onerror = () => reject(new Error("Sem conexão com o Komyx. Tente de novo."));
    xhr.ontimeout = () => reject(new Error("O envio demorou demais. Tente de novo."));
    xhr.send(form);
  });
  return json;
}
